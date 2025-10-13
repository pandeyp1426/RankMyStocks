import { Link } from 'react-router-dom'
import './navbar.css'

export function Navbar() {
  return (
    <nav className="top-nav">
      <Link to="/"><button>Home</button></Link>
      <Link to="/myPortfolios"><button>My Portfolios</button></Link>
      <Link to="/portfolioRankings"><button>Portfolio Rankings</button></Link>
    </nav>
  );
}