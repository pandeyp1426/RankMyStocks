import { Link, useLocation } from "react-router-dom";
import logo from "../../assets/img/logo.png";
import axios from "axios";
import { useSelector } from "react-redux";
import "./navbar.css";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setAuthData, clearAuthData } from "./authSlicer";

const SunIcon = () => (
  <svg
    className="theme-toggle__icon"
    viewBox="0 0 24 24"
    role="presentation"
    focusable="false"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
    <line x1="12" y1="2" x2="12" y2="5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="2" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="19" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const MoonIcon = () => (
  <svg
    className="theme-toggle__icon"
    viewBox="0 0 24 24"
    role="presentation"
    focusable="false"
    aria-hidden="true"
  >
    <path
      d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function Navbar({ theme = "dark", onToggleTheme }) {
  const { loginWithRedirect, logout, isAuthenticated, user, getAccessTokenSilently } = useAuth0();
  const dispatch = useDispatch();
  const location = useLocation();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5002";
//needs to be looked at more later, will store assuming we get data 
//but allows user to login regardless of auth0 sending us user id and
//will likely lead to problems later

const userID = useSelector((state) => state.auth.userID);

  useEffect(() => {
    const handleAuth = async () => {
      if (isAuthenticated && user) {
        try {
          const token = await getAccessTokenSilently();
          const id = user.sub;

          dispatch(
            setAuthData({
              isAuthenticated,
              user,
              userID: id,
              token,
            })
          );

          const response = await axios.post(`${API_URL}/api/user_ID`, { user_ID: id });
          console.log(response.data);

        } catch (error) {
          console.error("Error fetching token:", error);
        }
      } else {
        dispatch(clearAuthData());
      }
    };

  handleAuth();
}, [isAuthenticated, user, getAccessTokenSilently, dispatch]);


  const navLinks = [
    { name: "Home", path: "/", type: "nav" },
    { name: "News", path: "/news", type: "nav" },
    { name: "My Portfolios", path: "/myPortfolios", type: "nav" },
    { name: "Portfolio Rankings", path: "/portfolioRankings", type: "nav" },
  ];

  const modeLabel = theme === "light" ? "Activate dark mode" : "Activate light mode";

  const handleThemeToggle = () => {
    if (typeof onToggleTheme === "function") {
      onToggleTheme();
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-shell">
        <div className="navbar-left">
          <Link to="/" className="navbar-home-link">
            <div className="navbar-logo-wrap">
              <img src={logo} alt="RankMyStocks logo" className="navbar-logo" />
              <span className="navbar-logo-glow" aria-hidden />
            </div>
            <div className="navbar-title-wrap">
              <h1 className="navbar-title">RankMyStocks</h1>
              <p className="navbar-subtitle">Portfolio intelligence in motion</p>
            </div>
          </Link>
        </div>

        <div className="navbar-right">
          <div className="navbar-links">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`navbar-link ${isActive ? "is-active" : ""}`}
                >
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="navbar-controls">
            {isAuthenticated ? (
              <div className="auth-buttons">
                <button
                  className="logout-btn"
                  onClick={() => logout({ returnTo: window.location.origin })}
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="auth-buttons">
                <button className="login-btn" onClick={() => loginWithRedirect()}>
                  Log In/Sign Up
                </button>
              </div>
            )}

            <button
              type="button"
              className="theme-toggle"
              onClick={handleThemeToggle}
              aria-label={modeLabel}
              title={modeLabel}
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
