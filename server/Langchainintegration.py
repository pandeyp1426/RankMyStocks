
# backend/app.py
from flask import Flask, jsonify
import csv, random, os
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv

load_dotenv()
OPEN_AI_API_KEY = os.getenv("API_KEY") or "badkey"

app = Flask(__name__)

def random_stock():
    with open("ticker_list.csv", mode='r') as file:
        reader = csv.reader(file)
        stock_list = list(reader)
    return random.choice(stock_list)[0] if stock_list else None

@app.route("/get-stock-info", methods=["GET"])
def get_stock_info():
    stock = random_stock()
    model = ChatOpenAI(temperature=0, model_name="gpt-3.5-turbo", api_key=OPEN_AI_API_KEY)
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful financial assistant that provides concise and accurate stock information and provide recent events about :{stock} 100 characters"),
    ])
    chain = prompt | model
    response = chain.invoke({"stock": stock})
    return jsonify({"stock": stock, "info": response.content})

if __name__ == "__main__":
    app.run(debug=True)
