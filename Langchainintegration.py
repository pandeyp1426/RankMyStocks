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
    with open("ticker_list.csv", mode='r') as file:
        reader = csv.reader(file)
        stock_list = list(reader)
    
    if not stock_list:
        return None
    
    return random.choice(stock_list)[0] 

stock = random_stock()


model = ChatOpenAI(temperature=0, model_name="gpt-3.5-turbo")
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful financial assistant that provides concise and accurate stock information and provide recent events about :{stock} "),])

chain = prompt | model
response = chain.invoke({"stock": stock})
print(response)