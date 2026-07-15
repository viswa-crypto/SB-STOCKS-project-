import { createSlice, nanoid } from "@reduxjs/toolkit";

const uiSlice = createSlice({
  name: "ui",
  initialState: { toasts: [], sidebarOpen: false },
  reducers: {
    showToast: { // multiple toasts can be visible/stacked at once — nothing gets silently overwritten
      reducer: (state, action) => { state.toasts.push(action.payload); },
      prepare: (payload) => ({ payload: { id: nanoid(), ...payload } }),
    },
    clearToast: (state, action) => { state.toasts = state.toasts.filter((t) => t.id !== action.payload); },
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
  },
});

export const { showToast, clearToast, toggleSidebar } = uiSlice.actions;
export default uiSlice.reducer;
