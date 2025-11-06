import { Link } from "react-router-dom";
import "./footer.css";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-col footer-about">
          <h3 className="footer-brand">RankMyStocks</h3>
          <p className="footer-text">
            RankMyStocks helps you build and compare portfolios using a
            simple, interactive workflow. Pick stocks, rank preferences, and
            visualize performance to invest smarter.
          </p>
          <p className="footer-disclaimer">
            Disclaimer: Information is for educational purposes only and is not
            financial advice. Markets involve risk. Do your own research.
          </p>
        </div>

        <div className="footer-col footer-links">
          <h4>Quick Links</h4>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/myPortfolios">My Portfolios</Link></li>
            <li><Link to="/portfolioRankings">Portfolio Rankings</Link></li>
          </ul>
        </div>

        <div className="footer-col footer-contact">
          <h4>Contact</h4>
          <ul>
            <li>Email: support@rankmystocks.app</li>
            <li>Feedback: We’d love to hear your ideas!</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {year} RankMyStocks</span>
        <span className="dot" aria-hidden>•</span>
        <span>Built with React + Flask</span>
      </div>
    </footer>
  );
}

