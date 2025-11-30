<<<<<<< HEAD
import datetime
import yfinance as yf
import app
import time

def update_stock_data():
    # Connect to your MySQL database
    conn = app.get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT ticker_symbol FROM stock_List")
    all_tickers = [row[0].strip() for row in cursor.fetchall()]
    chunk_size = 100
    #print(f"Updating {len(all_tickers)} tickers in chunks of {chunk_size}...")

    for i in range(0, len(all_tickers), chunk_size):
        chunk = all_tickers[i:i + chunk_size]  # Current batch of 100 (or fewer at the end)
        #print(f"Fetching chunk {i//chunk_size + 1} ({len(chunk)} tickers)...")

        try:
            # ONE request to Yahoo Finance for the entire chunk (super efficient!)
            data = yf.download(
                tickers=chunk,        
                period="2d",      
                interval="1d",  
                group_by="ticker",
                auto_adjust=True,
                threads=True
            )

            # Now loop through each ticker in this chunk
            for ticker in chunk:
                try:
                    # Skip if Yahoo returned no data for this ticker
                    if ticker not in data or data[ticker].empty:
                        continue

                    # Get the most recent closing price
                    latest = data[ticker].iloc[-1]        # Last row = today
                    previous = data[ticker].iloc[-2] if len(data[ticker]) > 1 else latest  # Yesterday

                    current_price = float(latest['Close'])
                    previous_close = float(previous['Close'])

                    # Calculate daily change
                    change = round(current_price - previous_close, 2)
                    percent_change = round((change / previous_close) * 100, 4) if previous_close != 0 else 0.0

                    # Current timestamp
                    date_updated = datetime.datetime.now()

                    # Update the row in your database
                    cursor.execute("""
                        UPDATE stock_List
                        SET stock_Price = %s,
                            date_updated = %s,
                            `change` = %s,
                            percent_change = %s
                        WHERE ticker_symbol = %s
                    """, (current_price, date_updated, change, percent_change, ticker))

                except Exception as e:
                    # Catch any individual ticker errors (e.g. bad data)
                    print(f"Error processing {ticker}: {e}")

            # Save all updates from this chunk to the database
            conn.commit()

            #print(f"Chunk {i//chunk_size + 1} completed. Pausing 3 seconds...\n")
            time.sleep(3) 

        except Exception as e:
            # If the whole chunk fails (e.g. rate limit), wait and retry
            #print(f"Chunk failed: {e}. Waiting 60 seconds before retry...")
            time.sleep(60)

    # Close database connection
    conn.close()
    print("All 1700+ tickers updated successfully!")
=======
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
        chunk = all_tickers[i:i + chunk_size]  # Current batch of 100 (or fewer at the end)
        #print(f"Fetching chunk {i//chunk_size + 1} ({len(chunk)} tickers)...")

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

                    latest = data[ticker].iloc[-1] 
                    previous = data[ticker].iloc[-2] if len(data[ticker]) > 1 else latest 

                    current_price = float(latest['Close'])
                    previous_close = float(previous['Close'])

                    change = round(current_price - previous_close, 2)
                    percent_change = round((change / previous_close) * 100, 4) if previous_close != 0 else 0.0

                    date_updated = datetime.datetime.now()

                    cursor.execute("""
                        UPDATE stock_List
                        SET stock_Price = %s,
                            date_updated = %s,
                            `change` = %s,
                            percent_change = %s
                        WHERE ticker_symbol = %s
                    """, (current_price, date_updated, change, percent_change, ticker))

                except Exception as e:
                    print(f"Error processing {ticker}: {e}")

            conn.commit()

            #print(f"Chunk {i//chunk_size + 1} completed. Pausing 3 seconds...\n")
            time.sleep(3) 

        except Exception as e:
            #print(f"Chunk failed: {e}. Waiting 60 seconds before retry...")
            time.sleep(60)

    # Close database connection
    conn.close()

    print("All 1700+ tickers updated successfully!")
>>>>>>> 8235d6760e7416ac604ec821e3370abbe5450de8
