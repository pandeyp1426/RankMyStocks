import csv
import json
import random
import requests
import queue
import secrets
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
        previousDate = previousDate - timedelta(days=1)
    if day_int == 6:
        previousDate = previousDate - timedelta(days=2)
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

# -- New helpers for key statistics --
def get_global_quote(ticker):
    function = "GLOBAL_QUOTE"
    url = f"https://www.alphavantage.co/query?function={function}&symbol={ticker}&apikey={API_KEY}"
    response = requests.get(url)
    data = response.json()
    quote = data.get("Global Quote", {})
    try:
        return {
            "open": float(quote.get("02. open")) if quote.get("02. open") else None,
            "high": float(quote.get("03. high")) if quote.get("03. high") else None,
            "low": float(quote.get("04. low")) if quote.get("04. low") else None,
            "price": float(quote.get("05. price")) if quote.get("05. price") else None,
            "volume": int(float(quote.get("06. volume"))) if quote.get("06. volume") else None,
        }
    except Exception:
        return {"open": None, "high": None, "low": None, "price": None, "volume": None}

def get_avg_volume_60d(ticker):
    function = "TIME_SERIES_DAILY"
    url = f"https://www.alphavantage.co/query?function={function}&symbol={ticker}&apikey={API_KEY}"
    response = requests.get(url)
    data = response.json()
    series = data.get("Time Series (Daily)", {})
    if not isinstance(series, dict):
        return None
    volumes = []
    for date in sorted(series.keys(), reverse=True)[:60]:
        day = series.get(date, {})
        v = day.get("5. volume") or day.get("6. volume") or day.get("Volume")
        try:
            if v is not None:
                volumes.append(int(float(v)))
        except Exception:
            continue
    if not volumes:
        return None
    return sum(volumes) / len(volumes)

# search for stocks by keyword (company name or symbol)
def search_stocks(query):
    function = "SYMBOL_SEARCH"
    url = f"https://www.alphavantage.co/query?function={function}&keywords={query}&apikey={API_KEY}"
    response = requests.get(url)
    data = response.json()
    matches = data.get("bestMatches", [])
    results = []
    for item in matches:
        try:
            symbol = item.get("1. symbol")
            name = item.get("2. name")
            if symbol and name:
                results.append({
                    "ticker": symbol,
                    "name": name
                })
        except Exception:
            continue
    return results

def list_to_queue(list):
    stock_queue = queue.Queue()
    for item in list:
        stock_queue.put(item)
    return stock_queue

def queue_to_list(queue):
    stock_list = []
    while not queue.empty():
        list.append(queue.get())
    return list

def generate_stock_queue(questionQTY):
    stock_queue = queue.Queue()
    tickers = generate_ticker_list(questionQTY * 2)
    for ticker in tickers:
        stock_queue.put(ticker)
    return stock_queue


def test_pick_stocks(stock_queue):
    portoflio = []
    while stock_queue.empty() == False:
        stock1  = stock_queue.get()
        stock2  = stock_queue.get()
        stock_pick = input(f"Pick stock 1 or 2: {stock1} vs {stock2}")
        if stock_pick == "1":
            print(f"You picked {stock1}")
            portoflio.append(stock1)
        else:
            print(f"You picked {stock2}")
            portoflio.append(stock2)
    return portoflio

#print(secrets.token_hex(32))

#test code
#stock_queue = generate_stock_queue(5)
#print(list(stock_queue.queue))

#portfolio = test_pick_stocks(stock_queue)
#print("Your portfolio:", portfolio)


