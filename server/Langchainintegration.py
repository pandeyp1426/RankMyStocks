import csv
import random
import urllib.request
import json
import urllib.parse
import os
from langchain_openai import ChatOpenAI
from langchain.chains import OpenAIModerationChain
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import OpenAI
os.environ["OPENAI_API_KEY"] = "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"

def random_stock():
    with open("server/nasdaq_screener_1758143846061.csv", mode='r') as file:
        reader = csv.reader(file)
        stock_list = list(reader)
    
    if not stock_list:
        return None
    
    return random.choice(stock_list)[0] 

stock = random_stock()

moderate=OpenAIModerationChain()
model = ChatOpenAI(temperature=0, model_name="gpt-3.5-turbo")
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful financial assistant that provides concise and accurate stock information and provide recent events about :{stock} "),])

chain = prompt | model
response = chain.invoke({"stock": stock})