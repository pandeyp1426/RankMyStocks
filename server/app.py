from flask import Flask, jsonify
import csv
import random
import urllib.request
import json
import urllib.parse

app = Flask(__name__)   # <-- This creates the Flask app

def random_stock():
    with open("nasdaq_screener_1758143846061.csv", mode='r') as file:
        reader = csv.reader(file)
        stock_list = list(reader)

    if not stock_list:
        return None

    return random.choice(stock_list)[0]

@app.route("/")   # <-- This creates a web route
def home():
    return "Welcome to RankMyStocks API!"

@app.route("/random-stock")
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

if __name__ == "__main__":
    app.run(debug=True)
