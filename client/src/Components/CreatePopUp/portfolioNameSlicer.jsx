import { createSlice } from '@reduxjs/toolkit';

const portfolioSlice = createSlice({
  name: 'portfolioName',
  initialState: {
    portfolioName: '',
  },//state name and default name
  reducers: {
    setPortfolioName(state, action) {
      state.portfolioName = action.payload;
    },
  },
}); //new state and update function

export const { setPortfolioName } = portfolioSlice.actions;
export default portfolioSlice.reducer;//passes to store so it can be accessed by other components
