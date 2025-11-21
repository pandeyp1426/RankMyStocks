import { configureStore } from '@reduxjs/toolkit';
import portfolioReducer from './Components/CreatePopUp/portfolioNameSlicer.jsx';
import numSliderReducer from './Components/CreatePopUp/numSliderSlicer.jsx';
import authReducer from "./Components/Navbar/authSlicer.jsx";
import questionnarieReducer from './Components/CreatePopUp/questionnaireSlicer.jsx';

const store = configureStore({
  reducer: {
    auth: authReducer,
    portfolio: portfolioReducer,
    questionQTY: numSliderReducer,
    questionnaire: questionnarieReducer
  },
});

export default store;
