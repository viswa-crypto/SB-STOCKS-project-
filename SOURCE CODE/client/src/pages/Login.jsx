import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { LogIn, Loader2 } from "lucide-react";
import { login } from "../redux/slices/authSlice";
import { showToast } from "../redux/slices/uiSlice";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const { status } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login(form));
    if (login.fulfilled.match(result)) {
      const role = result.payload?.user?.role;
      dispatch(showToast({ type: "success", message: "Welcome back!" }));
      navigate(role === "admin" ? "/admin" : "/dashboard");
    } else {
      dispatch(showToast({ type: "error", message: result.payload || "Login failed" }));
    }
  };

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 20, rotateX: 6 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.5 }}
      className="card w-full max-w-sm"
    >
      <h1 className="font-display text-2xl font-bold mb-1">Log in</h1>
      <p className="text-mute text-sm mb-6">Pick up where you left off.</p>

      <label className="text-xs text-mute mb-1 block">Email</label>
      <input
        type="email"
        required
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className="w-full mb-4 bg-panel2 border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-mint transition-colors"
        placeholder="you@example.com"
      />

      <label className="text-xs text-mute mb-1 block">Password</label>
      <input
        type="password"
        required
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        className="w-full mb-6 bg-panel2 border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-mint transition-colors"
        placeholder="••••••••"
      />

      <button type="submit" disabled={status === "loading"} className="btn-primary w-full">
        {status === "loading" ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
        Log in
      </button>

      <p className="text-sm text-mute mt-5 text-center">
        New here? <Link to="/register" className="text-mint hover:underline">Create an account</Link>
      </p>
    </motion.form>
  );
}
