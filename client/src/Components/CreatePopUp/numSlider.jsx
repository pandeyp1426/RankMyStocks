import { useSelector, useDispatch } from 'react-redux';
import { setQuestionQTY } from './numSliderSlicer';
import './numSlider.css';

export function NumSlider() {
  //Usable in any file in any file to get the current value of questionQTY.
  //Needs import { useSelector } from 'react-redux'; to pull from store
  const questionQTY = useSelector((state) => state.questionQTY.value);
  const dispatch = useDispatch();//allows us to change the state of questionQTY

  const handleChange = (event) => {
    dispatch(setQuestionQTY(Number(event.target.value)));
  };//if called changes state

  return (
    <div>
<<<<<<< HEAD
      <h3 className="title">Question Amount</h3>

      <input
        type="range"
        min="0"
        max="35"
=======
      <h3 className="title">How many Rounds?</h3>

      <input
        type="range"
        min="1"
        max="100"
>>>>>>> Sprint1_Pradeep
        step="1"
        value={questionQTY}
        onChange={handleChange}
        className="custom-slider"
      />

<<<<<<< HEAD
      <p className="message">Options: {questionQTY}</p>
=======
      <p className="message">Rounds: {questionQTY}</p>
>>>>>>> Sprint1_Pradeep
    </div>
  );
}
