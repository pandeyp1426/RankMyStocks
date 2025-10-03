import { Link } from 'react-router-dom'
import './navBar.css'
export function Navbar() {
    return (
        <div className="navBar">
            <Link to="/">
                <button className='navBarbutton'>Home</button>
            </Link>

            <Link to="/myPortfolios">
                <button  className='navBarbutton'>My Portfolios</button>
            </Link>

            <Link to="/portfolioRankings">
                <button  className='navBarbutton'>Portfolio Rankings</button>
            </Link>
        </div>
    )
}