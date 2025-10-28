import { useSelector, useDispatch } from 'react-redux';
import { setPortfolioName } from './portfolioNameSlicer';
import './portfolioName.css'

export function PortfolioName() {
  //Usable in any file in any file to get the current string in portfolioName.
  //Needs import { useSelector } from 'react-redux'; to pull from store
  const portfolioName = useSelector((state) => state.portfolio.portfolioName);
  const dispatch = useDispatch();//allows us to change the state of questionQTY

  const handleChange = (event) => {
    dispatch(setPortfolioName(event.target.value));
  };//if called changes state

  return (
    <div className="popup-textbox-container">
      <input
        type="text"
        id="myInput"
        value={portfolioName}
        onChange={handleChange}
        placeholder="Name your portfolio"
        autoComplete="off"
      />
    </div>
  );
}