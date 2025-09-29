import csv
import random
import os
from langchain_openai import ChatOpenAI
from langchain.chains import OpenAIModerationChain
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import OpenAI
from dotenv import load_dotenv
load_dotenv() # Load environment variables from a .env file

OPEN_AI_API_KEY = os.getenv("API_KEY") or "badkey"
def random_stock():
    with open("ticker_list.csv", mode='r') as file:
        reader = csv.reader(file)
        stock_list = list(reader)
    
    if not stock_list:
        return None
    
    return random.choice(stock_list)[0] 

stock = random_stock()


model = ChatOpenAI(temperature=0, model_name="gpt-3.5-turbo", api_key=OPEN_AI_API_KEY)
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful financial assistant that provides concise and accurate stock information and provide recent events about :{stock} "),])

chain = prompt | model
response = chain.invoke({"stock": stock})
print(response)