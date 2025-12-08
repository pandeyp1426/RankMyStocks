from flask import Flask, session, jsonify, request
import requests
import mysql.connector
import os
import random
import time
from datetime import datetime, timedelta, timezone
from flask_cors import CORS
from dotenv import load_dotenv
import hashlib
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
import stocks
import yfinance as yf
import stockUpdate
import pandas as pd

# Load    environment variables from .env file
load_dotenv()

OPEN_AI_API_KEY = os.getenv("API_KEY") or "badkey"
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'default_secret_key')

#required for cross origin session cookies
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True if using HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
# Let the cookie ride on whatever host we're running unless explicitly provided.
session_cookie_domain = os.getenv("SESSION_COOKIE_DOMAIN")
if session_cookie_domain:
    app.config['SESSION_COOKIE_DOMAIN'] = session_cookie_domain


CORS(app, supports_credentials=True, origins=['http://localhost:5001'])

NEWS_CACHE_TTL = 55  # seconds
market_news_cache = {"ts": 0.0, "articles": [], "as_of": None, "error": None}
CHART_CACHE_TTL = 15 * 60  # seconds (15 minutes)
chart_cache = {}


def get_latest_prices_from_db(tickers):
    """
    Bulk fetch latest prices from stock_List for the given tickers.
    Returns dict ticker -> price.
    """
    if not tickers:
        return {}
    conn = None
    cursor = None
    prices = {}
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        placeholders = ",".join(["%s"] * len(tickers))
        cursor.execute(
            f"SELECT ticker_symbol, stock_price FROM stock_List WHERE ticker_symbol IN ({placeholders})",
            tuple(tickers),
        )
        for ticker, price in cursor.fetchall():
            if ticker and price is not None:
                prices[ticker.strip().upper()] = float(price)
    except Exception as exc:
        print("Error reading latest prices from DB:", exc)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
    return prices

from stocks import random_stock, get_stock_price, get_company_name
from stocks import get_description
from stocks import search_stocks
from stocks import (
    get_global_quote,
    get_avg_volume_60d,
    get_market_cap,
    get_price_earnings_ratio,
    get_dividend_yield,
    get_52_week_high,
    get_52_week_low,
    get_bulk_quotes,
    get_stock_snapshot,
)


#  Reusable DB Connection
def get_db_connection():
    """Create and return a new MySQL database connection."""
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        port=int(os.getenv("DB_PORT", 3306))
    )
    
def safe_float(val, default=None):
    try:
        if val in (None, "", "None"):
            return default
        return float(val)
    except (TypeError, ValueError):
        return default

def safe_float(val, default=None):
    try:
        if val in (None, "", "None"):
            return default
        return float(val)
    except (TypeError, ValueError):
        return default

def safe_quantity(val):
    qty = safe_float(val, None)
    if qty is None or qty <= 0:
        return 1.0
    return qty
def normalize_user_identifier(identifier):
    if identifier is None:
        return None
    if isinstance(identifier, (int, float)):
        identifier = str(int(identifier))
        return identifier

    identifier = str(identifier).strip()
    if not identifier:
        return None

    if identifier.isdigit():
        return identifier

    # Map non-numeric identifiers (e.g., Auth0 subs) to a stable numeric string
    digest = hashlib.sha256(identifier.encode("utf-8")).hexdigest()
    # Keep within signed 32-bit int range to avoid DB overflow on INT columns
    numeric_id = int(digest, 16) % 2_000_000_000
    return str(numeric_id)

def ensure_user_exists(user_id, role="user"):
    if user_id is None:
        return
    user_id = str(user_id)
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT user_ID FROM user WHERE user_ID = %s", (user_id,))
        if cursor.fetchone() is None:
            cursor.execute(
                "INSERT INTO user (user_ID, user_role) VALUES (%s, %s)",
                (user_id, role)
            )
            conn.commit()
    except Exception as exc:
        print(f"Warning: unable to ensure user {user_id} exists:", exc)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def compute_portfolio_snapshot_values(cursor, portfolio_id):
    cursor.execute(
        "SELECT ticker, price FROM portfolio_stocks WHERE portfolio_id = %s",
        (portfolio_id,)
    )
    rows = cursor.fetchall()
    invested = 0.0
    tickers = []
    normalized = []
    for ticker, price in rows:
        normalized_ticker = (ticker or "").strip().upper()
        price_value = safe_float(price, 0.0) or 0.0
        invested += price_value
        if normalized_ticker:
            tickers.append(normalized_ticker)
        normalized.append((normalized_ticker, price_value))

    quote_cache = get_bulk_quotes(list(set(tickers))) if tickers else {}
    current = 0.0
    for ticker, stored in normalized:
        quote = quote_cache.get(ticker) or {}
        latest = safe_float(quote.get("price"))
        current += latest if latest is not None else stored

    change_pct = ((current - invested) / invested * 100) if invested > 0 else None
    return invested, current, change_pct


