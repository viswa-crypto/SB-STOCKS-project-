import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchGoals = createAsyncThunk("goals/fetch", async () => {
  const { data } = await api.get("/goals");
  return data.goals;
});

export const createGoal = createAsyncThunk("goals/create", async (payload, { dispatch }) => {
  await api.post("/goals", payload);
  dispatch(fetchGoals());
});

export const updateGoal = createAsyncThunk("goals/update", async ({ id, ...payload }, { dispatch }) => {
  await api.put(`/goals/${id}`, payload);
  dispatch(fetchGoals());
});

export const deleteGoal = createAsyncThunk("goals/delete", async (id, { dispatch }) => {
  await api.delete(`/goals/${id}`);
  dispatch(fetchGoals());
});

const goalSlice = createSlice({
  name: "goals",
  initialState: { list: [], status: "idle" },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGoals.pending, (state) => {
        if (state.list.length === 0) state.status = "loading";
      })
      .addCase(fetchGoals.fulfilled, (state, action) => {
        state.list = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchGoals.rejected, (state) => {
        state.status = "failed";
      });
  },
});

export default goalSlice.reducer;
