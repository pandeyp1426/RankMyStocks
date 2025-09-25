import csv
import json
import random
import requests

def generate_ticker_list(size):
    tickers = [] 
    for i in range(size):
        tickers.append(random_stock())
    return tickers

def random_stock():
    with open("ticker_list.csv", mode='r') as file:
        reader = csv.reader(file)
        stock_list = list(reader)
    
    if not stock_list:
        return None
    
    return random.choice(stock_list)[0]

def get_stock_price(ticker):
    fucntion = "TIME_SERIES_DAILY"
    url = f"https://www.alphavantage.co/query?function={fucntion}&symbol={ticker}&apikey=JM50934LGM543DE7"
    response = requests.get(url)
    data = response.json()
    try:
        price = data["Time Series (Daily)"]
        latest_date = sorted(price.keys())[0]
        return price[latest_date]["4. close"]
    except (KeyError, IndexError):
        print("Error retrieving stock price for ticker:", ticker)
        return None

    fucntion = "TIME_SERIES_DAILY"
    url = f"https://www.alphavantage.co/query?function={fucntion}&symbol={ticker}&apikey=JM50934LGM543DE7"
    response = requests.get(url)
    data = response.json()
    try:
        volume = data["Time Series (Daily)"]
        return volume
    except KeyError:
        return None

def get_company_name(ticker):
    fucntion = "OVERVIEW"
    url = f"https://www.alphavantage.co/query?function={fucntion}&symbol={ticker}&apikey=JM50934LGM543DE7"
    response = requests.get(url)
    data = response.json()
    try:
        name = data["Name"]
        return name
    except KeyError:
        return None

def get_price_earnings_ratio(ticker):
    fucntion = "OVERVIEW"
    url = f"https://www.alphavantage.co/query?function={fucntion}&symbol={ticker}&apikey=JM50934LGM543DE7"
    response = requests.get(url)
    data = response.json()
    try:
        pe_ratio = data["PERatio"]
        return pe_ratio
    except KeyError:
        return None

def get_market_cap(ticker):
    fucntion = "OVERVIEW"
    url = f"https://www.alphavantage.co/query?function={fucntion}&symbol={ticker}&apikey=JM50934LGM543DE7"
    response = requests.get(url)
    data = response.json()
    try:
        market_cap = data["MarketCapitalization"]
        return market_cap
    except KeyError:
        return None

def get_dividend_yield(ticker):
    fucntion = "OVERVIEW"
    url = f"https://www.alphavantage.co/query?function={fucntion}&symbol={ticker}&apikey=JM50934LGM543DE7"
    response = requests.get(url)
    data = response.json()
    try:
        dividend_yield = data["DividendYield"]
        return dividend_yield
    except KeyError:
        return None

def get_52_week_high(ticker):
    fucntion = "OVERVIEW"
    url = f"https://www.alphavantage.co/query?function={fucntion}&symbol={ticker}&apikey=JM50934LGM543DE7"
    response = requests.get(url)
    data = response.json()
    try:
        high_52_week = data["52WeekHigh"]
        return high_52_week
    except KeyError:
        return None

def get_52_week_low(ticker):
    fucntion = "OVERVIEW"
    url = f"https://www.alphavantage.co/query?function={fucntion}&symbol={ticker}&apikey=JM50934LGM543DE7"
    response = requests.get(url)
    data = response.json()
    try:
        low_52_week = data["52WeekLow"]
        return low_52_week
    except KeyError:
        return None

def get_overview(ticker):
    fucntion = "OVERVIEW"
    url = f"https://www.alphavantage.co/query?function={fucntion}&symbol={ticker}&apikey=JM50934LGM543DE7"
    response = requests.get(url)
    data = response.json()
    try:
        return data
    except KeyError:
        return None


print(get_stock_price("AAPL"))

