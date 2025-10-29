import { Link } from "react-router-dom";
import logo from "../../assets/img/logo.png";
import axios from "axios";
import { useSelector } from "react-redux";
import "./navbar.css";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setAuthData, clearAuthData } from "./authSlicer";

export function Navbar() {
  const { loginWithRedirect, logout, isAuthenticated, user, getAccessTokenSilently } = useAuth0();
  const dispatch = useDispatch();
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
    { name: "My Portfolios", path: "/myPortfolios", type: "nav" },
    { name: "Portfolio Rankings", path: "/portfolioRankings", type: "nav" },
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
        {navLinks.map((link) => (
          <Link key={link.name} to={link.path} className="navbar-link">
            {link.name}
          </Link>
        ))}

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
      </div>
    </nav>
  );
}
