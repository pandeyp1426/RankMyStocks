// QuestionnaireContent.jsx
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import "./questionnaireContent.css";
import { setQuestionnaireAnswers } from "./questionnaireSlicer";

export function QuestionnaireContent({ onComplete }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [answers, setAnswers] = useState({
    investmentHorizon: "",
    experienceLevel: "",
    primaryGoal: "",
    industrySector: "",
    marketCap: "",
    peRatio: "",
    dividends: "",
    analystRating: ""
  });

  const totalPages = 5; // Number of questions/pages

  const handleChange = (question, value) => {
    setAnswers(prev => ({
      ...prev,
      [question]: value
    }));
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Dispatch answers to Redux store
    dispatch(setQuestionnaireAnswers(answers));

    navigate("/questionair");
  };

  // Check if current page is filled out
  const isPageValid = () => {
    switch(currentPage) {
      case 1:
        return answers.experienceLevel !== "";
      case 2:
        return answers.primaryGoal !== "";
      case 3:
        return answers.investmentHorizon !== "";
      case 4:
        return answers.industrySector !== "";
      case 5:
        return answers.marketCap !== "" && 
                answers.peRatio !== "" && 
                answers.dividends !== "" && 
                answers.analystRating !== "";
      default:
        return false;
    }
  };

  return (
    <div className="questionnaire-content">
      <h2>Portfolio Questionnaire</h2>
      
      {/* Progress Indicator */}
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${(currentPage / totalPages) * 100}%` }}
        ></div>
      </div>
      <p className="page-indicator">Question {currentPage} of {totalPages}</p>

      <form onSubmit={handleSubmit}>
        
        {/* Page 1 */}
        {currentPage === 1 && (
        <div className="question-page">
            <div className="question-group">
            <label>What is your investment experience level?</label>
            <select
                value={answers.experienceLevel}
                onChange={(e) => handleChange("experienceLevel", e.target.value)}
                required
            >
                <option value="">-- Select an option --</option>
                <option value="beginner">Beginner - New to investing</option>
                <option value="intermediate">Intermediate - Some experience</option>
                <option value="advanced">Advanced - Experienced investor</option>
                <option value="expert">Expert - Professional level</option>
            </select>
            </div>
        </div>
        )}

        {/* Page 2 */}
        {currentPage === 2 && (
        <div className="question-page">
            <div className="question-group">
            <label>What is your primary investment goal?</label>
            <select
                value={answers.primaryGoal}
                onChange={(e) => handleChange("primaryGoal", e.target.value)}
                required
            >
                <option value="">-- Select an option --</option>
                <option value="income">Generate Income</option>
                <option value="growth">Capital Growth</option>
                <option value="preservation">Wealth Preservation</option>
                <option value="balanced">Balanced Approach</option>
                <option value="retirement">Retirement Planning</option>
            </select>
            </div>
        </div>
        )}

        {/* Page 3 */}
        {currentPage === 3 && (
        <div className="question-page">
            <div className="question-group">
            <label>What is your investment time horizon?</label>
            <select
                value={answers.investmentHorizon}
                onChange={(e) => handleChange("investmentHorizon", e.target.value)}
                required
            >
                <option value="">-- Select an option --</option>
                <option value="short">Short-term (0-3 years)</option>
                <option value="medium">Medium-term (3-7 years)</option>
                <option value="long">Long-term (7-15 years)</option>
                <option value="very-long">Very Long-term (15+ years)</option>
            </select>
            </div>
        </div>
        )}

        {/* Page 4 */}
        {currentPage === 4 && (
        <div className="question-page">
            <div className="question-group">
            <label>Which industry sector do you prefer?</label>
            <select
                value={answers.industrySector}
                onChange={(e) => handleChange("industrySector", e.target.value)}
                required
            >
                <option value="">-- Select an option --</option>
                <option value="any">Any - No Preference</option>
                <option value="Basic Materials">Basic Materials</option>
                <option value="Major Chemicals">Major Chemicals</option>
                <option value="Consumer Discretionary">Consumer Discretionary</option>
                <option value="Consumer Staples">Consumer Staples</option>
                <option value="Energy">Energy</option>
                <option value="Finance">Finance</option>
                <option value="Health Care">Health Care</option>
                <option value="Industrials">Industrials</option>
                <option value="Miscellaneous">Miscellaneous</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Technology">Technology</option>
                <option value="Telecommunications">Telecommunications</option>
                <option value="Utilities">Utilities</option>
            </select>
            </div>
        </div>
        )}

        {/* Page 5 - Technical Filters */}
        {currentPage === 5 && (
        <div className="question-page">
            <h3 className="page-title">Technical Preferences</h3>
            
            <div className="question-group">
            <label>Preferred Market Cap</label>
            <select
                value={answers.marketCap}
                onChange={(e) => handleChange("marketCap", e.target.value)}
                required
            >
                <option value="">-- Select an option --</option>
                <option value="mega">Mega Cap ($200B+)</option>
                <option value="large">Large Cap ($10B - $200B)</option>
                <option value="medium">Medium Cap ($2B - $10B)</option>
                <option value="small">Small Cap ($300M - $2B)</option>
                <option value="micro">Micro Cap (Under $300M)</option>
                <option value="any">Any Market Cap</option>
            </select>
            </div>

            <div className="question-group">
            <label>P/E Ratio Preference</label>
            <select
                value={answers.peRatio}
                onChange={(e) => handleChange("peRatio", e.target.value)}
                required
            >
                <option value="">-- Select an option --</option>
                <option value="low">Low (Under 15)</option>
                <option value="medium">Medium (15 - 25)</option>
                <option value="high">High (Over 25)</option>
                <option value="any">Any P/E Ratio</option>
            </select>
            </div>

            <div className="question-group">
            <label>Dividend Preference</label>
            <select
                value={answers.dividends}
                onChange={(e) => handleChange("dividends", e.target.value)}
                required
            >
                <option value="">-- Select an option --</option>
                <option value="yes">Yes - Dividend Paying Only</option>
                <option value="no">No - Non-Dividend Stocks</option>
                <option value="either">Either - No Preference</option>
            </select>
            </div>

            <div className="question-group">
            <label>Analyst Rating Preference</label>
            <select
                value={answers.analystRating}
                onChange={(e) => handleChange("analystRating", e.target.value)}
                required
            >
                <option value="">-- Select an option --</option>
                <option value="a">A - Strong Buy</option>
                <option value="b">B - Buy</option>
                <option value="c">C - Hold</option>
                <option value="d">D - Underperform</option>
                <option value="f">F - Sell</option>
                <option value="any">Any Rating</option>
            </select>
            </div>
        </div>
        )}

        {/* Navigation Buttons */}
        <div className="navigation-buttons">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentPage === 1}
            className="nav-btn prev-btn"
          >
            Previous
          </button>

          {currentPage < totalPages ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!isPageValid()}
              className="nav-btn next-btn"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={!isPageValid()}
              className="nav-btn submit-btn"
            >
              Submit
            </button>
          )}
        </div>
      </form>
    </div>
  );
}