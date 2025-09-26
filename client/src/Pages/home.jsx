import { Link } from "react-router-dom"
import { useState } from "react"

export function Home() {
    const [stock, setStock] = useState(null);
    const [loading, setLoading] = useState(false);
  
    const getRandomStock = () => {
      setLoading(true);
      fetch("http://127.0.0.1:5000/api/random-stock")
        .then((res) => {
          if (!res.ok) throw new Error("Network response was not ok");
          return res.json();
        })
        .then((data) => {
          setStock(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Fetch error:", err);
          setLoading(false);
        });
    };
    return (
        <>
        <div class = 'header'>
            <h1 className='text-grey-500'>RankMyStocks</h1>
            <p class="text">Invest Smarter</p>
            {/* Needs a pop up window after and a function for how the questionair works */}
            <Link to="/questionair">
                <button>Create Portfolio</button>
            </Link>
        </div>
      <div className="app">
      <button onClick={getRandomStock}>Get Random Stock</button>

      {loading && <p>Loading…</p>}

      {stock && !loading && (
        <div>
          <h2>{stock.name} ({stock.ticker})</h2>
          <p>Price: ${stock.price}</p>
        </div>
      )}
    </div>
        </>
    )
}