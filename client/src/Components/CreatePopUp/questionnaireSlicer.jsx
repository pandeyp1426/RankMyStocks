import { createSlice } from '@reduxjs/toolkit';

const questionnaireSlice = createSlice({
  name: 'questionnaire',
  initialState: {
    answers: {
      riskTolerance: "",
      investmentHorizon: "",
      experienceLevel: "",
      primaryGoal: "",
      industrySector: "",
      marketCap: "",
      peRatio: "",
      dividends: "",
      analystRating: ""
    }
  },
  reducers: {
    setQuestionnaireAnswers: (state, action) => {
      state.answers = action.payload;
    },
    clearQuestionnaireAnswers: (state) => {
      state.answers = {
        riskTolerance: "",
        investmentHorizon: "",
        experienceLevel: "",
        primaryGoal: "",
        industrySector: "",
        marketCap: "",
        peRatio: "",
        dividends: "",
        analystRating: ""
      };
    }
  }
});

export const { setQuestionnaireAnswers, clearQuestionnaireAnswers } = questionnaireSlice.actions;
export default questionnaireSlice.reducer;