import csv
import json
import random
import requests
import queue
import secrets
import logging
import os
from datetime import datetime, timedelta
from time import time as _time
import threading
from concurrent.futures import ThreadPoolExecutor
import yfinance as yf


logger = logging.getLogger(__name__)
_INFO_CACHE = {}
_CACHE_TTL_SECONDS = 60 * 15
_cache_lock = threading.Lock()
_TICKER_CACHE = None
_ticker_cache_lock = threading.Lock()


def generate_ticker_list(size):
    tickers = []
    for _ in range(size):
        tickers.append(random_stock())
    return tickers


def random_stock():
    with open("ticker_list.csv", mode="r") as file:
        reader = csv.reader(file)
        stock_list = list(reader)
    if not stock_list:
        return None
    return random.choice(stock_list)[0]


def _get_ticker_info(ticker):
    ticker = (ticker or "").strip().upper()
    if not ticker:
        return {}

    now_ts = _time()
    with _cache_lock:
        cached = _INFO_CACHE.get(ticker)
    if cached and now_ts - cached["timestamp"] < _CACHE_TTL_SECONDS:
        return cached["info"]

    try:
        info = yf.Ticker(ticker).info or {}
    except Exception as exc:
        logger.warning("Yahoo Finance request failed for %s: %s", ticker, exc)
        info = {}

    with _cache_lock:
        _INFO_CACHE[ticker] = {"info": info, "timestamp": now_ts}
    return info


def get_stock_price(ticker):
    info = _get_ticker_info(ticker)
    return info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose")


def get_company_name(ticker):
    info = _get_ticker_info(ticker)
    return info.get("longName") or info.get("shortName")


def get_price_earnings_ratio(ticker):
    info = _get_ticker_info(ticker)
    return info.get("trailingPE") or info.get("forwardPE")


def get_market_cap(ticker):
    info = _get_ticker_info(ticker)
    return info.get("marketCap")


def get_dividend_yield(ticker):
    info = _get_ticker_info(ticker)
    return info.get("dividendYield")


def get_52_week_high(ticker):
    info = _get_ticker_info(ticker)
    return info.get("fiftyTwoWeekHigh")


def get_52_week_low(ticker):
    info = _get_ticker_info(ticker)
    return info.get("fiftyTwoWeekLow")


def get_overview(ticker):
    info = _get_ticker_info(ticker)
    return json.dumps(info, indent=4)


def get_description(ticker):
    info = _get_ticker_info(ticker)
    return info.get("longBusinessSummary")


def get_global_quote(ticker):
    info = _get_ticker_info(ticker)
    try:
        return {
            "open": float(info.get("open")) if info.get("open") else None,
            "high": float(info.get("dayHigh")) if info.get("dayHigh") else None,
            "low": float(info.get("dayLow")) if info.get("dayLow") else None,
            "price": float(info.get("currentPrice")) if info.get("currentPrice") else None,
            "volume": int(info.get("volume")) if info.get("volume") else None,
            "change": float(info.get("regularMarketChange")) if info.get("regularMarketChange") else None,
            "changePercent": float(info.get("regularMarketChangePercent")) if info.get("regularMarketChangePercent") else None,
        }
    except Exception:
        return {
            "open": None,
            "high": None,
            "low": None,
            "price": None,
            "volume": None,
            "change": None,
            "changePercent": None,
        }


def get_avg_volume_60d(ticker):
    info = _get_ticker_info(ticker)
    return info.get("averageVolume")


def get_bulk_quotes(tickers):
    unique = sorted({(t or "").strip().upper() for t in tickers if t})
    if not unique:
        return {}

    results = {}

    def fetch(symbol):
        info = _get_ticker_info(symbol)
        return symbol, {
            "price": info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose"),
            "change": info.get("regularMarketChange"),
            "changePercent": info.get("regularMarketChangePercent"),
        }

    max_workers = min(8, len(unique))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        for symbol, data in executor.map(fetch, unique):
            results[symbol] = data
    return results


def get_stock_snapshot(ticker):
    info = _get_ticker_info(ticker)
    if not info:
        return {}
    ticker = (ticker or "").strip().upper()
    return {
        "ticker": ticker,
        "name": info.get("longName") or info.get("shortName") or ticker,
        "price": info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose"),
        "change": info.get("regularMarketChange"),
        "changePercent": info.get("regularMarketChangePercent"),
        "description": info.get("longBusinessSummary"),
        "marketCap": info.get("marketCap"),
        "peRatio": info.get("trailingPE") or info.get("forwardPE"),
        "dividendYield": info.get("dividendYield"),
        "avgVolume": info.get("averageVolume"),
        "high": info.get("dayHigh"),
        "low": info.get("dayLow"),
        "open": info.get("open"),
        "week52High": info.get("fiftyTwoWeekHigh"),
        "week52Low": info.get("fiftyTwoWeekLow"),
        "volume": info.get("volume"),
    }

# search for stocks by keyword (company name or symbol)
def search_stocks(query):
    if not query:
        return []
    url = f"https://query2.finance.yahoo.com/v1/finance/search?q={query}&quotesCount=6"
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        logger.warning("Yahoo search failed for %s: %s", query, exc)
        data = {}
    results = []
    for item in data.get("quotes", []):
        symbol = item.get("symbol")
        name = item.get("longname") or item.get("shortname")
        if symbol and name:
            results.append({
                "ticker": symbol,
                "name": name
            })
    if results:
        return results
    return _search_local_tickers(query)


def _load_ticker_cache():
    global _TICKER_CACHE
    with _ticker_cache_lock:
        if _TICKER_CACHE is not None:
            return _TICKER_CACHE
        path = os.path.join(os.path.dirname(__file__), "ticker_list.csv")
        rows = []
        try:
            with open(path, mode="r", newline="", encoding="utf-8") as file:
                reader = csv.DictReader(file)
                for row in reader:
                    symbol = (row.get("Symbol") or "").strip()
                    name = (row.get("Name") or "").strip()
                    if symbol:
                        rows.append({"Symbol": symbol, "Name": name})
        except FileNotFoundError:
            logger.warning("ticker_list.csv not found for local search fallback")
        _TICKER_CACHE = rows
        return _TICKER_CACHE


def _search_local_tickers(query, limit=8):
    q = (query or "").strip().lower()
    if not q:
        return []
    matches = []
    for row in _load_ticker_cache():
        symbol = row["Symbol"]
        name = row["Name"] or symbol
        if symbol.lower().startswith(q) or name.lower().startswith(q):
            matches.append({"ticker": symbol, "name": name})
        if len(matches) >= limit:
            break
    return matches


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
