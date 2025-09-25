import stocks
from flask import Flask, jsonify

app = Flask(__name__)

#Stocks API Route
@app.route('/api/stocks/<ticker>')
def get_stock_info(ticker):
    stock_info = {
        "name": stocks.get_company_name(ticker),
        "price": stocks.get_stock_price(ticker),
        "pe_ratio": stocks.get_price_earnings_ratio(ticker),
        "market_cap": stocks.get_market_cap(ticker),
        "dividend_yield": stocks.get_dividend_yield(ticker),

    }
    return jsonify(stock_info)

if __name__ == '__main__':
    app.run(debug=True)