def get_user_portfolio_tickers(user_id):
    """
    Return a dict of ticker -> count for all holdings belonging to the user.
    Uses a single join query for efficiency.
    """
    user_id = normalize_user_identifier(user_id)
    if user_id is None:
        return {}
    conn = None
    cursor = None
    tickers = {}
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT ps.ticker
            FROM portfolios p
            JOIN portfolio_stocks ps ON ps.portfolio_id = p.id
            WHERE p.user_id = %s
            """,
            (user_id,),
        )
        for (ticker,) in cursor.fetchall():
            t = (ticker or "").strip().upper()
            if not t:
                continue
            tickers[t] = tickers.get(t, 0) + 1
        return tickers
    except Exception as exc:
        print("Error reading user portfolios:", exc)
        return {}
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def aggregate_yahoo_bars(df, ticker_counts):
    """
    Aggregate multi-ticker bars into a single series weighted by occurrence count.
    """
    if df is None or df.empty:
        return []

    # Drop tickers that are entirely missing to avoid noisy "failed download" cases
    present = set()
    if isinstance(df.columns, pd.MultiIndex):
        present = set(df.columns.get_level_values(0))
    else:
        # single ticker case
        present = set(ticker_counts.keys())

    filtered_counts = {t: w for t, w in ticker_counts.items() if t in present and w > 0}
    if not filtered_counts:
        return []

    agg = None
    for ticker, weight in ticker_counts.items():
        if ticker not in filtered_counts or weight <= 0:
            continue
        try:
            if isinstance(df.columns, pd.MultiIndex):
                if ticker not in df.columns.get_level_values(0):
                    continue
                sub = df[ticker][["Open", "High", "Low", "Close"]] * weight
            else:
                # Single ticker download
                sub = df[["Open", "High", "Low", "Close"]] * weight
            agg = sub if agg is None else agg.add(sub, fill_value=0)
        except Exception as exc:
            print(f"Error aggregating {ticker}:", exc)
            continue

    if agg is None or agg.empty:
        return []

    agg = agg.dropna(how="all")
    series = []
    for ts, row in agg.iterrows():
        try:
            epoch_ms = int(pd.Timestamp(ts).to_pydatetime().timestamp() * 1000)
            series.append({
                "x": epoch_ms,
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
            })
        except Exception:
            continue
    return series
#  Routes
@app.route("/")
def home():
    stockUpdate.update_stock_data()
    return "Welcome to RankMyStocks API!"


# ---- Random Stock or Specific Ticker API ----
@app.route("/api/random-stock")
def random_stock_api():
    try:
        # If a ticker is provided, return that stock; else return a random one
        q_ticker = request.args.get("ticker", "").strip().upper()
        ticker = q_ticker or random_stock()
        if not ticker:
            return jsonify({"error": "No stock found"}), 500

        price = get_stock_price(ticker)
        name = get_company_name(ticker)
        description = get_description(ticker)

        return jsonify({
            "ticker": ticker,
            "name": name,
            "description": description,
            "price": float(price) if price else None,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# ---- Get Stock Data API ----
@app.route("/api/get-stock-data", methods=["GET"])
def get_stock_data():
    print("=" * 50)
    print("GET-STOCK-DATA CALLED")
    print("=" * 50)

    try:
        ticker1 = session.get("stock1", "No stock1 in session")
        if not ticker1:
            return jsonify({"error": "No stock found from the list"}), 500

        price1 = get_stock_price(ticker1)
        name1 = get_company_name(ticker1)
        quote1 = get_global_quote(ticker1) or {}
        

        ticker2 = session.get("stock2", "No stock2 in session")
        price2 = get_stock_price(ticker2)
        name2 = get_company_name(ticker2)
        quote2 = get_global_quote(ticker2) or {}
        
        
        stock1 = ticker1
        stock2 = ticker2

        model = ChatOpenAI(
        temperature=0,
        model_name="gpt-3.5-turbo",
        api_key=OPEN_AI_API_KEY
        )

        prompt = ChatPromptTemplate.from_messages([
         ("system", "You are a helpful financial assistant that provides concise and accurate stock information. Provide recent events about {stock} in about 200 characters.")
        ])

        chain = prompt | model
        response1 = chain.invoke({"stock": stock1})
        response2 = chain.invoke({"stock": stock2})

    

        return jsonify({
            "ticker1": ticker1,
            "name1": name1,
            "price1": float(price1) if price1 else None,
            "change1": quote1.get("change"),
            "changePercent1": quote1.get("changePercent"),
            
            "response1": response1.content,
            
            "ticker2": ticker2,
            "name2": name2,
            "price2": float(price2) if price2 else None,
            "change2": quote2.get("change"),
            "changePercent2": quote2.get("changePercent"),
            
            "response2": response2.content,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

#returns filtered list of tickers based on user preferences
def filter_list(answers, questionQTY):
    """Return a list of tickers based on questionnaire answers without throwing."""
    answers = answers or {}
    try:
        qty = int(questionQTY or 0)
    except (TypeError, ValueError):
        qty = 0
    qty = max(qty, 1)

    try:
        df = pd.read_csv(
            "ticker_list.csv",
            names=["ticker", "name", "country", "sectors", "industry"]
        )
    except Exception as exc:
        print("Error reading ticker_list.csv:", exc)
        return []

    industry = (answers.get("industrySector") or "any").strip().lower()
    filtered_df = df
    if industry != "any":
        print("Filtered DF by industry:", industry)
        filtered_df = df[df.iloc[:, 3].str.lower() == industry]
        print("Filtered DF:", filtered_df)

    filtered_stocks = (
        filtered_df["ticker"]
        .dropna()
        .astype(str)
        .str.upper()
        .tolist()
    )

    # If filter produced too few, fall back to the full list.
    if len(filtered_stocks) < 2:
        fallback = (
            df["ticker"]
            .dropna()
            .astype(str)
            .str.upper()
            .tolist()
        )
        if fallback:
            filtered_stocks = fallback

    if not filtered_stocks:
        return []

    needed = qty * 2
    if len(filtered_stocks) >= needed:
        return random.sample(filtered_stocks, needed)

    # If we do not have enough unique tickers, allow repeats to fill the list.
    picks = filtered_stocks.copy()
    while len(picks) < needed:
        picks.append(random.choice(filtered_stocks))
    random.shuffle(picks)
    return picks
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Build dynamic SQL query based on filters
        placeholders = ",".join(["%s"] * len(filtered_tickers))
        query = f"""
            SELECT 
                ticker_symbol,
                stock_price,
                market_cap,
                pe_ratio,
                dividend_yield
            FROM stock_List 
            WHERE ticker_symbol IN ({placeholders})
        """
        
        # Add filter conditions
        conditions = []
        params = list(filtered_tickers)
        
        # Market Cap Filter - matching frontend options exactly
        if marketCap == "mega":
            conditions.append("market_cap >= 200000000000")  # $200B+
        elif marketCap == "large":
            conditions.append("market_cap >= 10000000000 AND market_cap < 200000000000")  # $10B - $200B
        elif marketCap == "medium":
            conditions.append("market_cap >= 2000000000 AND market_cap < 10000000000")  # $2B - $10B
        elif marketCap == "small":
            conditions.append("market_cap >= 300000000 AND market_cap < 2000000000")  # $300M - $2B
        elif marketCap == "micro":
            conditions.append("market_cap < 300000000")  # Under $300M
            
        # P/E Ratio Filter - matching frontend options
        if peRatio == "low":
            conditions.append("pe_ratio < 15 AND pe_ratio > 0")
        elif peRatio == "medium":
            conditions.append("pe_ratio >= 15 AND pe_ratio < 25")
        elif peRatio == "high":
            conditions.append("pe_ratio >= 25")
    
        # Dividend Filter - matching frontend options
        if dividend == "yes":
            conditions.append("dividend_yield > 0")
        elif dividend == "no":
            conditions.append("(dividend_yield IS NULL OR dividend_yield = 0)")
        # "any" means no filter
        
        # Append conditions to query
        if conditions:
            query += " AND " + " AND ".join(conditions)
        
        print(f"Executing query with {len(conditions)} additional filters")
        cursor.execute(query, params)
        rows = cursor.fetchall()
                
        print(f"Database returned {len(rows)} matching stocks")
        
        # Process results
        for row in rows:
            ticker = row.get('ticker_symbol')
            if ticker:
                final_stocks.append(ticker.strip().upper())

                
    except Exception as e:
        print(f"Database error during filtering: {e}")
        # Fallback to random selection from industry filter
        return random.sample(filtered_tickers, min(questionQTY * 2, len(filtered_tickers)))
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            
    # If no stocks match all filters, fallback to industry filter only
    if not final_stocks:
        print("No stocks match all filters, using industry filter only")
        return random.sample(filtered_tickers, min(questionQTY * 2, len(filtered_tickers)))
        
    # Limit to questionQTY * 2 stocks for pairing
    final_stocks = random.sample(final_stocks, min(questionQTY * 2, len(final_stocks)))
    
    return final_stocks


# ---- Initialize Session ----

@app.route("/api/init", methods=["POST"])
@app.route("/init", methods=["POST"])
def initialize():
    print("=" * 50)
    print("INIT ROUTE CALLED")
    print("=" * 50)


    #receives the question quantity and portfolio name from user 
    data = request.get_json()
    questionQTY = data.get("questionQTY")
    portolfioName = data.get("portfolioName")
    answers = data.get("answers")
    
    filtered_stocks = filter_list(answers, questionQTY)
    if not filtered_stocks:
        return jsonify({
            "status": "error",
            "message": "No stocks available for the selected filters."
        }), 400
    
    stock_list = filtered_stocks
    portfolio = []

    print("Answers received in init:", answers)
    
    
    #set session variables 
    session["stock_list"] = stock_list
    session["portfolio"] = portfolio
    session["questionQTY"] = questionQTY
    
    
    response = jsonify({
        "status": "initialized", 
        "questionQTY": questionQTY, 
        "portfolioName": portolfioName,
        "answers": filtered_stocks,
        "stock_list": stock_list,
    })

    return response

# ---- Get Next Stock Pair ----
@app.route("/api/next", methods=["GET"])
@app.route("/next", methods=["GET"])
def get_next_pair():
    print("=" * 50)
    print("NEXT ROUTE CALLED")
    print("=" * 50)

    try:
        stock_list = session.get("stock_list")
        if not isinstance(stock_list, list):
            return jsonify({
                "status": "error",
                "message": "Stock list not in session"
            }), 400
        stock_pair = []
        if len(stock_list) >= 2:
            stock1 = stock_list.pop(0)
            stock2 = stock_list.pop(0)
            stock_pair = [stock1, stock2]
            session["stock_list"] = stock_list
            session["stock1"] = stock1
            session["stock2"] = stock2
            
        elif len(stock_list) == 0:
            #do somthing to end the stock picking
            return jsonify({
                "status": "Complete",
                "message": "list is empty"
            }), 400
        else:
            return jsonify({
                "status": "error",
                "message": "Not enough stocks left in session"
            }), 400
        
        return jsonify({
            "status": "success",
            "stock_list": stock_list,
            "stock_pair": stock_pair
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

#route to reroll stock pair
@app.route("/api/reroll", methods =["POST"])
@app.route("/reroll", methods =["POST"])
def reroll():
    print("=" * 50)
    print("REROLL ROUTE CALLED")
    print("=" * 50)
    
    stock_list = session.get("stock_list")
    if not isinstance(stock_list, list):
        return jsonify({"error": "No stock list in session"}), 400
    data = request.get_json()
    rerollBool = data.get("reroll", False)
    if(rerollBool):
        stock_list.append(stocks.random_stock())
        stock_list.append(stocks.random_stock())
        session["stock_list"] = stock_list
    else:
        return jsonify({"error": "Invalid reroll request"}), 500

    return jsonify({"status": "ok", "stock_list": stock_list})


# ---- Pick Stock ----
@app.route("/api/pick", methods=["POST"])
@app.route("/pick", methods=["POST"])
def pick_stock():
    print("=" * 50)
    print("PICK ROUTE CALLED")
    print("=" * 50)
    
    #this function recives the users picked stock from the frontend and stores it in the portfolio list
    data = request.get_json()
    stock_pick = data.get("stockPick")
    
    portoflio = session.get("portfolio", "No portfolio avalible")
    portoflio.append(stock_pick)
    questionQTY = session.get("questionQTY")
    
    return jsonify({
        "stockPick": stock_pick
    })

# ---- DB Test Route ----
@app.route("/db-test")
def db_test():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT DATABASE();")
        db_name = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        return jsonify({"status": "success", "database": db_name})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# ---- Create Portfolio ----
@app.route("/api/portfolios", methods=["POST"])
def create_portfolio():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    stocks = data.get("stocks", [])   # [{ticker: 'AAPL', price: 123}, ...]
    description = (data.get("description") or "").strip()
    requested_user_id = data.get("userId") or data.get("user_id")

    if not name or not stocks:
        return jsonify({"error": "Missing name or stocks"}), 400

    user_id = normalize_user_identifier(requested_user_id)
    if user_id is None:
        return jsonify({"error": "Invalid user id"}), 400

    ensure_user_exists(user_id)

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "INSERT INTO portfolios (name, description, user_id) VALUES (%s, %s, %s)",
            (name, description or None, user_id)
        )
        portfolio_id = cursor.lastrowid

        inserted_any = False
        for s in stocks:
            ticker = (s.get("ticker") or "").strip().upper()
            if not ticker:
                continue
            price_value = safe_float(s.get("price"), 0.0) or 0.0
            cursor.execute(
                "INSERT INTO portfolio_stocks (portfolio_id, ticker, price) VALUES (%s, %s, %s)",
                (portfolio_id, ticker, price_value)
            )
            transaction_type = (s.get("transactionType") or s.get("transaction_type") or "BUY").strip().upper()
            if transaction_type not in ("BUY", "SELL"):
                transaction_type = "BUY"
            quantity_value = safe_quantity(s.get("quantity"))
            cursor.execute(
                """
                INSERT INTO portfolio_transactions
                (portfolio_id, ticker, transaction_type, quantity, price_per_share)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (portfolio_id, ticker, transaction_type, quantity_value, price_value)
            )
            inserted_any = True

        if not inserted_any:
            conn.rollback()
            return jsonify({"error": "No valid stocks to insert"}), 400

        invested_value, current_value, change_pct = compute_portfolio_snapshot_values(cursor, portfolio_id)
        cursor.execute(
            """
            INSERT INTO portfolio_snapshots
            (portfolio_id, snapshot_date, invested_value, current_value, change_pct)
            VALUES (%s, NOW(), %s, %s, %s)
            """,
            (portfolio_id, invested_value, current_value, change_pct)
        )

        conn.commit()
        return jsonify({"status": "success", "portfolio_id": portfolio_id, "userId": user_id})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/portfolios/<int:portfolio_id>", methods=["PUT"])
