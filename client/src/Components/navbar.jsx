import { Link } from 'react-router-dom'
import './navBar.css'
export function Navbar() {
    return (
        <div className="navBar">
            <Link to="/">
                <button className='navBarbutton'>Home</button>
            </Link>

            <Link to="/myPortfolios">
                <button>My Portfolios</button>
            </Link>

            <Link to="/portfolioRankings">
                <button>Portfolio Rankings</button>
            </Link>
        </div>
    )
}