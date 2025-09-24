import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1 className='text-grey-500'>RankMyStocks</h1>
      <p class="text">Invest Smarter<span class="blinking">.</span></p>
    </>
  )
}

export default App
