
import csv, random
from flask import Flask, jsonify
from flask_cors import CORS
import stocks   # your existing helper module

app = Flask(__name__)
CORS(app)

def get_random_ticker():
    with open("ticker_list.csv") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    if not rows:
        return None
    return random.choice(rows)["Symbol"]

@app.route("/api/random-stock")
def random_stock():
    ticker = get_random_ticker()
    info = {
        "ticker": ticker,
        "name": stocks.get_company_name(ticker),
        "price": stocks.get_stock_price(ticker)
    }
    return jsonify(info)

if __name__ == "__main__":
    app.run(debug=True)
