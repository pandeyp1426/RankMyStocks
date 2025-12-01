import { configureStore } from '@reduxjs/toolkit';
import portfolioReducer from './Components/CreatePopUp/portfolioNameSlicer.jsx';
import numSliderReducer from './Components/CreatePopUp/numSliderSlicer.jsx';
import authReducer from "./Components/Navbar/authSlicer.jsx";

const store = configureStore({
  reducer: {
    auth: authReducer,
    portfolio: portfolioReducer,
    questionQTY: numSliderReducer,
  },
});

export default store;
