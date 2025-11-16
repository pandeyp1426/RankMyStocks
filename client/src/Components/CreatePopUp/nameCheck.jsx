import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useState } from "react";
import { Popup } from "./Popup";
import { QuestionnaireContent } from "./questionnaireContent.jsx";
import "./nameCheck.css";

export function NameCheck() {
  const navigate = useNavigate();
  const portfolioName = useSelector((state) => state.portfolio.portfolioName);
  const [showError, setShowError] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);

  const handleCheck = () => {
    if (portfolioName === "") {
      setShowError(true);
    } else {
      setShowError(false);
      setShowQuestionnaire(true);
    }
  };

  const handleQuestionnaireComplete = (answers) => {
    console.log("Questionnaire answers:", answers);
    // Handle the answers (save to Redux, API, etc.)
    setShowQuestionnaire(false); // Close popup
    navigate("/questionair"); // Navigate if needed
  };


  return (
    <>
      <div className="save-container">
        <button onClick={handleCheck} className="save-btn">
          Save
        </button>
        {showError && (
          <p className="error-text">Please enter a portfolio name.</p>
        )}
      </div>
      
      <Popup trigger={showQuestionnaire} setTrigger={setShowQuestionnaire}>
        <QuestionnaireContent onComplete={handleQuestionnaireComplete} />
      </Popup>
    </>
  );
}
