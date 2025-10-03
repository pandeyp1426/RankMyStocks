import csv
import json
import random
import requests
import queue
from datetime import datetime, timedelta

#premium API Key 75 calls perminute
API_KEY = "YN7QP69QPEBTJVKO"


#generates random list of tickers based on given size
def generate_ticker_list(size):
    tickers = [] 
    for i in range(size):
        tickers.append(random_stock())
    return tickers

#gets random ticker form a list of tickers
def random_stock():
    with open("ticker_list.csv", mode='r') as file:
        reader = csv.reader(file)
        stock_list = list(reader)
    
    if not stock_list:
        return None
    
    return random.choice(stock_list)[0]

#gets the stocks last close price
def get_stock_price(ticker):
    currentDate = datetime.now()
    previousDate = currentDate - timedelta(days=1)
    day_int = previousDate.weekday()
    if day_int == 5:
        currentDate = currentDate - timedelta(days=1)
    if day_int == 6:
        currentDate = currentDate - timedelta(days=2)
    print(day_int)
    dateString = previousDate.strftime("%Y-%m-%d")

    
    function = "TIME_SERIES_DAILY"
    url = f"https://www.alphavantage.co/query?function={function}&symbol={ticker}&apikey={API_KEY}"
    response = requests.get(url)
    data = response.json()
    data = json.dumps(data, indent=4)
    try:
        data = json.loads(data)
        close = data['Time Series (Daily)'][dateString]['4. close']
        return close
    except (KeyError, IndexError):
        print("Error retrieving stock price for ticker:", ticker)
        return None


def get_company_name(ticker):
    function = "OVERVIEW"
    url = f"https://www.alphavantage.co/query?function={function}&symbol={ticker}&apikey={API_KEY}"
    response = requests.get(url)
    data = response.json()
    try:
        name = data["Name"]
        return name
    except KeyError:
        return None

def get_price_earnings_ratio(ticker):
    function = "OVERVIEW"
    url = f"https://www.alphavantage.co/query?function={function}&symbol={ticker}&apikey={API_KEY}"
    response = requests.get(url)
    data = response.json()
    try:
        pe_ratio = data["PERatio"]
        return pe_ratio
    except KeyError:
        return None

def get_market_cap(ticker):
    function = "OVERVIEW"
    url = f"https://www.alphavantage.co/query?function={function}&symbol={ticker}&apikey={API_KEY}"
    response = requests.get(url)
    data = response.json()
    try:
        market_cap = data["MarketCapitalization"]
        return market_cap
    except KeyError:
        return None

def get_dividend_yield(ticker):
    function = "OVERVIEW"
    url = f"https://www.alphavantage.co/query?function={function}&symbol={ticker}&apikey={API_KEY}"
    response = requests.get(url)
    data = response.json()
    try:
        dividend_yield = data["DividendYield"]
        return dividend_yield
    except KeyError:
        return None

def get_52_week_high(ticker):
    function = "OVERVIEW"
    url = f"https://www.alphavantage.co/query?function={function}&symbol={ticker}&apikey={API_KEY}"
    response = requests.get(url)
    data = response.json()
    try:
        high_52_week = data["52WeekHigh"]
        return high_52_week
    except KeyError:
        return None

def get_52_week_low(ticker):
    function = "OVERVIEW"
    url = f"https://www.alphavantage.co/query?function={function}&symbol={ticker}&apikey={API_KEY}"
    response = requests.get(url)
    data = response.json()
    try:
        low_52_week = data["52WeekLow"]
        return low_52_week
    except KeyError:
        return None

def get_overview(ticker):
    function = "OVERVIEW"
    url = f"https://www.alphavantage.co/query?function={function}&symbol={ticker}&apikey={API_KEY}"
    response = requests.get(url)
    data = response.json()
    data = json.dumps(data, indent=4)
    try:
        return data
    except KeyError:
        return None

def get_description(ticker):
    description = get_overview(ticker)
    
    try:
        description = json.loads(description)
        description = description["Description"]
        return description
    except KeyError:
        print("Error getting descrioption")
        return None



stock = get_stock_price("INTC")
print(stock)