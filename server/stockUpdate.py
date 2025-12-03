import datetime
import yfinance as yf
import app
import time

def update_stock_data():
    conn = app.get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT ticker_symbol FROM stock_List")
    all_tickers = [row[0].strip() for row in cursor.fetchall()]
    chunk_size = 100

    for i in range(0, len(all_tickers), chunk_size):
        chunk = all_tickers[i:i + chunk_size]  

        try:
            data = yf.download(
                tickers=chunk,
                period="2d",
                interval="1d",
                group_by="ticker",
                auto_adjust=True,
                threads=True
            )

            for ticker in chunk:
                try:
                    if ticker not in data or data[ticker].empty:
                        continue

                    # --- PRICE DATA ---
                    latest = data[ticker].iloc[-1]
                    previous = data[ticker].iloc[-2] if len(data[ticker]) > 1 else latest

                    current_price = float(latest['Close'])
                    previous_close = float(previous['Close'])

                    change = round(current_price - previous_close, 2)
                    percent_change = round(
                        (change / previous_close) * 100, 4
                    ) if previous_close != 0 else 0.0

                    date_updated = datetime.datetime.now()

                    # --- FUNDAMENTALS ---
                    try:
                        ticker_obj = yf.Ticker(ticker)

                        # Fast info
                        fast = ticker_obj.fast_info
                        market_cap = fast.get("market_cap")
                        pe_ratio = fast.get("trailing_pe")
                        dividend_yield = fast.get("dividend_yield")

                        # full info for analyst ratings
                        try:
                            stats = ticker_obj.info
                            analyst_rating_score = stats.get("recommendationMean")
                            analyst_rating_text = stats.get("recommendationKey")
                        except:
                            analyst_rating_score = None
                            analyst_rating_text = None

                    except Exception as e:
                        print(f"Fundamental fetch error for {ticker}: {e}")
                        market_cap = None
                        pe_ratio = None
                        dividend_yield = None
                        analyst_rating_score = None
                        analyst_rating_text = None

                    # --- UPDATE DB ---
                    cursor.execute("""
                        UPDATE stock_List
                        SET 
                            stock_Price = %s,
                            date_updated = %s,
                            `change` = %s,
                            percent_change = %s,
                            market_cap = %s,
                            pe_ratio = %s,
                            dividend_yield = %s,
                            analyst_rating_score = %s,
                            analyst_rating_text = %s
                        WHERE ticker_symbol = %s
                    """, (
                        current_price, date_updated, change, percent_change,
                        market_cap, pe_ratio, dividend_yield,
                        analyst_rating_score, analyst_rating_text,
                        ticker
                    ))

                except Exception as e:
                    print(f"Error processing {ticker}: {e}")

            conn.commit()
            time.sleep(3)

        except Exception as e:
            print(f"Chunk failed: {e}. Waiting 60 seconds before retry...")
            time.sleep(60)

    conn.close()
    print("All tickers updated successfully!")
