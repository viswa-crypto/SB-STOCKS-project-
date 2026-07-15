import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Pencil, Plus, X, Search } from "lucide-react";
import { showToast } from "../redux/slices/uiSlice";
import { formatCurrency } from "../utils/formatters";
import FullPageLoader from "../components/FullPageLoader";
import api from "../services/api";

const emptyForm = { symbol: "", companyName: "", sector: "", currentPrice: "" };

export default function AdminStocks() {
  const [stocks, setStocks] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const dispatch = useDispatch();

  const load = () => api.get("/stocks").then(({ data }) => setStocks(data.stocks));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (s) => { setEditing(s); setForm({ symbol: s.symbol, companyName: s.companyName, sector: s.sector, currentPrice: s.currentPrice }); setShowForm(true); };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/admin/stocks/${editing._id}`, form);
        dispatch(showToast({ type: "success", message: "Stock updated" }));
      } else {
        await api.post("/admin/stocks", form);
        dispatch(showToast({ type: "success", message: "Stock created" }));
      }
      setShowForm(false);
      load();
    } catch (err) {
      dispatch(showToast({ type: "error", message: err.response?.data?.message || "Save failed" }));
    }
  };

  const remove = async (s) => {
    if (!confirm(`Delete ${s.symbol}?`)) return;
    await api.delete(`/admin/stocks/${s._id}`);
    dispatch(showToast({ type: "success", message: "Stock deleted" }));
    load();
  };

  if (!stocks) return <FullPageLoader label="Loading stock listings" />;

  const sectors = [...new Set(stocks.map((s) => s.sector).filter(Boolean))].sort();
  const filtered = stocks.filter((s) => {
    const matchesSearch = !search || s.symbol.toLowerCase().includes(search.toLowerCase()) || s.companyName.toLowerCase().includes(search.toLowerCase());
    const matchesSector = !sectorFilter || s.sector === sectorFilter;
    return matchesSearch && matchesSector;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">Stocks</h1>
          <p className="text-mute">Add, edit, or remove listings from the market.</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> New stock</button>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by symbol or company"
            className="w-full bg-panel2 border border-line rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-mint"
          />
        </div>
        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          className="bg-panel2 border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-mint"
        >
          <option value="">All sectors</option>
          {sectors.map((sec) => <option key={sec} value={sec}>{sec}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-mute border-b border-line">
              <th className="py-2 pr-4">Symbol</th>
              <th className="py-2 pr-4">Company</th>
              <th className="py-2 pr-4">Sector</th>
              <th className="py-2 pr-4">Price</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s._id} className="border-b border-line/50 last:border-0">
                <td className="py-3 pr-4 font-medium">{s.symbol}</td>
                <td className="py-3 pr-4">{s.companyName}</td>
                <td className="py-3 pr-4 text-mute">{s.sector}</td>
                <td className="py-3 pr-4 mono-num">{formatCurrency(s.currentPrice)}</td>
                <td className="py-3 flex gap-3">
                  <button onClick={() => openEdit(s)} className="text-mute hover:text-mint"><Pencil size={16} /></button>
                  <button onClick={() => remove(s)} className="text-mute hover:text-rose"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.form
              initial={{ opacity: 0, y: 20, rotateX: 10 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={submit}
              className="card w-full max-w-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold">{editing ? "Edit stock" : "New stock"}</h3>
                <button type="button" onClick={() => setShowForm(false)} className="text-mute hover:text-ice"><X size={18} /></button>
              </div>
              {["symbol", "companyName", "sector", "currentPrice"].map((field) => (
                <div key={field} className="mb-3">
                  <label className="text-xs text-mute mb-1 block capitalize">{field}</label>
                  <input
                    required
                    type={field === "currentPrice" ? "number" : "text"}
                    step="0.01"
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="w-full bg-panel2 border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-mint"
                  />
                </div>
              ))}
              <button type="submit" className="btn-primary w-full mt-2">{editing ? "Save changes" : "Create stock"}</button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
