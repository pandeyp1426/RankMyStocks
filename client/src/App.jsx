import { useState } from 'react'
import './App.css'

function App() { 

  return (
    <>
      <h1 className='text-grey-500'>RankMyStocks</h1>
      <p class="text">Invest Smarter</p>
      <button>Create Portfolio</button>
      <p>
      <button onClick={() => navigate("client/myPortfolios.jsx")}>Go to My Portfolios</button>
      <button onClick={() => navigate("client/portfolioRankings.jsx")}>Go to Portfolio Rankings</button>
      </p>
    </>
  )
}

export default App