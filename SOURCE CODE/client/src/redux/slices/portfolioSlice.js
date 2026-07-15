import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";
import { updateWalletBalance } from "./authSlice";

export const fetchPortfolio = createAsyncThunk("portfolio/fetch", async () => {
  const { data } = await api.get("/portfolio");
  return data;
});

// Single source of truth for placing a BUY/SELL order from anywhere in the
// app (Stock Details, and previously the Dashboard quick-buy). Root cause of
// the "cash updates instantly but everything else is stale" bug: trades were
// fired with a raw axios call per-component, each one manually patching only
// `walletBalance` into Redux and leaving `portfolio`/`holdings` (and by
// extension Net Worth, P/L, Holdings tables, etc.) untouched until a refetch
// happened to occur naturally (route change/refresh).
//
// This thunk performs the trade, updates the wallet balance, and — before
// resolving — refetches the full portfolio (holdings, net worth, P/L,
// invested totals) into Redux. Because Dashboard, Portfolio, and
// PortfolioSummaryCard all read from this same slice via useSelector, they
// re-render automatically the instant this thunk resolves — no page
// navigation or reload required. `tradeVersion` is bumped alongside it so
// components with their own local data (e.g. the recent-activity/
// transactions lists, which aren't stored in Redux) can treat it as a
// dependency to know a trade just happened and refetch themselves too.
export const executeTrade = createAsyncThunk(
  "portfolio/executeTrade",
  async ({ type, stockId, quantity }, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await api.post(`/trading/${type}`, { stockId, quantity });
      dispatch(updateWalletBalance(data.walletBalance));
      await dispatch(fetchPortfolio());
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Trade failed");
    }
  }
);

const portfolioSlice = createSlice({
  name: "portfolio",
  initialState: { portfolio: null, holdings: [], status: "idle", tradeVersion: 0 },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPortfolio.pending, (state) => { state.status = "loading"; })
      .addCase(fetchPortfolio.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.portfolio = action.payload.portfolio;
        state.holdings = action.payload.holdings;
      })
      .addCase(fetchPortfolio.rejected, (state) => { state.status = "failed"; })
      .addCase(executeTrade.fulfilled, (state) => { state.tradeVersion += 1; });
  },
});

export default portfolioSlice.reducer;
