import { configureStore } from '@reduxjs/toolkit';
import portfolioReducer from './Components/portfolioNameSlicer.jsx';
import numSliderReducer from './Components/numSliderSlicer.jsx';

const store = configureStore({
  reducer: {
    portfolio: portfolioReducer,
    questionQTY: numSliderReducer,
  },
});

export default store;
