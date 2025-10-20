import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate


load_dotenv()  # Load environment variables from a .env file

OPEN_AI_API_KEY = os.getenv("API_KEY") or "badkey"


def AI_response(ticker: str):
    """Return a short LangChain description for the provided ticker.

    Note: this function no longer chooses a random stock internally. Callers must pass a ticker.
    """
    if not ticker:
        return "No ticker provided"

    model = ChatOpenAI(temperature=0, model_name="gpt-3.5-turbo", api_key=OPEN_AI_API_KEY)
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are a helpful financial assistant that provides concise and accurate stock information and provide recent events about :{stock} 100 characters",
        ),
    ])

    chain = prompt | model
    response = chain.invoke({"stock": ticker})
    return response


def describe_ticker(ticker: str) -> str:
    """Return a short LangChain-generated description for the provided ticker using the original integration."""
    if not ticker:
        return "No ticker provided"

    model = ChatOpenAI(temperature=0, model_name="gpt-3.5-turbo", api_key=OPEN_AI_API_KEY)
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are a helpful financial assistant that provides concise and accurate stock information and provide recent events about :{stock} 100 characters",
        ),
    ])

    chain = prompt | model
    response = chain.invoke({"stock": ticker})
    # prefer .content if present
    return getattr(response, "content", str(response))
