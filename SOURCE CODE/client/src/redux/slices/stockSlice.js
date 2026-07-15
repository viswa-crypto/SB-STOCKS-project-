import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";
 
export const fetchStocks = createAsyncThunk("stocks/fetchAll", async (params) => {
  const { data } = await api.get("/stocks", { params });
  return data.stocks;
});
 
export const fetchStockById = createAsyncThunk("stocks/fetchOne", async (id) => {
  const { data } = await api.get(`/stocks/${id}`);
  return data;
});
 
const stockSlice = createSlice({
  name: "stocks",
  // `status` tracks the stock LIST fetch only. `detailStatus`/`detailId` track
  // the single-stock fetch independently — previously both fetches shared
  // `status`, so navigating straight from one stock's details page to
  // another's (or landing on Stock Details after a list fetch had already
  // succeeded) could leave the page showing stale/no data indefinitely,
  // since `fetchStockById` never touched `status` and had no rejected
  // handler to signal failure either.
  initialState: {
    list: [],
    current: null,
    history: [],
    status: "idle",
    detailStatus: "idle",
    detailId: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStocks.pending, (state) => { state.status = "loading"; })
      .addCase(fetchStocks.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload;
      })
      .addCase(fetchStocks.rejected, (state) => { state.status = "failed"; })
      .addCase(fetchStockById.pending, (state, action) => {
        state.detailStatus = "loading";
        state.detailId = action.meta.arg;
      })
      .addCase(fetchStockById.fulfilled, (state, action) => {
        state.detailStatus = "succeeded";
        state.current = action.payload.stock;
        state.history = action.payload.history;
      })
      .addCase(fetchStockById.rejected, (state) => {
        state.detailStatus = "failed";
        // Only wipe existing data on a genuine first-load failure. Once a stock's
        // details have loaded successfully, StockDetails polls this thunk in the
        // background to keep the price/chart live — a transient failure on one of
        // those polls shouldn't blank out an already-working page.
        if (!state.current) {
          state.history = [];
        }
      });
  },
});
 
export default stockSlice.reducer;
 