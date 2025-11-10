from flask import Flask, session, jsonify, request
import requests
import mysql.connector
import urllib.request
import os
import random
import time
import csv
from datetime import datetime, timedelta, timezone
from flask_cors import CORS
from dotenv import load_dotenv
import urllib.parse
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
import stocks

# Load    environment variables from .env file
load_dotenv()

OPEN_AI_API_KEY = os.getenv("API_KEY") or "badkey"
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'default_secret_key')

#required for cross origin session cookies
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True if using HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_DOMAIN'] = 'localhost'


CORS(app, supports_credentials=True, origins=['http://localhost:5001'])

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

#  Routes
@app.route("/")
def home():
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
        

        ticker2 = session.get("stock2", "No stock2 in session")
        price2 = get_stock_price(ticker2)
        name2 = get_company_name(ticker2)
        
        
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
            
            "response1": response1.content,
            
            "ticker2": ticker2,
            "name2": name2,
            "price2": float(price2) if price2 else None,
            
            "response2": response2.content,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---- Initialize Session ----

@app.route("/init", methods=["POST"])
def initialize():
    print("=" * 50)
    print("INIT ROUTE CALLED")
    print("=" * 50)


    #receives the question quantity and portfolio name from user 
    data = request.get_json()
    questionQTY = data.get("questionQTY")
    portolfioName = data.get("portfolioName")
    stock_list = stocks.generate_ticker_list(questionQTY * 2)
    portfolio = []
    
    
    #set session variables 
    session["stock_list"] = stock_list
    session["portfolio"] = portfolio
    session["questionQTY"] = questionQTY
    
    
    response = jsonify({
        "status": "initialized", 
        "questionQTY": questionQTY, 
        "portfolioName": portolfioName,
        "stock_list": stock_list
    })

    return response

# ---- Get Next Stock Pair ----
@app.route("/next", methods=["GET"])
def get_next_pair():
    print("=" * 50)
    print("NEXT ROUTE CALLED")
    print("=" * 50)

    try:
        if 'stock_list' not in session:
            return jsonify({
                "status": "error",
                "message": "Stock list not in session"
            }), 400
        else:
            stock_list = session.get("stock_list", "No stock List")
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
            
        return jsonify({
            "status": "success",
            "stock_list": stock_list,
            "stock_pair": stock_pair
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

#route to reroll stock pair
@app.route("/reroll", methods =["POST"])
def reroll():
    print("=" * 50)
    print("REROLL ROUTE CALLED")
    print("=" * 50)
    
    stock_list = session.get("stock_list", "No stock list in sessions")
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
    data = request.get_json()
    name = data.get("name")
    stocks = data.get("stocks", [])   # [{ticker: 'AAPL', price: 123}, ...]

    if not name or not stocks:
        return jsonify({"error": "Missing name or stocks"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Reuse existing portfolio if name already exists
        cursor.execute("SELECT id FROM portfolios WHERE name = %s", (name,))
        existing = cursor.fetchone()

        if existing:
            portfolio_id = existing[0]
        else:
            cursor.execute("INSERT INTO portfolios (name) VALUES (%s)", (name,))
            portfolio_id = cursor.lastrowid

        # Insert stocks (default price = 0 if missing)
        for s in stocks:
            price_value = s.get("price") or 0.0
            cursor.execute(
                "INSERT INTO portfolio_stocks (portfolio_id, ticker, price) VALUES (%s, %s, %s)",
                (portfolio_id, s.get("ticker"), price_value)
            )

        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"status": "success", "portfolio_id": portfolio_id})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

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
@app.route("/api/portfolios", methods=["GET"])
def list_portfolios():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Include created_at and sort newest first (LIFO)
        cursor.execute("""
            SELECT 
                p.id, 
                p.name, 
                p.created_at,
                ps.ticker, 
                ps.price
            FROM portfolios p
            LEFT JOIN portfolio_stocks ps ON p.id = ps.portfolio_id
            ORDER BY p.created_at DESC
        """)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        # Group rows into portfolio objects
        portfolios = {}
        for r in rows:
            pid = r["id"]
            if pid not in portfolios:
                portfolios[pid] = {
                    "id": pid,
                    "name": r["name"],
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

        # Convert to list sorted by created_at DESC (newest first)
        sorted_portfolios = sorted(
            portfolios.values(),
            key=lambda x: x["created_at"] or "",
            reverse=True
        )

        return jsonify(sorted_portfolios)

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
# ---- Portfolio Performance (synthetic timeseries) ----
@app.route("/api/portfolio-performance", methods=["GET"])
def portfolio_performance():
    try:
        # range: 1D, 1W, 1M, 1Y, ALL
        rng = request.args.get("range", "1D").upper()

        # Compute current total value from DB (sum of all stocks' stored price)
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT COALESCE(SUM(CASE WHEN ps.price IS NULL OR ps.price = '' OR ps.price = 'None' THEN 0 ELSE ps.price END), 0) AS total
            FROM portfolio_stocks ps
        """)
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
            "description": desc
        })
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
                    "You are a concise financial editor delivering an actionable 24-hour digest for investors. "
                    "Prioritize confirmed developments such as major sales, earnings guidance, tariffs, interest-rate or political moves, "
                    "and connect them to valuation metrics."
                ),
                (
                    "user",
                    "Ticker: {ticker}\n"
                    "Coverage window: {coverage_window}\n"
                    "Fundamentals snapshot:\n{fundamentals}\n"
                    "Headlines and notes:\n{headlines}\n"
                    "Instructions:\n"
                    "- Reference only the supplied information.\n"
                    "- If no fresh headlines exist, say so explicitly and lean on valuation/macro context.\n"
                    "- Keep the digest under 160 words, ideally 3 short bullets plus a closing watch-item."
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
    user_ID = data.get("user_ID")

    response = jsonify({
        "status": "initialized", 
        "user_ID": user_ID
    })
    
    return response

# ---- Entrypoint ----
if __name__ == "__main__":
    app.run(debug=True, host="localhost", port=5002)
