import { useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence } from "framer-motion";

import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";
import AdminLayout from "./layouts/AdminLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";
import PageTransition from "./components/PageTransition";
import FullPageLoader from "./components/FullPageLoader";
import ErrorBoundary from "./components/ErrorBoundary";
import { verifyAuth } from "./redux/slices/authSlice";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Stocks from "./pages/Stocks";
import StockDetails from "./pages/StockDetails";
import Portfolio from "./pages/Portfolio";
import Watchlist from "./pages/Watchlist";
import Compare from "./pages/Compare";
import Goals from "./pages/Goals";
import Leaderboard from "./pages/Leaderboard";
import Transactions from "./pages/Transactions";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminStocks from "./pages/AdminStocks";
import AdminLogs from "./pages/AdminLogs";
import NotFound from "./pages/NotFound";

const wrap = (Component) => (
  <PageTransition>
    <Component />
  </PageTransition>
);

export default function App() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { token, user, authChecked } = useSelector((s) => s.auth);

  // Validate whatever token is in localStorage against the backend once on
  // startup. Until this resolves, `authChecked` stays false and we hold off
  // rendering the real navbar/routes — this is what stops a stale/expired
  // token from ever showing the logged-in navbar on the landing page.
  useEffect(() => {
    if (token && !authChecked) {
      dispatch(verifyAuth());
    }
  }, [dispatch, token, authChecked]);

  if (!authChecked) {
    return <FullPageLoader label="Checking your session" />;
  }

  const isAuthed = Boolean(user);
  const publicOnlyPaths = ["/login", "/register"];
  if (isAuthed && publicOnlyPaths.includes(location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <ErrorBoundary key={location.pathname}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public, unauthenticated shell */}
          <Route element={<MainLayout />}>
            <Route path="/" element={wrap(LandingPage)} />
            <Route path="/stocks" element={wrap(Stocks)} />
            <Route path="/stocks/:id" element={wrap(StockDetails)} />

            {/* Authenticated user pages */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={wrap(Dashboard)} />
              <Route path="/portfolio" element={wrap(Portfolio)} />
              <Route path="/watchlist" element={wrap(Watchlist)} />
              <Route path="/compare" element={wrap(Compare)} />
              <Route path="/goals" element={wrap(Goals)} />
              <Route path="/leaderboard" element={wrap(Leaderboard)} />
              <Route path="/transactions" element={wrap(Transactions)} />
              <Route path="/profile" element={wrap(Profile)} />
              <Route path="/settings" element={wrap(Settings)} />
            </Route>
          </Route>

          {/* Auth pages get their own split layout */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={wrap(Login)} />
            <Route path="/register" element={wrap(Register)} />
          </Route>

          {/* Admin */}
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={wrap(AdminDashboard)} />
              <Route path="/admin/users" element={wrap(AdminUsers)} />
              <Route path="/admin/stocks" element={wrap(AdminStocks)} />
              <Route path="/admin/logs" element={wrap(AdminLogs)} />
            </Route>
          </Route>

          <Route element={<MainLayout />}>
            <Route path="*" element={wrap(NotFound)} />
          </Route>
        </Routes>
      </AnimatePresence>
    </ErrorBoundary>
  );
}
