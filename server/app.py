from flask import Flask, jsonify, request
import csv
import mysql.connector
import random
import urllib.request
import json
import os
from flask_cors import CORS

import urllib.parse
import userPortfolios

app = Flask(__name__)
CORS(app)
import stocks # ---- random stock ----

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


@app.route("/api/questionaire", methods=['POST']) #this route will be the initial setup for the queue
def questionaire():
    data = request.get_json()
    quantity = data.get('questionQTY')

    
    #gets users input for how many stocks they want to rank
    #create initial list of stocks
    #get target size of list
    #store both queueu and winners list in session
    return f"Questionaire received! You want to rank {quantity} stocks."

@app.route("/pick") #this route will pick the stocks from the queue
def pick():
    #load stocks from the queue
    #check if queue is empty
    #if not empty, pop the first 2 stocks in the queue
    #add winner to winners list
    #repeat until queue is empty
    return "Pick a stock!"

@app.route("/submit") #this route will submit the final ranked list
def submit():
    #load winners list from session
    #store winners list in database
    return "Submit your ranked list!"


@app.route("/db-test")
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

        cursor.execute("""
            SELECT p.id, p.name, ps.ticker, ps.price
            FROM portfolios p
            LEFT JOIN portfolio_stocks ps ON p.id = ps.portfolio_id
        """)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        # Group rows into portfolios
        portfolios = {}
        for r in rows:
            pid = r["id"]
            portfolios.setdefault(pid, {
                "id": pid,
                "name": r["name"],
                "stocks": []
            })
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

        return jsonify(list(portfolios.values()))
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500



# ---- entrypoint ----
if __name__ == "__main__":
    app.run(
        debug=True,
        host="localhost",
        port=5001
    )