def rename_portfolio(portfolio_id):
    data = request.get_json(silent=True) or {}
    new_name = (data.get("name") or "").strip()
    if not new_name:
        return jsonify({"error": "Missing or invalid name"}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE portfolios SET name = %s WHERE id = %s",
            (new_name, portfolio_id)
        )
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Portfolio not found"}), 404
        return jsonify({"status": "success", "id": portfolio_id, "name": new_name})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route("/api/stock-stats", methods=["GET"])
def api_stock_stats():
    try:
        ticker = request.args.get("ticker", "").strip().upper()
        if not ticker:
            return jsonify({"error": "Missing ticker"}), 400

        name = get_company_name(ticker)
        quote = get_global_quote(ticker) or {}

        def to_float(x):
            try:
                return float(x) if x not in (None, "", "None") else None
            except Exception:
                return None

        def to_int(x):
            try:
                return int(float(x)) if x not in (None, "", "None") else None
            except Exception:
                return None

        payload = {
            "ticker": ticker,
            "name": name,
            "marketCap": to_float(get_market_cap(ticker)),
            "peRatio": to_float(get_price_earnings_ratio(ticker)),
            "dividendYield": to_float(get_dividend_yield(ticker)),
            "week52High": to_float(get_52_week_high(ticker)),
            "week52Low": to_float(get_52_week_low(ticker)),
            "open": quote.get("open"),
            "high": quote.get("high"),
            "low": quote.get("low"),
            "price": quote.get("price"),
            "volume": to_int(quote.get("volume")),
            "avgVolume": to_float(get_avg_volume_60d(ticker)),
        }
        return jsonify(payload)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---- List Portfolios ----
