import { Link } from "react-router-dom";
import { useState } from "react";
import { Popup } from "../../Components/CreatePopUp/popup.jsx";
import { PortfolioName } from "../../Components/CreatePopUp/portfolioName.jsx";
import { NumSlider } from "../../Components/CreatePopUp/numSlider.jsx";
import { nameCheck } from "../../Components/CreatePopUp/nameCheck.jsx";
import { useSelector } from 'react-redux';
import "./home.css";
import appPreview from "../../assets/img/logo.png"; // you can replace this with any preview image

export function Home() {
  const [buttonPopup, setButtonPopup] = useState(false);
  const portfolioName = useSelector((state) => state.portfolio.portfolioName);
  return (
    <div className="home">
      <section className="hero-container">
        {/* LEFT SIDE */}
        <div className="hero-left">
          <h1 className="hero-title">RankMyStocks</h1>
          <h2 className="hero-subtitle">Invest Smarter, Rank Better</h2>
          <p className="hero-description">
            Build your portfolio step by step with our smart comparison system.
            Choose, rank, and analyze stocks interactively - then save your
            results and compare with others.
          </p>

          <button
            onClick={() => setButtonPopup(true)}
            className="hero-button"
          >
            Create Portfolio
          </button>

          <Popup trigger={buttonPopup} setTrigger={setButtonPopup}>
            <h3 className="popup-title">Enter Portfolio Name</h3>
            <PortfolioName />
            <NumSlider />
            <Link to="/questionair">
            <button onClick={() => nameCheck(portfolioName)} className="save-btn">
              Save
            </button>
            </Link>
          </Popup>
        </div>

        {/* RIGHT SIDE */}
        <div className="hero-right">
          <img
            src={appPreview}
            alt="App Preview"
            className="hero-image"
          />
          <div className="floating ball"></div>
          <div className="floating glow"></div>
        </div>
      </section>
    </div>
  );
}
