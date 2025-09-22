import csv
import random
import urllib.request
import json
import urllib.parse
import os
from langchain_openai import OpenAI
os.environ["OPENAI_API_KEY"] = "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"

def random_stock():
    with open("nasdaq_screener_1758143846061.csv", mode='r') as file:
        reader = csv.reader(file)
        stock_list = list(reader)
    
    if not stock_list:
        return None
    
    return random.choice(stock_list)[0] 

stock = random_stock()

