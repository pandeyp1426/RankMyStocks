import { Link } from 'react-router-dom'

export function Navbar() {
    return (
        <>
            <Link to="/">
                <button>Home</button>
            </Link>

            <Link to="/myPortfolios">
                <button>My Portfolios</button>
            </Link>

            <Link to="/portfolioRankings">
                <button>Portfolio Rankings</button>
            </Link>     
        </>
    )
}