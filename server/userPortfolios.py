from flask import Flask, jsonify, request
from flask_cors import CORS
import stocks

app = Flask(__name__)
CORS(app, origins='*')

class UserPortfolios:
    def __init__(self, portfolioName, questionQTY):
        self.portfolioName = portfolioName
        self.questionQTY = questionQTY

user_portfolios = []

@app.route("/api/portfolios", methods=["POST"])
def add_portfolios():
    data = request.json["portfolios"]
    for p in data:
        new_portfolio = UserPortfolios(p["portfolioName"], p["questionQTY"])
        x = new_portfolio.questionQTY
        stockList = stocks.generate_ticker_list(x*2)
        user_portfolios.append(new_portfolio)
    return jsonify({"message": "Portfolios added successfully", "count": len(user_portfolios)})

@app.route("/api/portfolios", methods=["GET"])
def get_portfolios():
    return jsonify([
        {"portfolioName": p.portfolioName, "questionQTY": p.questionQTY}
        for p in user_portfolios
    ])

user_portfolios.append(UserPortfolios("Greg", 20))

if __name__ == "__main__":
    app.run(debug=True)
