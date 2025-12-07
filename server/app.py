from flask import Flask, session, jsonify, request
import mysql.connector
import urllib.request
import os
import random
import time
import csv
from flask_cors import CORS
from dotenv import load_dotenv
import urllib.parse
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
import stocks
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
app.config['SESSION_COOKIE_DOMAIN'] = 'localhost'


CORS(app, supports_credentials=True, origins=['http://localhost:5001'])

from stocks import random_stock, get_stock_price, get_company_name
from stocks import get_description
from stocks import search_stocks, get_description


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

#returns filtered list of tickers based on user preferences
def filter_list(answers, questionQTY):
    #user preferences from questionnaire
    industry = answers.get("industrySector", "any")
    marketCap = answers.get("marketCap", "any")
    peRatio = answers.get("peRatio", "any")
    dividend = answers.get("dividend", "any")
    
    #data frame = all stocks from csv
    df = pd.read_csv("ticker_list.csv", names=['ticker', 'name', 'country', 'sectors', 'industry'])
    
    #if industry is any return full df otherwise return filtered df
    #filter by industry
    if(industry != "any"):
        #filter by industry sector
        print("Filtered DF by industry:", industry)
        df = df[df.iloc[:, 3].str.lower() == industry.lower()]
        print("Filtered DF:", df)
        filtered_stocks = df['ticker'].tolist()
        print("Filtered Stocks List:", filtered_stocks)
        
    #list of tickers filtered by sector
    filtered_tickers = df['ticker'].tolist()
    
    # If no additional filters, return random sample
    if (marketCap == "any" and peRatio == "any" and dividend == "any"):
        print("No additional filters, returning random sample")
        return random.sample(filtered_tickers, min(questionQTY * 2, len(filtered_tickers)))
    
    # Further filter based on marketCap, peRatio, dividend
    # query databse for stock metrics
    conn = None
    cursor = None
    final_stocks = []
    
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
        return jsonify({"error"}), 500
    
    
    return stock_list


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
