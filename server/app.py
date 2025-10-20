from flask import Flask, session, jsonify, request
import mysql.connector
import urllib.request
import os
from flask_cors import CORS
from dotenv import load_dotenv
import urllib.parse
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
OPEN_AI_API_KEY = os.getenv("API_KEY") or "badkey"
import stocks

load_dotenv()  # Load environment variables from a .env file

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'default_secret_key')
CORS(app, supports_credentials=True)
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

@app.route("/api/pair-data")
def get_pair_data():
    try:
        ticker1 = session.get('stock_pair', [None, None])[0]
        if not ticker1:
            return jsonify({"error": "No stock1 found"}), 500
        price1 = get_stock_price(ticker1)
        name1 = get_company_name(ticker1)
        description1 = get_description(ticker1)
        
        ticker2 = session.get('stock_pair', [None, None])[1]
        if not ticker2:
            return jsonify({"error": "No stock2 stock found"}), 500
        price2 = get_stock_price(ticker2)
        name2 = get_company_name(ticker2)
        description2 = get_description(ticker2)

        return jsonify({
            "ticker1": ticker1,
            "name1": name1,
            "price1": float(price1) if price1 else None,
            "description1": description1,

            "ticker2": ticker2,
            "name2": name2,
            "price2": float(price2) if price2 else None,
            "description2": description2
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route("/")   
def home():
    return "Welcome to RankMyStocks API!"
@app.route("/get-stock-info", methods=["GET"])
def random_stock():
    with open("ticker_list.csv", mode='r') as file:
        reader = csv.reader(file)
        stock_list = list(reader)
    return random.choice(stock_list)[0] if stock_list else None
def get_stock_info():
    stock = random_stock()
    model = ChatOpenAI(temperature=0, model_name="gpt-3.5-turbo", api_key=OPEN_AI_API_KEY)
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful financial assistant that provides concise and accurate stock information and provide recent events about :{stock} 100 characters"),
        ])
    chain = prompt | model
    response = chain.invoke({"stock": stock})
    return jsonify({"stock": stock, "info": response.content})


@app.route("/init", methods=["POST"])
def initialize():
    #receives the question quantity and portfolio name from user 
    data = request.get_json()
    questionQTY = data.get("questionQTY")
    portolfioName = data.get("portfolioName")

    #initializes the stocks queue for the session
    stock_list = stocks.generate_ticker_list(questionQTY * 2)
    portfolio = []
    session['stock_list'] = stock_list
    session['portfolio'] = portfolio
    session['questionQTY'] = questionQTY

    return jsonify({
        "status": "initialized", 
        "questionQTY": questionQTY, 
        "portfolioName": portolfioName,
        "stock_list": stock_list
    })


@app.route("/next", methods=["GET"])
def get_next_pair():
    stock_list = session['stock_list']
    stock_queue = stocks.list_to_queue(stock_list)
    stock_pair = []

    if stock_queue.qsize() >= 2:
        stock1 = stock_queue.get()
        stock2 = stock_queue.get()
        stock_list = stocks.queue_to_list(stock_queue)
        session['stock_list'] = stock_list
        session['stock1'] = stock1
        session['stock2'] = stock2
    else:
        return jsonify({
            "status": "error",
            "message": "Not enough stocks in the queue"
        }), 400

    return jsonify({
        "status": "success",
        "stock1": stock1,
        "stock2": stock2
    })



@app.route("/pick", methods=["POST"])
def pick_stock():
    #this function will pick the stock from the pair and add it to the portfolio

    return 0

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

