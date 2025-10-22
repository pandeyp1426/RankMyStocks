import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: false,
  user: null, 
  userID: null, 
  token: null, 
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthData: (state, action) => {
      state.isAuthenticated = action.payload.isAuthenticated;
      state.user = action.payload.user;
      state.userID = action.payload.userID;
      state.token = action.payload.token;
    },
    clearAuthData: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.userID = null;
      state.token = null;
    },
  },
});

export const { setAuthData, clearAuthData } = authSlice.actions;
export default authSlice.reducer;

//How to grab this from other files
//import { useSelector } from "react-redux";
//const { userID, token } = useSelector((state) => state.auth);