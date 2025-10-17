import { Link } from "react-router-dom";
import { useState } from "react";
import { useSelector } from 'react-redux';
import { Popup } from "../Components/CreatePopUp/popup.jsx"
import { NumSlider } from "../Components/CreatePopUp/numSlider.jsx";
import { PortfolioName } from "../Components/CreatePopUp/portfolioName.jsx";


export function Home() {
  const [buttonPopup, setButtonPopup] = useState(false);
  function nameCheck(){
  };
    return (
    <>
      <div className="header">
        <h1 className="text-grey-500">RankMyStocks</h1>
        <p className="text">Invest Smarter</p>
        <button onClick={() => setButtonPopup(true)}>Create Portfolio</button>
        <Popup trigger={buttonPopup} setTrigger={setButtonPopup}>
          <h3>Enter Portfolio Name</h3>
          <PortfolioName />
          <NumSlider />
          <Link to="/questionair">
            <button onClick={nameCheck} className="save-btn">Save</button>
          </Link>
        </Popup>
      </div>
    </>
    )
}
