import { Link } from "react-router-dom";
import logo from "../../assets/img/logo.png";
import "./navbar.css";

export function Navbar() {
  // all navbar items defined here dynamically
  const navLinks = [
    { name: "Home", path: "/", type: "nav" },
    { name: "My Portfolios", path: "/myPortfolios", type: "nav" },
    { name: "Portfolio Rankings", path: "/portfolioRankings", type: "nav" },
    { name: "Log In", path: "/login", type: "auth" },
    { name: "Sign Up", path: "/signup", type: "auth" },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-home-link">
        <img src={logo} alt="RankMyStocks logo" className="navbar-logo" />
        <h1 className="navbar-title">RankMyStocks</h1>
        </Link>
      </div>

      <div className="navbar-right">
        {navLinks.map((link) => {
          if (link.type === "nav") {
            // normal links
            return (
              <Link key={link.name} to={link.path} className="navbar-link">
                {link.name}
              </Link>
            );
          } else if (link.type === "auth") {
            // auth buttons
            return (
              <Link
                key={link.name}
                to={link.path}
                className={
                  link.name === "Log In" ? "login-btn" : "signup-btn"
                }
              >
                {link.name}
              </Link>
            );
          }
          return null;
        })}
      </div>
    </nav>
  );
}
