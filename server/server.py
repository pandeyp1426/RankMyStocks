from flask import Flask, jsonify
from flask_cors import CORS
import csv, random
import stocks   # your module for price & name lookups

app = Flask(__name__)
CORS(app)

def random_ticker_and_name():
    """Return a (ticker, company_name) tuple from ticker_list.csv."""
    with open("ticker_list.csv", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)          # <-- use DictReader to skip the header
        rows = list(reader)
    pick = random.choice(rows)
    return pick["Symbol"], pick["Name"]     # exact column names from your file

@app.route("/api/random-stock")
def random_stock():
    try:
        ticker, name = random_ticker_and_name()
        price = stocks.get_stock_price(ticker)   # your helper function
        return jsonify({"ticker": ticker, "name": name, "price": price})
    except Exception as e:
        app.logger.exception("Error fetching random stock")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
