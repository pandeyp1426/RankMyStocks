from flask import Flask, jsonify, request
import csv
import mysql.connector
import random
import urllib.request
import json
import os
from flask_cors import CORS
from dotenv import load_dotenv
import urllib.parse

load_dotenv()  # Load environment variables from a .env file
app = Flask(__name__)
CORS(app)
from stocks import random_stock, get_stock_price, get_company_name, get_description
# ---- random stock ----
@app.route("/api/random-stock")
def random_stock_api():
    try:
        ticker = random_stock()
        if not ticker:
            return jsonify({"error": "No random stock found"}), 500

        price = get_stock_price(ticker)
        name = get_company_name(ticker)
        description = get_description(ticker)
        return jsonify({
            "ticker": ticker,
            "name": name,
            "price": float(price) if price else None,
            "description": description
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/")   
def home():
    return "Welcome to RankMyStocks API!"


@app.route("/init", methods=["POST"])
def initialize():
    #here we will initilaze the queue with N sotck pairs 
    data = request.get_json()
    questionQTY = data.get("questionQTY", 10) #gets questionQTY from frontend and defaults to 10 if not provided



@app.route("/next", methods=["GET"])
def get_next_pair():
    #this function will get the next stock pair from the queue


@app.route("/pick", methods=["POST"])
def pick_stock():
    #this function will pick the stock from the pair and add it to the portfolio


# ---- database test ----
@app.route("/db-test")
# Test database connection
def db_test():
    try:
        import mysql.connector
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "rankmystocks_user"),
            password=os.getenv("DB_PASSWORD", "Stocks0_0!"),
            database=os.getenv("DB_NAME", "Rankmystocks")
        )
        cursor = conn.cursor()
        cursor.execute("SELECT DATABASE();")
        db_name = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        return jsonify({"status": "success", "database": db_name})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route("/api/portfolios", methods=["POST"])
def create_portfolio():
    data = request.get_json()
    name = data.get("name")
    stocks = data.get("stocks", [])   # [{ticker: 'AAPL', price: 123}, ...]

    if not name or not stocks:
        return jsonify({"error": "Missing name or stocks"}), 400

    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "rankmystocks_user"),
            password=os.getenv("DB_PASSWORD", "Stocks0_0!"),
            database=os.getenv("DB_NAME", "Rankmystocks")
        )
        cursor = conn.cursor()

        # 🔹 Reuse portfolio if name already exists
        cursor.execute("SELECT id FROM portfolios WHERE name = %s", (name,))
        existing = cursor.fetchone()

        if existing:
            portfolio_id = existing[0]
        else:
            cursor.execute("INSERT INTO portfolios (name) VALUES (%s)", (name,))
            portfolio_id = cursor.lastrowid

        # 🔹 Insert stocks (default price = 0 if missing)
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

# ---- list portfolios ----
@app.route("/api/portfolios", methods=["GET"])
def list_portfolios():
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "rankmystocks_user"),
            password=os.getenv("DB_PASSWORD", "Stocks0_0!"),
            database=os.getenv("DB_NAME", "Rankmystocks")
        )
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

# ---- entrypoint ----
if __name__ == "__main__":
    app.run(
        debug=True,
        host="localhost",
        port=5001
    )

