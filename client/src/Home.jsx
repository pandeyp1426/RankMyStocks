import { useState } from 'react'
import './Home.css'

function Home() { 

  return (
    <>
      <div class = 'header'>
      <h1 className='text-grey-500'>RankMyStocks</h1>
      <p class="text">Invest Smarter</p>
      <button>Create Portfolio</button>
      </div>
      <p>
      <button onClick={() => navigate("client/myPortfolios.jsx")}>Go to My Portfolios</button>
      <button onClick={() => navigate("client/portfolioRankings.jsx")}>Go to Portfolio Rankings</button>
      </p>
    </>
  )
}

export default Home