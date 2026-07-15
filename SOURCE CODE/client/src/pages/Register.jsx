import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { UserPlus, Loader2 } from "lucide-react";
import { register } from "../redux/slices/authSlice";
import { showToast } from "../redux/slices/uiSlice";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const { status } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    const result = await dispatch(register(form));
    if (register.fulfilled.match(result)) {
      dispatch(showToast({ type: "success", message: "Account created — welcome to SB Stocks!" }));
      navigate("/dashboard");
    } else {
      dispatch(showToast({ type: "error", message: result.payload || "Registration failed" }));
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
      <h1 className="font-display text-2xl font-bold mb-1">Create your account</h1>
      <p className="text-mute text-sm mb-6">Start with ₹1,00,000 in virtual funds.</p>

      <label className="text-xs text-mute mb-1 block">Full name</label>
      <input
        required
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="w-full mb-4 bg-panel2 border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-mint transition-colors"
        placeholder="Jane Doe"
      />

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
        minLength={6}
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        className="w-full mb-6 bg-panel2 border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-mint transition-colors"
        placeholder="At least 6 characters"
      />

      <button type="submit" disabled={status === "loading"} className="btn-primary w-full">
        {status === "loading" ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
        Create account
      </button>

      <p className="text-sm text-mute mt-5 text-center">
        Already trading with us? <Link to="/login" className="text-mint hover:underline">Log in</Link>
      </p>
    </motion.form>
  );
}
