import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home } from "./Pages/Home/home.jsx";
import { MyPortfolios } from "./Pages/MyPortfolio/myPortfolios.jsx";
import { PortfolioRankings } from "./Pages/Rankings/portfolioRankings.jsx";
import { Questionair } from "./Pages/Home/questionair.jsx";
import { Layout } from "./layout.jsx";
import "./App.css";
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
