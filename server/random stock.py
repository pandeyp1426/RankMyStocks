import csv
import random
import urllib.request
import json
import urllib.parse

def random_stock():
    with open("server/nasdaq_screener_1758143846061.csv", mode='r') as file:
        reader = csv.reader(file)
        stock_list = list(reader)
    
    if not stock_list:
        return None
    
    return random.choice(stock_list)[0] 

function = "TIME_SERIES_DAILY"
stock = random_stock()

base = 'https://www.alphavantage.co/query'
params = {'function': function, 'symbol': stock, 'apikey': '1TOOAS77U9X4GJSC'}
url = base + '?' + urllib.parse.urlencode(params)

Website_link = urllib.request.urlopen(url)
wjson = Website_link.read()
wjdata = json.loads(wjson)
print(wjdata)
