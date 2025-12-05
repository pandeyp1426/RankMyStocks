import { Link } from "react-router-dom";
import "./footer.css";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="footer-overlay" aria-hidden />
      <div className="footer-shell">
        <div className="footer-cta">
          <div className="footer-cta-copy">
            <p className="footer-kicker">Stay ahead of the market</p>
            <h3 className="footer-headline">Signals, rankings, and research in one flow.</h3>
          </div>
          <div className="footer-actions">
            <a className="footer-btn" href="mailto:support@rankmystocks.app?subject=Hello">
              Contact us
            </a>
            <Link className="footer-btn footer-btn--ghost" to="/news">
              Market news
            </Link>
          </div>
        </div>

        <div className="footer-inner">
          <div className="footer-col footer-about">
            <h3 className="footer-brand">RankMyStocks</h3>
            <p className="footer-text">
              RankMyStocks helps you build and compare portfolios with a simple, interactive workflow.
              Pick tickers, rank preferences, and visualize the moves that matter.
            </p>
            <p className="footer-disclaimer">
              Disclaimer: Information is for education only, not financial advice. Markets involve risk.
              Do your own research.
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
              <li>Feedback: We&apos;d love to hear your ideas.</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-left">
            <span className="footer-status-dot" aria-hidden />
            <span className="footer-bottom-text">(c) {year} RankMyStocks</span>
            <span className="footer-pill">React + Flask</span>
          </div>
          <div className="footer-bottom-right">
            <span className="footer-trace">Shipping improvements weekly</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