def _load_portfolios_from_db(user_id=None):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Include created_at and sort newest first (LIFO)
        base_query = """
            SELECT 
                p.id, 
                p.name, 
                p.description,
                p.user_id,
                p.created_at,
                ps.ticker, 
                ps.price
            FROM portfolios p
            LEFT JOIN portfolio_stocks ps ON p.id = ps.portfolio_id
        """
        params = []
        if user_id is not None:
            base_query += " WHERE p.user_id = %s"
            params.append(user_id)
        base_query += " ORDER BY p.created_at DESC"

        cursor.execute(base_query, params)
        rows = cursor.fetchall()

        portfolios = {}
        for r in rows:
            pid = r["id"]
            if pid not in portfolios:
                portfolios[pid] = {
                    "id": pid,
                    "name": r["name"],
                    "description": r.get("description"),
                    "user_id": r.get("user_id"),
                    "created_at": (
                        r["created_at"].isoformat() if r["created_at"] else None
                    ),
                    "stocks": []
                }

            if r["ticker"]:
                price_value = 0.0
                try:
                    if r["price"] not in (None, "", "None"):
                        price_value = float(r["price"])
                except (TypeError, ValueError):
                    price_value = 0.0

                portfolios[pid]["stocks"].append({
                    "ticker": r["ticker"],
                    "price": price_value
                })

        for payload in portfolios.values():
            payload["stockCount"] = len(payload.get("stocks", []))

        return portfolios
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/portfolios", methods=["GET"])
def list_portfolios():
    user_filter = request.args.get("userId")
    user_id = None
    if user_filter not in (None, "", "None"):
        user_id = normalize_user_identifier(user_filter)
        if user_id is None:
            return jsonify({"status": "error", "message": "Invalid userId"}), 400

    try:
        portfolios_map = _load_portfolios_from_db(user_id=user_id)
        sorted_portfolios = sorted(
            portfolios_map.values(),
            key=lambda x: x["created_at"] or "",
            reverse=True
        )

        attach_portfolio_performance(sorted_portfolios)

        return jsonify(sorted_portfolios)

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


def attach_portfolio_performance(portfolios):
    tickers = {
        (stock.get("ticker") or "").strip().upper()
        for p in portfolios
        for stock in p.get("stocks", [])
        if (stock.get("ticker") or "").strip()
    }

    quote_cache = get_bulk_quotes(list(tickers)) if tickers else {}

    for portfolio in portfolios:
        invested = 0.0
        current = 0.0
        for stock in portfolio.get("stocks", []):
            stored = safe_float(stock.get("price")) or 0.0
            invested += stored
            ticker = (stock.get("ticker") or "").strip().upper()
            quote = quote_cache.get(ticker) or {}
            latest = safe_float(quote.get("price"))
            current += latest if latest is not None else stored

        portfolio["investedValue"] = round(invested, 2)
        portfolio["currentValue"] = round(current, 2)
        if invested > 0:
            change_pct = ((current - invested) / invested) * 100
            portfolio["changePct"] = round(change_pct, 2)
        else:
            portfolio["changePct"] = None


@app.route("/api/portfolio-leaderboard", methods=["GET"])
def portfolio_leaderboard():
    user_filter = request.args.get("userId")
    user_id = None
    if user_filter not in (None, "", "None"):
        user_id = normalize_user_identifier(user_filter)
        if user_id is None:
            return jsonify({"status": "error", "message": "Invalid userId"}), 400

    try:
        portfolios_map = _load_portfolios_from_db(user_id=user_id)
        items = list(portfolios_map.values())
        attach_portfolio_performance(items)
        ranked = sorted(items, key=lambda p: p.get("currentValue") or 0.0, reverse=True)
        return jsonify(ranked)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
