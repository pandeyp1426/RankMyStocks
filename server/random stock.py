import csv
import random

def random_stock():
    with open("nasdaq_screener_1758143846061.csv", mode='r') as file:
        reader = csv.reader(file)
        stock_list = list(reader)
    
    if not stock_list:
        return None
    
    return random.choice(stock_list)[0]

stock = random_stock()
print(stock)

#copied to server.py