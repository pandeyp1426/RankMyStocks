import { useSelector } from "react-redux";
import { useState } from "react";
import { Popup } from "./Popup";
import { QuestionnaireContent } from "./questionnaireContent.jsx";
import "./nameCheck.css";

export function NameCheck() {
  const portfolioName = useSelector((state) => state.portfolio.portfolioName);
  const [showError, setShowError] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const handleCheck = () => {
    if (portfolioName === "") {
      setShowError(true);
    } else {
      setShowError(false);
      setShowPopup(true);
    }
  };


  return (
    <div className="save-container">
      <button onClick={handleCheck} className="save-btn">
        Save
      </button>

      {showError && (
        <p className="error-text">Please enter a portfolio name.</p>
      )}

      <Popup trigger={showPopup} setTrigger={setShowPopup}>
        <QuestionnaireContent 
          portfolioName={portfolioName}
          onClose={() => setShowPopup(false)}
        />
      </Popup>
    </div>
  );
}