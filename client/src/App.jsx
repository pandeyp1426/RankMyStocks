import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './layout.jsx'
import { Home } from './Pages/home.jsx'
import { MyPortfolios } from './Pages/myPortfolios.jsx'
import { PortfolioRankings } from './Pages/portfolioRankings.jsx'
import { Questionair } from './Pages/questionair.jsx'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout/>}>
          <Route path="/" element={<Home/>}/>
          <Route path="/myPortfolios" element={<MyPortfolios/>}/>
          <Route path="/portfolioRankings" element={<PortfolioRankings/>}/>
          <Route path="/questionair" element={<Questionair/>}/>
        </Route>
      </Routes>
    </Router>
  )
  
}

export default App
