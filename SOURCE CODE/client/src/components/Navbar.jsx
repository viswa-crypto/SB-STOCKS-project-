import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Menu, X, LogOut, LayoutDashboard, Search, Bell, Settings, ChevronDown, Sun, Moon, UserCircle,
} from "lucide-react";
import { logout } from "../redux/slices/authSlice";
import { showToast } from "../redux/slices/uiSlice";
import { formatCurrency } from "../utils/formatters";
import { requestDesktopPermission, fireDesktopNotification, getPermissionStatus } from "../utils/desktopNotify";
import api from "../services/api";
import { loadPrefs, savePrefs, applyPrefs } from "../utils/preferences";

const navLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/stocks", label: "Stocks" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/watchlist", label: "Watchlist" },
  { to: "/transactions", label: "Transactions" },
  { to: "/compare", label: "Compare" },
  { to: "/goals", label: "Goals" },
  { to: "/leaderboard", label: "Leaderboard" },
];

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const handle = setTimeout(() => {
      api.get("/stocks", { params: { search: query } }).then(({ data }) => {
        setResults(data.stocks.slice(0, 6));
        setOpen(true);
      }).catch(() => {});
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  const go = (id) => {
    setOpen(false);
    setQuery("");
    navigate(`/stocks/${id}`);
  };

  return (
    <div ref={boxRef} className="relative hidden lg:block w-32 xl:w-52 2xl:w-64 shrink min-w-0 transition-all">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" size={15} />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query && setOpen(true)}
        placeholder="Search stocks..."
        className="w-full bg-panel2 border border-line rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-mint transition-colors"
      />
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute top-full mt-2 w-full card !p-2 z-50"
          >
            {results.map((s) => (
              <button
                key={s._id}
                onClick={() => go(s._id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-panel2 transition-colors"
              >
                <span>
                  <span className="font-medium text-sm">{s.symbol}</span>
                  <span className="text-xs text-mute ml-2">{s.companyName}</span>
                </span>
                <span className="mono-num text-xs text-mute">{formatCurrency(s.currentPrice)}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const boxRef = useRef(null);
  const dispatch = useDispatch();
  const seenIds = useRef(new Set());
  const initialized = useRef(false);
  const [permission, setPermission] = useState(getPermissionStatus());

  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const poll = () => {
      api.get("/notifications").then(({ data }) => {
        setItems(data.notifications);
        setUnread(data.unreadCount);

        // First poll after mount just establishes the baseline — it never
        // pops toasts/desktop alerts for the existing backlog, only for
        // genuinely new notifications that arrive after that.
        if (!initialized.current) {
          data.notifications.forEach((n) => seenIds.current.add(n._id));
          initialized.current = true;
          return;
        }

        data.notifications.forEach((n) => {
          if (seenIds.current.has(n._id)) return;
          seenIds.current.add(n._id);
          if (!n.read) {
            dispatch(showToast({ type: "alert", title: n.title, message: n.message }));
            fireDesktopNotification(n.title, n.message, n._id);
          }
        });
      });
    };
    poll();
    const interval = setInterval(poll, 20000); // matches the 15s price-tick cadence
    return () => clearInterval(interval);
  }, [dispatch]);

  const openBell = () => {
    setOpen((o) => !o);
    if (unread > 0) api.patch("/notifications/read-all").then(() => setUnread(0));
  };

  const enableDesktopAlerts = () => {
    // Must run directly inside this click handler — browsers silently
    // ignore Notification.requestPermission() unless it's called from a
    // real user gesture, which is why auto-requesting on page load never
    // actually showed the OS prompt.
    requestDesktopPermission().then(setPermission);
  };

  const clearAll = () => {
    api.delete("/notifications").then(() => {
      setItems([]);
      setUnread(0);
      seenIds.current.clear();
    });
  };

  return (
    <div ref={boxRef} className="relative">
      <button onClick={openBell} className="relative text-mute hover:text-ice transition-colors p-2">
        <Bell size={18} />
        {unread > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-mint" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 top-full mt-2 w-72 card !p-2 z-50 max-h-80 overflow-y-auto"
          >
            <div className="flex items-center justify-between px-2 py-1">
              <p className="text-xs text-mute">Notifications</p>
              {items.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[11px] font-medium text-mute hover:text-rose transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
            {permission === "default" && (
              <button
                onClick={enableDesktopAlerts}
                className="w-full text-left px-3 py-2 mb-1 rounded-lg bg-mint/10 text-mint text-xs font-medium hover:bg-mint/15 transition-colors"
              >
                Enable desktop alerts
              </button>
            )}
            {permission === "denied" && (
              <p className="px-3 py-2 mb-1 rounded-lg bg-rose/10 text-rose text-[11px] leading-relaxed">
                Desktop alerts are blocked. Enable notifications for this site in your browser's address-bar settings to receive popups.
              </p>
            )}
            {items.length === 0 && <p className="text-xs text-mute px-3 py-3">No notifications yet.</p>}
            {items.map((n) => (
              <div key={n._id} className="px-3 py-2 rounded-lg hover:bg-panel2 transition-colors">
                <p className="text-sm">{n.title}</p>
                <p className="text-[11px] text-mute mt-0.5">{n.message}</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initial = (user.name?.trim()?.[0] || "U").toUpperCase();
  const avatarUrl = user.avatarUrl || user.avatar || user.profilePicture || user.photoUrl || null;
  const [imgError, setImgError] = useState(false);

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-panel2 transition-colors"
      >
        {avatarUrl && !imgError ? (
          <img
            src={avatarUrl}
            alt={user.name || "User avatar"}
            onError={() => setImgError(true)}
            className="w-8 h-8 rounded-full object-cover shrink-0 border border-line"
          />
        ) : (
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-mint/15 text-mint font-display font-semibold text-sm shrink-0">
            {initial}
          </span>
        )}
        <span className="text-sm text-ice font-medium max-w-[8rem] truncate">
          {user.name?.split(" ")[0]}
        </span>
        <ChevronDown size={14} className={`text-mute transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 top-full mt-2 w-40 card !p-2 z-50"
          >
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ice hover:bg-panel2 transition-colors"
            >
              <UserCircle size={14} /> Profile
            </Link>
            <div className="my-1 border-t border-line" />
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-rose hover:bg-rose/10 transition-colors"
            >
              <LogOut size={14} /> Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ThemeToggle() {
  const [mode, setMode] = useState(() => loadPrefs().mode);

  const toggle = () => {
    const prefs = loadPrefs();
    const next = { ...prefs, mode: prefs.mode === "dark" ? "light" : "dark" };
    applyPrefs(next);
    savePrefs(next);
    setMode(next.mode);
  };

  const isLight = mode === "light";

  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={isLight}
      aria-label="Toggle light/dark theme"
      title={isLight ? "Switch to dark mode" : "Switch to light mode"}
      className="relative inline-flex items-center w-12 h-7 rounded-full border border-line bg-panel2 transition-colors shrink-0"
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-0.5 flex items-center justify-center rounded-full bg-mint text-ink shadow-card"
        style={{ left: isLight ? "calc(100% - 1.5rem)" : "0.15rem", width: "1.375rem", height: "1.375rem" }}
      >
        {isLight ? <Sun size={13} /> : <Moon size={13} />}
      </motion.span>
    </button>
  );
}

export default function Navbar() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/80 backdrop-blur-lg">
      <div className="w-full mx-auto px-4 xl:px-8 h-16 flex items-center gap-3 xl:gap-5">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 font-display font-bold text-lg shrink-0">
          <TrendingUp className="text-mint" size={22} />
          <span className="hidden sm:inline">SB <span className="text-mint">Stocks</span></span>
        </Link>

        {user && (
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 flex-nowrap">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `shrink-0 px-2 xl:px-2.5 py-2 rounded-lg text-[13px] xl:text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive ? "text-mint bg-mint/10" : "text-mute hover:text-ice"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            {user.role === "admin" && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `shrink-0 flex items-center gap-1 px-2 xl:px-2.5 py-2 rounded-lg text-[13px] xl:text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive ? "text-gold bg-gold/10" : "text-mute hover:text-gold"
                  }`
                }
              >
                <LayoutDashboard size={14} /> Admin
              </NavLink>
            )}
          </nav>
        )}

        <div className="hidden lg:flex items-center gap-2 xl:gap-3 shrink-0 ml-auto">
          {user ? (
            <>
              <GlobalSearch />
              <span className="mono-num text-sm text-mint whitespace-nowrap">
                {formatCurrency(user.walletBalance)}
              </span>
              <NotificationsBell />
              <button
                onClick={() => navigate("/settings")}
                className="text-mute hover:text-ice transition-colors p-2"
                title="Settings"
                aria-label="Settings"
              >
                <Settings size={18} />
              </button>
              <ThemeToggle />
              <ProfileMenu user={user} onLogout={handleLogout} />
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Log in</Link>
              <Link to="/register" className="btn-primary">Get started</Link>
            </>
          )}
        </div>

        <button className="lg:hidden text-ice shrink-0 ml-auto" onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden border-t border-line overflow-hidden"
          >
            <div className="px-5 py-4 flex flex-col gap-2">
              {user &&
                navLinks.map((l) => (
                  <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="py-2 text-mute hover:text-ice">
                    {l.label}
                  </Link>
                ))}
              {user?.role === "admin" && (
                <Link to="/admin" onClick={() => setOpen(false)} className="py-2 text-gold">Admin</Link>
              )}
              {user && (
                <Link to="/profile" onClick={() => setOpen(false)} className="py-2 text-mute hover:text-ice">Profile</Link>
              )}
              {user && (
                <Link to="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 py-2 text-mute hover:text-ice">
                  <Settings size={16} /> Settings
                </Link>
              )}
              {user && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-mute text-sm">Theme</span>
                  <ThemeToggle />
                </div>
              )}
              {user ? (
                <button onClick={handleLogout} className="btn-danger mt-2">Log out</button>
              ) : (
                <div className="flex gap-2 mt-2">
                  <Link to="/login" className="btn-ghost flex-1">Log in</Link>
                  <Link to="/register" className="btn-primary flex-1">Sign up</Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
