from flask import Flask, jsonify
import os
from flask_cors import CORS
from dotenv import load_dotenv
from stocks import random_stock, get_company_name, get_stock_price, get_description

load_dotenv()
app = Flask(__name__)
CORS(app)

@app.route("/api/random-stock")
def random_stock_api():
    ticker = random_stock()
    if not ticker:
        return jsonify({"error": "No ticker found"}), 404

    price = get_stock_price(ticker)
    name = get_company_name(ticker)
    description = get_description(ticker)
    return jsonify({
        "ticker": ticker,
        "name": name,
        "price": float(price) if price else None,
        "description": description
    })

@app.route("/")   
def home():
    return "Welcome to RankMyStocks API!"

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

if __name__ == "__main__":
    app.run(debug=True)
