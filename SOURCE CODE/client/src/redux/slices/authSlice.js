import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const login = createAsyncThunk(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/auth/login", payload);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Login failed");
    }
  }
);

export const register = createAsyncThunk(
  "auth/register",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/auth/register", payload);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Registration failed");
    }
  }
);

// Validate stored token on app startup
export const verifyAuth = createAsyncThunk(
  "auth/verify",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/auth/me");
      return data.user;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Session expired");
    }
  }
);

const storedUser = JSON.parse(localStorage.getItem("sb_user") || "null");
const storedToken = localStorage.getItem("sb_token");

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: storedUser,
    token: storedToken,
    status: "idle",
    error: null,
    authChecked: !storedToken,
  },

  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.authChecked = true;

      localStorage.removeItem("sb_token");
      localStorage.removeItem("sb_user");
    },

    updateWalletBalance: (state, action) => {
      if (state.user) {
        state.user.walletBalance = action.payload;
      }
    },

    setUser: (state, action) => {
      state.user = action.payload;
      localStorage.setItem("sb_user", JSON.stringify(action.payload));
    },
  },

  extraReducers: (builder) => {
    builder

      // ---------------- VERIFY AUTH ----------------

      .addCase(verifyAuth.pending, (state) => {
        state.status = "loading";
      })

      .addCase(verifyAuth.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
        state.authChecked = true;

        localStorage.setItem("sb_user", JSON.stringify(action.payload));
      })

      .addCase(verifyAuth.rejected, (state) => {
        state.status = "failed";
        state.user = null;
        state.token = null;
        state.authChecked = true;

        localStorage.removeItem("sb_token");
        localStorage.removeItem("sb_user");
      })

      // ---------------- LOGIN / REGISTER ----------------

      .addMatcher(
        (action) =>
          [login.pending.type, register.pending.type].includes(action.type),
        (state) => {
          state.status = "loading";
          state.error = null;
        }
      )

      .addMatcher(
        (action) =>
          [login.fulfilled.type, register.fulfilled.type].includes(action.type),
        (state, action) => {
          state.status = "succeeded";
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.authChecked = true;

          localStorage.setItem("sb_token", action.payload.token);
          localStorage.setItem(
            "sb_user",
            JSON.stringify(action.payload.user)
          );
        }
      )

      .addMatcher(
        (action) =>
          [login.rejected.type, register.rejected.type].includes(action.type),
        (state, action) => {
          state.status = "failed";
          state.error = action.payload;
        }
      );
  },
});

export const { logout, updateWalletBalance, setUser } = authSlice.actions;

export default authSlice.reducer;