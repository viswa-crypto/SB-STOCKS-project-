import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute() {
  const { user } = useSelector((s) => s.auth);
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
