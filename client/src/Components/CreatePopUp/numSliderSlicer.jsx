import { createSlice } from '@reduxjs/toolkit';

const numSliderSlice = createSlice({
  name: 'questionQTY',
  initialState: {
    value: 20,
  },//state name and default name
  reducers: {
    setQuestionQTY(state, action) {
      state.value = action.payload;
    },
  },
});//new state and update function

export const { setQuestionQTY } = numSliderSlice.actions;
export default numSliderSlice.reducer;//passes to store so it can be accessed by other components
