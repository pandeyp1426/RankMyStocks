import { configureStore } from '@reduxjs/toolkit';
import portfolioReducer from './Components/CreatePopUp/portfolioNameSlicer.jsx';
import numSliderReducer from './Components/CreatePopUp/numSliderSlicer.jsx';

const store = configureStore({
  reducer: {
    portfolio: portfolioReducer,
    questionQTY: numSliderReducer,
  },
});

export default store;
