import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchWatchlist = createAsyncThunk("watchlist/fetch", async () => {
  const { data } = await api.get("/watchlist");
  return data.items;
});

export const addToWatchlist = createAsyncThunk("watchlist/add", async (stockId, { dispatch }) => {
  await api.post("/watchlist", { stockId });
  dispatch(fetchWatchlist());
});

export const removeFromWatchlist = createAsyncThunk("watchlist/remove", async (stockId, { dispatch }) => {
  await api.delete(`/watchlist/${stockId}`);
  dispatch(fetchWatchlist());
});

export const togglePinWatchlistItem = createAsyncThunk(
  "watchlist/togglePin",
  async ({ stockId, pinned }) => {
    const { data } = await api.patch(`/watchlist/${stockId}`, { pinned });
    return data.item;
  }
);

export const setWatchlistAlert = createAsyncThunk(
  "watchlist/setAlert",
  async ({ stockId, targetPrice }) => {
    const { data } = await api.patch(`/watchlist/${stockId}`, { targetPrice });
    return data.item;
  }
);

const watchlistSlice = createSlice({
  name: "watchlist",
  initialState: { items: [], status: "idle" },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWatchlist.pending, (state) => {
        if (state.items.length === 0) state.status = "loading";
      })
      .addCase(fetchWatchlist.fulfilled, (state, action) => {
        state.items = action.payload;
        state.status = "succeeded";
      })
      .addCase(togglePinWatchlistItem.fulfilled, (state, action) => {
        const idx = state.items.findIndex((i) => i._id === action.payload._id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(setWatchlistAlert.fulfilled, (state, action) => {
        const idx = state.items.findIndex((i) => i._id === action.payload._id);
        if (idx !== -1) state.items[idx] = action.payload;
      });
  },
});

export default watchlistSlice.reducer;
