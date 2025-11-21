import json
import datetime
import yfinance as yf
import app

def update_stock_data():
    myCursor = app.get_db_connection().cursor()
    tickers = myCursor.execute("SELECT ticker_symbol FROM stock_List").fetchall()
    for x in tickers:
        stock = yf.Ticker(ticker=[x])
        now = datetime.datetime.now() 
        myCursor.execute("UPDATE stock_List SET stock_Price, date_Updated, change, percent_change") VALUES()