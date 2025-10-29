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


CORS(app, supports_credentials=True, origins=['http://localhost:5173'])

from stocks import random_stock, get_stock_price, get_company_name


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


# ---- Random Stock API ----
@app.route("/api/random-stock")
def random_stock_api():
    try:
        ticker = random_stock()
        if not ticker:
            return jsonify({"error": "No random stock found"}), 500

        price = get_stock_price(ticker)
        name = get_company_name(ticker)
        
        return jsonify({
            "ticker": ticker,
            "name": name,
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
                    "status": "error",
                    "message": "list is empty"
                }), 400
            
        return jsonify({
            "status": "success",
            "stock_list": stock_list,
            "stock_pair": stock_pair
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---- Pick Stock ----
@app.route("/pick", methods=["POST"])
def pick_stock():
    print("=" * 50)
    print("PICK ROUTE CALLED")
    print("=" * 50)
    
    #this function recives the users picked stock from the frontend and stores it in the portfolio list
    data = request.get_json()
    stock_pick = data.get("stockPick")
    
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
