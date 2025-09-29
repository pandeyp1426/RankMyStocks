from flask import Flask, jsonify
import csv
import mysql.connector
import random
import urllib.request
import json
import os
from flask_cors import CORS

from dotenv import load_dotenv
import urllib.parse
from stocks import random_stock, get_company_name, get_stock_price

load_dotenv() # Load environment variables from a .env file
app = Flask(__name__)   

CORS(app)
@app.route("/api/random-stock")
def random_stock_api():
    ticker = random_stock()
    if not ticker:
        return jsonify({"error": "No ticker found"}), 404

    price = get_stock_price(ticker)
    name = get_company_name(ticker)
    return jsonify({
        "ticker": ticker,
        "name": name,
        "price": float(price) if price else None
    })
@app.route("/")   
def home():
    return "Welcome to RankMyStocks API!"

@app.route("/api/random-stock")
def get_random_stock():
    function = "TIME_SERIES_DAILY"
    stock = random_stock()

    base = 'https://www.alphavantage.co/query'
    params = {'function': function, 'symbol': stock, 'apikey': '1TOOAS77U9X4GJSC'}
    url = base + '?' + urllib.parse.urlencode(params)

    Website_link = urllib.request.urlopen(url)
    wjson = Website_link.read()
    wjdata = json.loads(wjson)
    return jsonify(wjdata)   # Flask automatically returns JSON
@app.route("/db-test")
def db_test():
    try:
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
