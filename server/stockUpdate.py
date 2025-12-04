import datetime
import yfinance as yf
import app
import time
from random import shuffle

def update_stock_prices():
    """Fast update - just prices. Run every hour."""
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
                threads=True,
                progress=False
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
                    percent_change = round(
                        (change / previous_close) * 100, 4
                    ) if previous_close != 0 else 0.0
                    date_updated = datetime.datetime.now()
                    
                    cursor.execute("""
                        UPDATE stock_List
                        SET 
                            stock_Price = %s,
                            date_updated = %s,
                            `change` = %s,
                            percent_change = %s
                        WHERE ticker_symbol = %s
                    """, (current_price, date_updated, change, percent_change, ticker))
                    
                except Exception as e:
                    print(f"Error processing {ticker}: {e}")
            
            conn.commit()
            time.sleep(2)
            
        except Exception as e:
            print(f"Chunk failed: {e}")
            time.sleep(30)
    
    conn.close()
    print(f"Prices updated for {len(all_tickers)} tickers")


def update_fundamentals_batch(limit=50):
    """
    Slow update - fundamentals only. 
    Updates oldest/missing data first.
    Run this periodically throughout the day.
    """
    conn = app.get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT ticker_symbol 
        FROM stock_List
        WHERE market_cap IS NULL 
           OR pe_ratio IS NULL 
           OR analyst_rating_score IS NULL
           OR TIMESTAMPDIFF(HOUR, date_updated, NOW()) > 24
        ORDER BY date_updated ASC
        LIMIT %s
    """, (limit,))
    
    tickers = [row[0].strip() for row in cursor.fetchall()]
    
    if not tickers:
        print("No tickers need fundamental updates")
        conn.close()
        return
    
    print(f"Updating fundamentals for {len(tickers)} tickers...")
    updated_count = 0
    
    for ticker in tickers:
        try:
            ticker_obj = yf.Ticker(ticker)

            market_cap = None
            pe_ratio = None
            dividend_yield = None
            analyst_rating_score = None
            analyst_rating_text = None
            
            try:
                # Use info (more reliable than fast_info for fundamentals)
                info = ticker_obj.info
                market_cap = info.get("marketCap")
                pe_ratio = info.get("trailingPE")
                dividend_yield = info.get("dividendYield")
                analyst_rating_score = info.get("recommendationMean")
                analyst_rating_text = info.get("recommendationKey")
                
            except Exception as e:
                print(f"Could not fetch fundamentals for {ticker}: {e}")
            
            # Update even if some fields are None
            cursor.execute("""
                UPDATE stock_List
                SET 
                    market_cap = %s,
                    pe_ratio = %s,
                    dividend_yield = %s,
                    analyst_rating_score = %s,
                    analyst_rating_text = %s,
                    date_updated = %s
                WHERE ticker_symbol = %s
            """, (
                market_cap, pe_ratio, dividend_yield,
                analyst_rating_score, analyst_rating_text,
                datetime.datetime.now(), ticker
            ))
            
            conn.commit()
            updated_count += 1
            print(f"✓ {ticker} - MC: {market_cap}, PE: {pe_ratio}, Rating: {analyst_rating_score}")
            
            time.sleep(1.5)
            
        except Exception as e:
            print(f"✗ Failed to update {ticker}: {e}")
            time.sleep(3)
    
    conn.close()
    print(f"Fundamentals updated: {updated_count}/{len(tickers)}")


def full_update():
    """Complete update - use sparingly (maybe once per day)"""
    print("Starting price updates...")
    update_stock_prices()
    
    print("\nStarting fundamental updates...")
    conn = app.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM stock_List")
    total = cursor.fetchone()[0]
    conn.close()
    
    batch_size = 50
    batches_needed = (total + batch_size - 1) // batch_size
    
    for i in range(batches_needed):
        print(f"\nBatch {i+1}/{batches_needed}")
        update_fundamentals_batch(limit=batch_size)
        if i < batches_needed - 1:
            print("Waiting 60 seconds before next batch...")
            time.sleep(60)
    
    print("\n✓ Full update complete!")