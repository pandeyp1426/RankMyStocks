import json
from stocks import random_stock
from Langchainintegration import describe_ticker


def main():
    ticker = random_stock()
    if not ticker:
        print(json.dumps({"error": "no ticker available"}))
        return

    description = describe_ticker(ticker)
    print(json.dumps({"ticker": ticker, "description": description}))


if __name__ == "__main__":
    main()