# ---- Portfolio Performance (synthetic timeseries) ----
@app.route("/api/portfolio-performance", methods=["GET"])
def portfolio_performance():
    try:
        # range: 1D, 1W, 1M, 1Y, ALL
        rng = request.args.get("range", "1D").upper()
        user_filter = request.args.get("userId")
        user_id = None
        if user_filter not in (None, "", "None"):
            user_id = normalize_user_identifier(user_filter)
            if user_id is None:
                return jsonify({"status": "error", "message": "Invalid userId"}), 400

        # Compute current total value from DB (sum of all stocks' stored price)
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        base_query = """
            SELECT COALESCE(SUM(CASE WHEN ps.price IS NULL OR ps.price = '' OR ps.price = 'None' THEN 0 ELSE ps.price END), 0) AS total
            FROM portfolio_stocks ps
            INNER JOIN portfolios p ON p.id = ps.portfolio_id
        """
        params = []
        if user_id is not None:
            base_query += " WHERE p.user_id = %s"
            params.append(user_id)
        cursor.execute(base_query, params)
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        try:
            base_value = float(row["total"]) if row and row.get("total") is not None else 0.0
        except (TypeError, ValueError):
            base_value = 0.0

        import datetime as _dt
        import random as _rand

        def gen_points(days, step_days=1, points=None):
            # Generate a list of (timestamp, value) pairs going back `days` days
            # Use small random walk around base_value to simulate performance
            if points is None:
                points = int(days/step_days) + 1
            now = _dt.datetime.now()
            values = []
            current = base_value if base_value > 0 else _rand.uniform(5000, 20000)
            drift = 0.0005  # gentle upward drift per step
            vol = 0.01      # volatility factor
            for i in range(points):
                t = now - _dt.timedelta(days=(points-1-i)*step_days)
                shock = current * vol * _rand.uniform(-1, 1)
                current = max(0, current * (1 + drift) + shock)
                values.append({
                    "ts": t.isoformat(),
                    "value": round(current, 2)
                })
            return values

        if rng == "1D":
            # last 24 hours, hourly
            now = _dt.datetime.now()
            points = []
            current = base_value if base_value > 0 else _rand.uniform(5000, 20000)
            drift = 0.0002
            vol = 0.003
            for i in range(24):
                t = now - _dt.timedelta(hours=(23 - i))
                shock = current * vol * _rand.uniform(-1, 1)
                current = max(0, current * (1 + drift) + shock)
                points.append({"ts": t.isoformat(), "value": round(current, 2)})
            data = points
        elif rng == "1W":
            data = gen_points(7, step_days=1)
        elif rng == "1M":
            data = gen_points(30, step_days=1)
        elif rng == "1Y":
            data = gen_points(365, step_days=7, points=53)
        else:  # ALL
            data = gen_points(365*2, step_days=30, points=25)

        return jsonify({"range": rng, "series": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ---- Search Stocks (by name/symbol) ----
@app.route("/api/search", methods=["GET"])
def search():
    try:
        q = request.args.get("q", "").strip()
        if not q:
            return jsonify([])
        results = search_stocks(q)
        return jsonify(results)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ---- Get Stock Description ----
@app.route("/api/stock-description", methods=["GET"])
def stock_description():
    try:
        ticker = request.args.get("ticker", "").strip().upper()
        if not ticker:
            return jsonify({"error": "Missing ticker"}), 400
        desc = get_description(ticker)
        name = get_company_name(ticker)
        return jsonify({
            "ticker": ticker,
            "name": name,
            "description": desc,
            "price": float(get_stock_price(ticker)) if get_stock_price(ticker) else None,
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/stock-info", methods=["GET"])
def stock_info():
    try:
        ticker = request.args.get("ticker", "").strip().upper()
        if not ticker:
            return jsonify({"error": "Missing ticker"}), 400
        snapshot = get_stock_snapshot(ticker)
        if not snapshot.get("price") and not snapshot.get("name"):
            return jsonify({"error": "Ticker not found"}), 404
        if not snapshot.get("description"):
            snapshot["description"] = get_description(ticker)
        return jsonify(snapshot)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ---- Daily Digest (news + LLM summary) ----
@app.route("/api/daily-digest", methods=["GET"])
def daily_digest():
    try:
        ticker = request.args.get("ticker", "").strip().upper()
        if not ticker:
            return jsonify({"error": "Missing ticker"}), 400

        now_utc = datetime.now(timezone.utc)
        cutoff = now_utc - timedelta(hours=24)

        def safe_float(value):
            try:
                if value in (None, "", "None"):
                    return None
                return float(value)
            except (TypeError, ValueError):
                return None

        def parse_timestamp(ts):
            if not ts:
                return None
            ts = ts.strip()
            try:
                return datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except ValueError:
                pass
            clean_ts = ts.replace("Z", "")
            for fmt, length in (("%Y%m%dT%H%M%S", 15), ("%Y%m%dT%H%M", 13)):
                try:
                    dt = datetime.strptime(clean_ts[:length], fmt)
                    return dt.replace(tzinfo=timezone.utc)
                except ValueError:
                    continue
            return None

        def fmt_currency(value, decimals=2):
            if value is None:
                return "n/a"
            return f"${value:,.{decimals}f}"

        def fmt_signed_currency(value):
            if value is None:
                return "n/a"
            sign = "+" if value >= 0 else "-"
            return f"{sign}${abs(value):,.2f}"

        def fmt_float(value, decimals=2):
            if value is None:
                return "n/a"
            return f"{value:,.{decimals}f}"

        def fmt_market_cap(value):
            if value is None:
                return "n/a"
            trillion = 1_000_000_000_000
            billion = 1_000_000_000
            million = 1_000_000
            magnitude = abs(value)
            if magnitude >= trillion:
                return f"${value / trillion:.2f}T"
            if magnitude >= billion:
                return f"${value / billion:.2f}B"
            if magnitude >= million:
                return f"${value / million:.2f}M"
            return f"${value:,.0f}"

        def fmt_percent(value):
            if value is None:
                return "n/a"
            return f"{value * 100:.2f}%"

        headlines_raw = []
        seen_titles = set()

        def normalize_source(source):
            if isinstance(source, dict):
                return source.get("name") or source.get("title")
            return source

        def add_headline(title, url_, source=None, summary=None, published_at=None, sentiment=None):
            if not title:
                return
            normalized_title = title.strip()
            if not normalized_title:
                return
            key = normalized_title.lower()
            if key in seen_titles:
                return
            published_dt = parse_timestamp(published_at)
            headlines_raw.append({
                "title": normalized_title,
                "url": url_,
                "source": normalize_source(source),
                "summary": summary.strip() if isinstance(summary, str) else summary,
                "sentiment": sentiment,
                "published_at": published_dt,
            })
            seen_titles.add(key)

        marketaux_key = os.getenv("MARKETAUX_KEY")
        if marketaux_key:
            try:
                url = (
                    "https://api.marketaux.com/v1/news/all?"
                    f"symbols={ticker}&filter_entities=true&language=en&limit=15&api_token={marketaux_key}"
                )
                r = requests.get(url, timeout=10)
                j = r.json()
                for item in j.get("data") or []:
                    add_headline(
                        title=item.get("title"),
                        url_=item.get("url"),
                        source=item.get("source"),
                        summary=item.get("description") or item.get("snippet"),
                        published_at=item.get("published_at"),
                        sentiment=item.get("sentiment"),
                    )
            except Exception:
                pass

        alpha_key = (
            os.getenv("ALPHAVANTAGE_KEY")
            or os.getenv("ALPHA_VANTAGE_KEY")
            or os.getenv("ALPHAVANTAGE_API_KEY")
            or os.getenv("ALPHA_VANTAGE_API_KEY")
            or os.getenv("ALPHAVANTAGE_NEWS_KEY")
            or getattr(stocks, "API_KEY", None)
        )
        if alpha_key:
            try:
                time_from = cutoff.strftime("%Y%m%dT%H%M")
                alpha_url = (
                    "https://www.alphavantage.co/query?"
                    f"function=NEWS_SENTIMENT&tickers={ticker}&limit=50&time_from={time_from}&apikey={alpha_key}"
                )
                alpha_resp = requests.get(alpha_url, timeout=10)
                alpha_json = alpha_resp.json()
                for item in alpha_json.get("feed") or []:
                    add_headline(
                        title=item.get("title"),
                        url_=item.get("url"),
                        source=item.get("source"),
                        summary=item.get("summary"),
                        published_at=item.get("time_published"),
                        sentiment=item.get("overall_sentiment_label"),
                    )
            except Exception:
                pass

        headlines_raw.sort(
            key=lambda h: h["published_at"] or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True
        )
        recent_headlines = [
            h for h in headlines_raw
            if h["published_at"] is None or h["published_at"] >= cutoff
        ]
        if recent_headlines:
            selected_headlines = recent_headlines[:8]
            coverage_window = "last 24 hours"
        else:
            selected_headlines = headlines_raw[:5]
            coverage_window = "latest available (older than 24h)" if headlines_raw else "no verified coverage"

        def format_headlines_for_prompt(items):
            lines = []
            for item in items:
                ts = item["published_at"].strftime("%Y-%m-%d %H:%M UTC") if item["published_at"] else "time n/a"
                line = f"{ts} - {item['title']}"
                if item.get("source"):
                    line += f" ({item['source']})"
                details = []
                if item.get("summary"):
                    details.append(item["summary"])
                if item.get("sentiment"):
                    details.append(f"sentiment: {item['sentiment']}")
                if details:
                    line += " | " + " ".join(details)
                lines.append(line)
            return "\n".join(lines)

        headlines_context = format_headlines_for_prompt(selected_headlines) if selected_headlines else ""
        if not headlines_context:
            headlines_context = "No verified coverage surfaced in the last 24 hours."

        quote = get_global_quote(ticker) or {}
        price = quote.get("price")
        day_open = quote.get("open")
        day_change = (price - day_open) if (price is not None and day_open is not None) else None
        day_high = quote.get("high")
        day_low = quote.get("low")
        volume = quote.get("volume")

        pe_ratio = safe_float(get_price_earnings_ratio(ticker))
        market_cap = safe_float(get_market_cap(ticker))
        dividend_yield = safe_float(get_dividend_yield(ticker))
        week52_high = safe_float(get_52_week_high(ticker))
        week52_low = safe_float(get_52_week_low(ticker))

        fundamentals_context = "\n".join([
            f"Price: {fmt_currency(price)} | Change vs open: {fmt_signed_currency(day_change)}",
            f"Intraday range: {fmt_currency(day_low)} - {fmt_currency(day_high)} | Volume: {fmt_float(volume, 0)}",
            f"Market cap: {fmt_market_cap(market_cap)} | P/E: {fmt_float(pe_ratio, 1)}",
            f"Dividend yield: {fmt_percent(dividend_yield)} | 52-week range: {fmt_currency(week52_low)} - {fmt_currency(week52_high)}",
        ])

        summary_text = None
        try:
            model = ChatOpenAI(
                temperature=0,
                model_name="gpt-3.5-turbo",
                api_key=OPEN_AI_API_KEY,
            )
            prompt = ChatPromptTemplate.from_messages([
                (
                    "system",
                    "You craft clear, easy-to-read investor digests that explain why a ticker moved over the last 24 hours. "
                    "Use simple language, cite only the provided facts, and never speculate about the future."
                ),
                (
                    "user",
                    "Ticker: {ticker}\n"
                    "Coverage window: {coverage_window}\n"
                    "Fundamentals snapshot:\n{fundamentals}\n"
                    "Headlines and notes:\n{headlines}\n"
                    "Instructions:\n"
                    "- Start with one line containing a headline that states the main reason the stock moved (e.g., 'EARNINGS BOOST SNDX').\n"
                    "- After the headline, include a blank line.\n"
                    "- Follow with 2-4 short sections. Each section must be on its own line, begin with an ALL-CAPS header followed by a colon (e.g., 'EARNINGS:'), and contain 1-2 simple sentences about confirmed developments such as analyst calls, earnings, company announcements, sector trends, macro forces, or notable volume shifts.\n"
                    "- Leave a blank line between sections for readability.\n"
                    "- If news flow is thin, say that clearly and lean on valuation or macro context without making predictions.\n"
                    "- Mention only what actually happened; do not provide forecasts or investment advice.\n"
                    "- Stay under 160 words and keep the tone factual and easy to read."
                ),
            ])
            chain = prompt | model
            resp = chain.invoke({
                "ticker": ticker,
                "coverage_window": coverage_window,
                "fundamentals": fundamentals_context,
                "headlines": headlines_context,
            })
            summary_text = resp.content
        except Exception:
            summary_text = None

        sources_payload = [{
            "title": item["title"],
            "url": item["url"],
            "source": item.get("source"),
            "publishedAt": item["published_at"].isoformat() if item["published_at"] else None,
        } for item in selected_headlines] if selected_headlines else []

        return jsonify({
            "ticker": ticker,
            "summary": summary_text or "Unable to generate digest at this time.",
            "sources": sources_payload,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def _parse_news_timestamp(ts):
    if not ts:
        return None
    ts = ts.strip()
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        pass
    clean_ts = ts.replace("Z", "")
    for fmt, length in (("%Y%m%dT%H%M%S", 15), ("%Y%m%dT%H%M", 13)):
        try:
            dt = datetime.strptime(clean_ts[:length], fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def fetch_market_news(force=False):
    now = time.time()
    if force:
        # Clear cache metadata so a manual refresh truly pulls fresh articles
        market_news_cache["ts"] = 0.0
        market_news_cache["articles"] = []
        market_news_cache["as_of"] = None
        market_news_cache["error"] = None

    if not force and market_news_cache["articles"] and (now - market_news_cache["ts"]) < NEWS_CACHE_TTL:
        return market_news_cache["articles"], market_news_cache.get("error"), True

    def categorize_article(title, summary, tickers=None, sentiment=None):
        text = " ".join([title or "", summary or ""]).lower()
        tags = set()
        earnings_terms = ("earnings", "eps", "results", "q1", "q2", "q3", "q4", "quarter", "guidance", "revenue", "profit", "loss", "forecast")
        pump_terms = ("rally", "rallies", "surge", "surges", "spike", "spikes", "jump", "jumps", "soar", "soars", "beat", "beats", "beats estimates", "record high", "upgrade")
        dump_terms = ("tank", "tanks", "plunge", "plunges", "drop", "drops", "sink", "sinks", "selloff", "downgrade", "cut forecast", "miss", "delist", "delisting")
        guidance_terms = ("outlook", "guidance", "forecast", "update", "preview")
        legal_terms = ("lawsuit", "investigation", "sec", "fine", "regulator", "probe", "class action", "settlement")
        crypto_terms = ("bitcoin", "crypto", "ethereum", "token", "defi", "etf")

        if any(term in text for term in earnings_terms):
            tags.add("Earnings")
        if any(term in text for term in guidance_terms):
            tags.add("Performance/Guidance")
        if any(term in text for term in pump_terms):
            tags.add("Bullish Move")
        if any(term in text for term in dump_terms):
            tags.add("Bearish Move")
        if any(term in text for term in legal_terms):
            tags.add("Legal/Regulatory")
        if any(term in text for term in crypto_terms):
            tags.add("Crypto")
        if tickers and len(tickers) >= 2:
            tags.add("Multi-Ticker/Peers")

        sentiment_norm = (sentiment or "").lower()
        if sentiment_norm in ("positive", "bullish"):
            tags.add("Bullish Move")
        if sentiment_norm in ("negative", "bearish"):
            tags.add("Bearish Move")

        return sorted(tags)

    articles = []
    seen_titles = set()
    error = None

    def add_article(title, url_, source=None, summary=None, published_at=None, tickers=None, sentiment=None):
        if not title:
            return
        normalized_title = title.strip()
        if not normalized_title:
            return
        key = normalized_title.lower()
        if key in seen_titles:
            return
        published_dt = _parse_news_timestamp(published_at)
        payload = {
            "title": normalized_title,
            "url": url_,
            "source": source or "Unknown",
            "summary": summary.strip() if isinstance(summary, str) else summary,
            "publishedAt": published_dt.isoformat() if published_dt else None,
        }
        if tickers:
            payload["tickers"] = tickers
        payload["categories"] = categorize_article(normalized_title, summary, tickers, sentiment)
        articles.append(payload)
        seen_titles.add(key)

    marketaux_key = os.getenv("MARKETAUX_KEY")
    if marketaux_key:
        try:
            url = (
                "https://api.marketaux.com/v1/news/all?"
                f"countries=us&language=en&filter_entities=true&limit=30&api_token={marketaux_key}"
            )
            resp = requests.get(url, timeout=10)
            data = resp.json()
            for item in data.get("data") or []:
                tickers = []
                for ent in item.get("entities") or []:
                    sym = ent.get("symbol")
                    if sym:
                        tickers.append(str(sym).upper())
                if isinstance(item.get("symbols"), list):
                    tickers.extend([str(sym).upper() for sym in item["symbols"] if sym])
                add_article(
                    title=item.get("title"),
                    url_=item.get("url"),
                    source=item.get("source"),
                    summary=item.get("description") or item.get("snippet"),
                    published_at=item.get("published_at"),
                    tickers=list(dict.fromkeys(tickers)) or None,
                )
        except Exception:
            error = "Unable to reach Marketaux news feed."

    alpha_key = (
        os.getenv("ALPHAVANTAGE_KEY")
        or os.getenv("ALPHA_VANTAGE_KEY")
        or os.getenv("ALPHAVANTAGE_API_KEY")
        or os.getenv("ALPHA_VANTAGE_API_KEY")
        or os.getenv("ALPHAVANTAGE_NEWS_KEY")
        or getattr(stocks, "API_KEY", None)
    )
    if alpha_key:
        try:
            alpha_url = (
                "https://www.alphavantage.co/query?"
                f"function=NEWS_SENTIMENT&topics=financial_markets&sort=LATEST&limit=50&apikey={alpha_key}"
            )
            alpha_resp = requests.get(alpha_url, timeout=10)
            alpha_json = alpha_resp.json()
            for item in alpha_json.get("feed") or []:
                tickers = []
                for t in item.get("ticker_sentiment") or []:
                    sym = t.get("ticker")
                    if sym:
                        tickers.append(str(sym).upper())
                add_article(
                    title=item.get("title"),
                    url_=item.get("url"),
                    source=item.get("source"),
                    summary=item.get("summary"),
                    published_at=item.get("time_published"),
                    tickers=tickers or None,
                    sentiment=item.get("overall_sentiment_label"),
                )
        except Exception:
            error = error or "Unable to reach Alpha Vantage news feed."
    # Finnhub general market news (optional)
    finnhub_key = os.getenv("FINNHUB_KEY")
    if finnhub_key:
        try:
            finn_url = f"https://finnhub.io/api/v1/news?category=general&token={finnhub_key}"
            resp = requests.get(finn_url, timeout=10)
            data = resp.json()
            for item in data or []:
                add_article(
                    title=item.get("headline"),
                    url_=item.get("url"),
                    source=item.get("source"),
                    summary=item.get("summary"),
                    published_at=item.get("datetime"),
                    tickers=None,
                    sentiment=item.get("sentiment"),
                )
        except Exception:
            error = error or "Unable to reach Finnhub news feed."
    # Financial Modeling Prep (optional)
    fmp_key = os.getenv("FMP_API_KEY") or os.getenv("FINANCIAL_MODEL_PREP_KEY")
    if fmp_key:
        try:
            fmp_url = f"https://financialmodelingprep.com/api/v3/stock_news?limit=50&apikey={fmp_key}"
            resp = requests.get(fmp_url, timeout=10)
            data = resp.json()
            for item in data or []:
                tickers = item.get("tickers") or []
                add_article(
                    title=item.get("title"),
                    url_=item.get("url"),
                    source=item.get("site"),
                    summary=item.get("text"),
                    published_at=item.get("publishedDate"),
                    tickers=[str(t).upper() for t in tickers] if tickers else None,
                    sentiment=None,
                )
        except Exception:
            error = error or "Unable to reach Financial Modeling Prep news feed."
    else:
        error = "No news API key configured. Set MARKETAUX_KEY or ALPHAVANTAGE_KEY."

    if not articles and market_news_cache["articles"]:
        return market_news_cache["articles"], market_news_cache.get("error"), True
    if not articles:
        return [], error or "No news articles available.", False

    articles.sort(
        key=lambda h: _parse_news_timestamp(h["publishedAt"]) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    # Windowing: recent 24h (1 day) plus highlights from last quarter
    now_dt = datetime.now(timezone.utc)
    recent_cutoff = now_dt - timedelta(hours=24)
    quarter_cutoff = now_dt - timedelta(days=90)

    recent_items = []
    quarter_highlights = []
    for art in articles:
        dt = _parse_news_timestamp(art.get("publishedAt"))
        if dt is None:
            recent_items.append(art)
            continue
        if dt >= recent_cutoff:
            recent_items.append(art)
        elif dt >= quarter_cutoff:
            tagged = dict(art)
            cats = set(tagged.get("categories") or [])
            cats.add("Last Quarter Highlight")
            tagged["categories"] = sorted(cats)
            quarter_highlights.append(tagged)

    recent_items.sort(key=lambda h: _parse_news_timestamp(h.get("publishedAt")) or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    quarter_highlights.sort(key=lambda h: _parse_news_timestamp(h.get("publishedAt")) or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    final_articles = recent_items + quarter_highlights[:20]

    market_news_cache["articles"] = final_articles
    market_news_cache["ts"] = now
    market_news_cache["as_of"] = now_dt.isoformat()
    market_news_cache["error"] = None if final_articles else error

    return market_news_cache["articles"], market_news_cache.get("error"), False


@app.route("/api/market-news", methods=["GET"])
def market_news():
    try:
        force = request.args.get("force") in ("1", "true", "yes", "y", "on")
        articles, error, from_cache = fetch_market_news(force=force)
        return jsonify({
            "articles": articles,
            "asOf": market_news_cache.get("as_of"),
            "count": len(articles),
            "error": error,
            "fromCache": from_cache,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def fetch_yahoo_portfolio_chart(ticker_counts):
    tickers = list(ticker_counts.keys())
    if not tickers:
        return {"intraday": [], "daily": []}
    tickers_str = " ".join(tickers)
    intraday_df = None
    daily_df = None
    try:
        intraday_df = yf.download(
            tickers_str,
            period="1d",
            interval="60m",
            progress=False,
            threads=False,
            group_by="ticker",
            auto_adjust=False,
        )
    except Exception as exc:
        print("Error fetching intraday from Yahoo:", exc)

    try:
        daily_df = yf.download(
            tickers_str,
            period="1y",
            interval="1d",
            progress=False,
            threads=False,
            group_by="ticker",
            auto_adjust=False,
        )
    except Exception as exc:
        print("Error fetching daily from Yahoo:", exc)

    agg_intraday = aggregate_yahoo_bars(intraday_df, ticker_counts)
    agg_daily = aggregate_yahoo_bars(daily_df, ticker_counts)
    return {
        "intraday": agg_intraday,
        "daily": agg_daily,
    }


@app.route("/api/portfolio-chart", methods=["GET"])
def portfolio_chart():
    try:
        raw_user = request.args.get("userId") or request.args.get("user_id")
        user_id = normalize_user_identifier(raw_user)
        if user_id is None:
            return jsonify({"intraday": [], "daily": [], "error": "invalid user id"}), 400

        ticker_counts = get_user_portfolio_tickers(user_id)
        if not ticker_counts:
            return jsonify({"intraday": [], "daily": [], "count": 0})

        skip_cache = request.args.get("skipCache") == "1"
        cache_key = tuple(sorted(ticker_counts.items()))
        cached = chart_cache.get(cache_key)
        now_ts = time.time()
        if cached and not skip_cache and (now_ts - cached.get("ts", 0)) < CHART_CACHE_TTL:
            payload = cached["data"]
            payload["fromCache"] = True
            payload["asOf"] = cached.get("asOf")
            return jsonify(payload)

        data = fetch_yahoo_portfolio_chart(ticker_counts)
        intraday = data.get("intraday") or []
        daily = data.get("daily") or []

        # Append latest point using DB snapshot prices
        latest_prices = get_latest_prices_from_db(list(ticker_counts.keys()))
        latest_total = None
        if latest_prices:
          latest_total = sum((latest_prices.get(t, 0.0) * qty) for t, qty in ticker_counts.items())
          now_iso = datetime.now(timezone.utc).isoformat()
          latest_point = {"x": now_iso, "open": latest_total, "high": latest_total, "low": latest_total, "close": latest_total}
          if intraday:
            intraday = [p for p in intraday if p.get("x") != latest_point["x"]]
            intraday.append(latest_point)
          if daily:
            daily = [p for p in daily if p.get("x") != latest_point["x"]]
            daily.append(latest_point)

        payload = {
          "intraday": intraday,
          "daily": daily,
          "latestValue": latest_total,
          "fromCache": False,
          "asOf": datetime.now(timezone.utc).isoformat(),
        }
        # Refresh cache even when skipCache is used so future non-forced reads see the latest
        chart_cache[cache_key] = {"ts": now_ts, "data": payload, "asOf": payload["asOf"]}
        return jsonify(payload)
    except Exception as exc:
        print("Error in portfolio-chart endpoint:", exc)
        cached = chart_cache.get(cache_key or ())
        if cached:
            payload = cached["data"]
            payload["fromCache"] = True
            payload["stale"] = True
            return jsonify(payload)
        return jsonify({"intraday": [], "daily": [], "error": "server error"}), 500

# ---- Delete Portfolio ----
@app.route("/api/delete-portfolio/<int:portfolio_id>", methods=["DELETE"])
def delete_portfolio(portfolio_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # First delete associated stocks if they exist
        cursor.execute("DELETE FROM portfolio_stocks WHERE portfolio_id = %s", (portfolio_id,))

        # Then delete the portfolio itself
        cursor.execute("DELETE FROM portfolios WHERE id = %s", (portfolio_id,))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Portfolio not found"}), 404

        return jsonify({"message": "Portfolio deleted successfully"}), 200
    except Exception as e:
        print("Error deleting portfolio:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/user_ID", methods=["POST"])
def get_user_ID():
    data = request.get_json()
    raw_id = data.get("user_ID")
    user_id = normalize_user_identifier(raw_id)
    if user_id is None:
        return jsonify({"status": "error", "message": "Invalid user_ID"}), 400

    ensure_user_exists(user_id)

    response = jsonify({
        "status": "initialized",
        "user_ID": user_id
    })
    
    return response

# ---- Entrypoint ----
if __name__ == "__main__":
    app.run(debug=True, host="localhost", port=5002)
