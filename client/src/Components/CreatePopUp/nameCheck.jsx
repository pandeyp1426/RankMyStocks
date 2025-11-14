import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useState } from "react";
import "./nameCheck.css";

export function NameCheck() {
  const navigate = useNavigate();
  const portfolioName = useSelector((state) => state.portfolio.portfolioName);
  const [showError, setShowError] = useState(false);

  const handleCheck = () => {
      if (portfolioName === "") {
        setShowError(true);
    } else {
      setShowError(false);
      navigate("/questionair");
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
    </div>
  );
}
