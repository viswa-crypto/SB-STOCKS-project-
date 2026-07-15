import { useState } from "react";
import { useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { Loader2, KeyRound, Sun, Moon, Type, Contrast, Palette, Check } from "lucide-react";
import { showToast } from "../redux/slices/uiSlice";
import { loadPrefs, savePrefs, applyPrefs } from "../utils/preferences";
import api from "../services/api";

const ACCENTS = [
  { key: "green", label: "Green", swatch: "#2FE6A6" },
  { key: "blue", label: "Blue", swatch: "#3B82F6" },
  { key: "purple", label: "Purple", swatch: "#A855F7" },
];

const FONT_SIZES = [
  { key: "sm", label: "Small" },
  { key: "md", label: "Default" },
  { key: "lg", label: "Large" },
];

export default function Settings() {
  const dispatch = useDispatch();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState(loadPrefs);

  const updatePrefs = (patch) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    applyPrefs(next);
    savePrefs(next);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/users/me/password", form);
      dispatch(showToast({ type: "success", message: "Password updated" }));
      setForm({ currentPassword: "", newPassword: "" });
    } catch (err) {
      dispatch(showToast({ type: "error", message: err.response?.data?.message || "Update failed" }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-3xl font-bold mb-1">
        Settings
      </motion.h1>
      <p className="text-mute mb-8">Manage your appearance, accessibility, and security preferences.</p>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card mb-6">
        <div className="flex items-center gap-2 mb-6">
          <Palette className="text-mint" size={18} />
          <h3 className="font-display font-semibold">Appearance</h3>
        </div>

        <p className="text-xs text-mute mb-2">Mode</p>
        <div className="flex gap-2 mb-6" role="group" aria-label="Theme mode">
          {[
            { key: "dark", label: "Dark", Icon: Moon },
            { key: "light", label: "Light", Icon: Sun },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              aria-pressed={prefs.mode === key}
              onClick={() => updatePrefs({ mode: key })}
              className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg border transition-colors ${
                prefs.mode === key ? "bg-mint/10 text-mint border-mint/30" : "border-line text-mute hover:text-ice hover:border-mint/30"
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        <p className="text-xs text-mute mb-2">Accent color</p>
        <div className="flex gap-3 mb-1" role="group" aria-label="Accent color">
          {ACCENTS.map(({ key, label, swatch }) => (
            <button
              key={key}
              type="button"
              aria-pressed={prefs.accent === key}
              aria-label={`${label} accent`}
              title={label}
              onClick={() => updatePrefs({ accent: key })}
              className="relative w-10 h-10 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110"
              style={{ backgroundColor: swatch, borderColor: prefs.accent === key ? swatch : "transparent" }}
            >
              {prefs.accent === key && <Check size={16} className="text-ink" strokeWidth={3} />}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-mute mt-2">Saved automatically to this device.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card mb-6">
        <div className="flex items-center gap-2 mb-6">
          <Type className="text-mint" size={18} />
          <h3 className="font-display font-semibold">Accessibility</h3>
        </div>

        <p className="text-xs text-mute mb-2">Font size</p>
        <div className="flex gap-2 mb-6" role="group" aria-label="Font size">
          {FONT_SIZES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={prefs.fontSize === key}
              onClick={() => updatePrefs({ fontSize: key })}
              className={`flex-1 text-sm font-medium px-4 py-2.5 rounded-lg border transition-colors ${
                prefs.fontSize === key ? "bg-mint/10 text-mint border-mint/30" : "border-line text-mute hover:text-ice hover:border-mint/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={prefs.highContrast}
          onClick={() => updatePrefs({ highContrast: !prefs.highContrast })}
          className="w-full flex items-center justify-between gap-3 text-sm font-medium px-4 py-3 rounded-lg border border-line hover:border-mint/30 transition-colors"
        >
          <span className="flex items-center gap-2"><Contrast size={16} className="text-mint" /> High contrast mode</span>
          <span className={`w-10 h-5 rounded-full relative transition-colors ${prefs.highContrast ? "bg-mint" : "bg-panel2 border border-line"}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-ink transition-transform ${prefs.highContrast ? "translate-x-5" : "translate-x-0.5"}`} />
          </span>
        </button>

        <p className="text-[11px] text-mute mt-4 leading-relaxed">
          The app supports full keyboard navigation — press Tab to move between controls and Enter/Space to
          activate them. Interactive elements include descriptive labels for screen readers.
        </p>
      </motion.div>

      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
        <div className="flex items-center gap-2 mb-6">
          <KeyRound className="text-mint" size={18} />
          <h3 className="font-display font-semibold">Change password</h3>
        </div>

        <label className="text-xs text-mute mb-1 block">Current password</label>
        <input
          type="password"
          required
          value={form.currentPassword}
          onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          className="w-full mb-4 bg-panel2 border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-mint"
        />

        <label className="text-xs text-mute mb-1 block">New password</label>
        <input
          type="password"
          required
          minLength={6}
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          className="w-full mb-6 bg-panel2 border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-mint"
        />

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="animate-spin" size={16} /> : "Update password"}
        </button>
      </motion.form>
    </div>
  );
}
