import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

/*
 ╔══════════════════════════════════════════════════════════════════╗
 ║  BulkAds Pro v3.0 — Premium Agency Dashboard                   ║
 ║  Complete rebuild — all objectives, ABO/CBO, optional location  ║
 ╚══════════════════════════════════════════════════════════════════╝
*/

const API = "";

/* ══════════════════════════════════════
   API HELPER — No hardcoded tokens
   ══════════════════════════════════════ */
const api = {
  token: null,
  bizId: null,
  headers() {
    const h = { "Content-Type": "application/json" };
    if (this.token) h["x-fb-access-token"] = this.token;
    if (this.bizId) h["x-fb-business-id"] = this.bizId;
    return h;
  },
  async get(path) {
    const r = await fetch(`${API}${path}`, { headers: this.headers() });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error(data.error || `Request failed (${r.status})`);
    }
    return r.json();
  },
  async post(path, body) {
    const r = await fetch(`${API}${path}`, { method: "POST", headers: this.headers(), body: JSON.stringify(body) });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error(data.error || `Request failed (${r.status})`);
    }
    return r.json();
  },
  async put(path, body) {
    const r = await fetch(`${API}${path}`, { method: "PUT", headers: this.headers(), body: JSON.stringify(body) });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error(data.error || `Request failed (${r.status})`);
    }
    return r.json();
  },
  async postForm(path, formData) {
    const h = {};
    if (this.token) h["x-fb-access-token"] = this.token;
    if (this.bizId) h["x-fb-business-id"] = this.bizId;
    const r = await fetch(`${API}${path}`, { method: "POST", headers: h, body: formData });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error(data.error || `Request failed (${r.status})`);
    }
    return r.json();
  },
  async del(path) {
    const r = await fetch(`${API}${path}`, { method: "DELETE", headers: this.headers() });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error(data.error || `Request failed (${r.status})`);
    }
    return r.json();
  },
};

/* ══════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════ */
const OBJECTIVES = [
  { id: "sales", label: "Sales", icon: "cart", fbValue: "OUTCOME_SALES", desc: "Drive purchases" },
  { id: "conversions", label: "Conversions", icon: "target", fbValue: "OUTCOME_SALES", desc: "Optimize for conversions" },
  { id: "traffic", label: "Traffic", icon: "link", fbValue: "OUTCOME_TRAFFIC", desc: "Send people to your site" },
  { id: "awareness", label: "Awareness", icon: "eye", fbValue: "OUTCOME_AWARENESS", desc: "Reach new people" },
  { id: "engagement", label: "Engagement", icon: "heart", fbValue: "OUTCOME_ENGAGEMENT", desc: "Get more interactions" },
  { id: "leads", label: "Leads", icon: "inbox", fbValue: "OUTCOME_LEADS", desc: "Collect lead information" },
  { id: "app_installs", label: "App Installs", icon: "download", fbValue: "OUTCOME_APP_PROMOTION", desc: "Get app downloads" },
  { id: "video_views", label: "Video Views", icon: "play", fbValue: "OUTCOME_ENGAGEMENT", desc: "Get more video views" },
];

const CTA_OPTIONS = ["Shop Now", "Learn More", "Sign Up", "Book Now", "Download", "Get Offer", "Subscribe", "Contact Us", "Apply Now", "Order Now", "Watch More", "Send Message"];

const COUNTRIES = [
  { code: "IN", name: "India" }, { code: "US", name: "United States" }, { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" }, { code: "AU", name: "Australia" }, { code: "AE", name: "UAE" },
  { code: "SA", name: "Saudi Arabia" }, { code: "DE", name: "Germany" }, { code: "FR", name: "France" },
  { code: "JP", name: "Japan" }, { code: "BR", name: "Brazil" }, { code: "MX", name: "Mexico" },
  { code: "SG", name: "Singapore" }, { code: "PH", name: "Philippines" }, { code: "ID", name: "Indonesia" },
  { code: "PK", name: "Pakistan" }, { code: "BD", name: "Bangladesh" }, { code: "NG", name: "Nigeria" },
  { code: "ZA", name: "South Africa" }, { code: "IT", name: "Italy" }, { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" }, { code: "SE", name: "Sweden" }, { code: "KR", name: "South Korea" },
  { code: "TH", name: "Thailand" }, { code: "MY", name: "Malaysia" }, { code: "NZ", name: "New Zealand" },
  { code: "TR", name: "Turkey" }, { code: "EG", name: "Egypt" }, { code: "KE", name: "Kenya" },
];

const ICONS_LIST = ["🎯", "🛍️", "📋", "📢", "📱", "🔄", "🎬", "💎", "🏷️", "🚀", "💡", "🌟", "🏆", "💰", "🔥", "❄️", "🎁", "📧", "💪", "👗", "📸", "🎮"];

/* ══════════════════════════════════════
   SVG ICONS (defined once, outside component)
   ══════════════════════════════════════ */
const iconPaths = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/></>,
  plus: <><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></>,
  list: <path d="M4 6h16M4 12h16M4 18h10"/>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  grid: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></>,
  chart: <path d="M18 20V10M12 20V4M6 20v-6"/>,
  gear: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
  check: <path d="M2.5 7L5.5 10L11.5 4" strokeWidth="2" strokeLinecap="round"/>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></>,
  x: <path d="M3 3l8 8M11 3l-8 8" strokeLinecap="round"/>,
  search: <><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></>,
  eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
  eyeOff: <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>,
  fb: null, // Custom
  refresh: <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,
  save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></>,
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
  edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
  trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>,
  copy: <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
  chevL: null, // Custom small
  ws: <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>,
  target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
  cart: <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></>,
  link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
  heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>,
  inbox: <><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
  play: <polygon points="5 3 19 12 5 21 5 3"/>,
  globe: <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
};

function Ic({ t, sz = 17, className }) {
  if (t === "fb") {
    return <svg style={{ width: sz, height: sz, display: "inline-block", verticalAlign: "middle" }} viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>;
  }
  if (t === "chevL") {
    return <svg style={{ width: 12, height: 12, display: "inline-block", verticalAlign: "middle" }} viewBox="0 0 12 12" fill="none"><path d="M8 10L4 6l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
  }
  const content = iconPaths[t];
  if (!content) return null;
  return (
    <svg style={{ width: sz, height: sz, display: "inline-block", verticalAlign: "middle" }} viewBox={t === "check" ? "0 0 14 14" : t === "x" ? "0 0 14 14" : "0 0 24 24"} fill="none" stroke="currentColor" strokeWidth="1.8">
      {content}
    </svg>
  );
}

/* ══════════════════════════════════════
   THEME
   ══════════════════════════════════════ */
const T = {
  bg: "#060611", sf: "#0c0c1d", sfH: "#111128", bd: "rgba(255,255,255,.06)", bdH: "rgba(255,255,255,.12)",
  tx: "#e8e8f0", txM: "rgba(255,255,255,.4)", txD: "rgba(255,255,255,.2)",
  ac: "#6366f1", ac2: "#a855f7", ok: "#22c55e", warn: "#eab308", err: "#ef4444",
  grad: "linear-gradient(135deg,#6366f1,#a855f7)", gradS: "linear-gradient(135deg,rgba(99,102,241,.08),rgba(168,85,247,.08))",
  fb: "#1877F2",
};

/* ══════════════════════════════════════
   GLOBAL CSS
   ══════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:10px}
input:focus,textarea:focus,select:focus{border-color:${T.ac}!important;outline:none;box-shadow:0 0 0 3px rgba(99,102,241,.15)}
::selection{background:rgba(99,102,241,.3)}
@keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes ni{from{opacity:0;transform:translateY(-14px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.hr:hover{background:${T.sfH}!important}
.hg:hover{box-shadow:0 0 20px rgba(99,102,241,.08)!important;border-color:${T.bdH}!important}
`;

const FNT = "'Inter', sans-serif";
const MONO = "'JetBrains Mono', monospace";

/* ══════════════════════════════════════
   STYLES (defined once)
   ══════════════════════════════════════ */
const S = {
  layout: { display: "flex", minHeight: "100vh", background: T.bg, fontFamily: FNT, color: T.tx, fontSize: 13.5 },
  main: { flex: 1, overflow: "auto", minWidth: 0 },
  ct: { padding: "24px 28px", maxWidth: 1200 },
  card: { background: T.sf, borderRadius: 14, border: `1px solid ${T.bd}`, padding: 22, marginBottom: 14, animation: "fi .3s ease" },
  cardT: { fontSize: 16, fontWeight: 700, marginBottom: 3, letterSpacing: "-.3px" },
  cardD: { fontSize: 12, color: T.txM, marginBottom: 18 },
  lbl: { display: "block", fontSize: 10.5, fontWeight: 600, color: T.txM, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".8px" },
  inp: { width: "100%", padding: "9px 13px", borderRadius: 8, border: `1px solid ${T.bd}`, background: "rgba(255,255,255,.03)", color: T.tx, fontSize: 13, fontFamily: FNT, transition: "all .2s" },
  ta: { width: "100%", padding: "9px 13px", borderRadius: 8, border: `1px solid ${T.bd}`, background: "rgba(255,255,255,.03)", color: T.tx, fontSize: 13, fontFamily: FNT, minHeight: 80, resize: "vertical" },
  sel: { width: "100%", padding: "9px 13px", borderRadius: 8, border: `1px solid ${T.bd}`, background: T.sf, color: T.tx, fontSize: 13, fontFamily: FNT, cursor: "pointer" },
  row: { display: "flex", gap: 12, flexWrap: "wrap" },
  col: (f = 1) => ({ flex: f, minWidth: 160 }),
};

function Btn({ variant = "primary", disabled, children, onClick, style }) {
  const base = {
    padding: "9px 20px", borderRadius: 8, border: variant === "ghost" ? `1px solid ${T.bd}` : "none",
    fontWeight: 600, fontSize: 12.5, fontFamily: FNT, cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex", alignItems: "center", gap: 7, transition: "all .15s",
    background: variant === "primary" ? (disabled ? "rgba(255,255,255,.05)" : T.grad) : variant === "danger" ? "rgba(239,68,68,.1)" : variant === "fb" ? T.fb : "transparent",
    color: variant === "primary" ? (disabled ? T.txD : "#fff") : variant === "danger" ? T.err : variant === "fb" ? "#fff" : T.txM,
    opacity: disabled ? 0.45 : 1,
    ...style,
  };
  return <button style={base} onClick={disabled ? undefined : onClick} disabled={disabled}>{children}</button>;
}

function Badge({ color, children }) {
  return <span style={{ display: "inline-flex", padding: "2px 9px", borderRadius: 16, fontSize: 10, fontWeight: 600, background: `${color}18`, color }}>{children}</span>;
}

function Chip({ selected, onClick, children }) {
  return (
    <span onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 11px", borderRadius: 18, fontSize: 11, fontWeight: 600,
      cursor: "pointer", transition: "all .12s", userSelect: "none",
      background: selected ? "rgba(99,102,241,.12)" : "rgba(255,255,255,.03)", color: selected ? "#818cf8" : T.txM,
      border: selected ? "1px solid rgba(99,102,241,.25)" : `1px solid ${T.bd}`,
    }}>{children}</span>
  );
}

function Dot({ status }) {
  const c = status === "active" ? T.ok : status === "disabled" ? T.err : T.warn;
  return <span style={{ width: 7, height: 7, borderRadius: "50%", display: "inline-block", marginRight: 5, background: c }} />;
}

/* ══════════════════════════════════════
   MAIN APP
   ══════════════════════════════════════ */
export default function App() {
  /* ── Core ── */
  const [pg, setPg] = useState("dashboard");
  const [sbOpen, setSbOpen] = useState(true);
  const [notif, setNotif] = useState(null);
  const notifTimer = useRef(null);

  const flash = useCallback((m, t = "success") => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    setNotif({ m, t });
    notifTimer.current = setTimeout(() => setNotif(null), 3500);
  }, []);

  /* ── API Connection ── */
  const [fbToken, setFbToken] = useState("");
  const [fbBizId, setFbBizId] = useState("");
  const [fbAppId, setFbAppId] = useState("");
  const [fbAppSecret, setFbAppSecret] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  /* ── Data ── */
  const [accounts, setAccounts] = useState([]);
  const [fbPages, setFbPages] = useState([]);
  const [accLoading, setAccLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [savedGroups, setSavedGroups] = useState([]);

  /* ── Template Editor ── */
  const [showTplEditor, setShowTplEditor] = useState(false);
  const [editTplId, setEditTplId] = useState(null);
  const [tpl, setTpl] = useState({ name: "", icon: "🎯", objective: "sales", budget: "50", audienceType: "broad", primaryText: "", headline: "", description: "", cta: "Shop Now", url: "", ageMin: 18, ageMax: 65, gender: "all", interests: [] });

  /* ── Campaign Builder ── */
  const [step, setStep] = useState(0);
  const [cName, setCName] = useState("");
  const [cObj, setCObj] = useState("");
  const [cBudget, setCBudget] = useState("50");
  const [cBudgetType, setCBudgetType] = useState("daily");
  const [cBudgetMode, setCBudgetMode] = useState("CBO");
  const [cBidStrategy, setCBidStrategy] = useState("LOWEST_COST_WITHOUT_CAP");
  const [cPageId, setCPageId] = useState("");
  const [cCountries, setCCountries] = useState(["IN"]);
  const [cUseLocation, setCUseLocation] = useState(true);
  const [cPixelMode, setCPixelMode] = useState("auto");
  const [cPixelId, setCPixelId] = useState("");
  const [cExcludedRegions, setCExcludedRegions] = useState([]);
  const [excludeSearch, setExcludeSearch] = useState("");
  const [excludeResults, setExcludeResults] = useState([]);
  const excludeDebounce = useRef(null);
  const [creatives, setCreatives] = useState([]);
  const [creativeFiles, setCreativeFiles] = useState([]);
  const [adCopy, setAdCopy] = useState({ primaryText: "", headline: "", description: "", cta: "Shop Now", url: "" });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiUrl, setAiUrl] = useState("");
  const [aiVariations, setAiVariations] = useState([]);
  const [adSets, setAdSets] = useState([{ id: 1, name: "Broad", audienceType: "broad", ageMin: 18, ageMax: 65, gender: "all", interests: [], budget: "50" }]);
  const [activeAdSet, setActiveAdSet] = useState(1);
  const [selAccounts, setSelAccounts] = useState([]);
  const [accSearch, setAccSearch] = useState("");
  const [accGroupFilter, setAccGroupFilter] = useState("all");
  const [interestQuery, setInterestQuery] = useState("");
  const [interestResults, setInterestResults] = useState([]);
  const debounceRef = useRef(null);

  /* ── Publishing ── */
  const [publishing, setPublishing] = useState(false);
  const [pubProgress, setPubProgress] = useState(0);
  const [pubResults, setPubResults] = useState(null);
  const [pubDone, setPubDone] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsResults, setWsResults] = useState([]);
  const wsRef = useRef(null);

  /* ── Analytics ── */
  const [analyticsData, setAnalyticsData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsPreset, setAnalyticsPreset] = useState("last_7d");
  const [activeSpend, setActiveSpend] = useState({ accounts: [], total: 0 });

  /* ── Groups ── */
  const [newGrpName, setNewGrpName] = useState("");
  const [showNewGrp, setShowNewGrp] = useState(false);

  const fileRef = useRef(null);

  /* ══════════════════════════════════════
     API CALLS
     ══════════════════════════════════════ */

  const fetchAccounts = useCallback(async () => {
    setAccLoading(true);
    try {
      const r = await api.get("/api/accounts");
      if (r.success) { setAccounts(r.accounts); setLastSync(new Date().toLocaleTimeString()); }
    } catch (e) { flash("Failed to load accounts: " + e.message, "error"); }
    setAccLoading(false);
  }, [flash]);

  const fetchPages = useCallback(async () => {
    try {
      const r = await api.get("/api/accounts/pages");
      if (r.success && r.pages) {
        setFbPages(r.pages);
        if (r.pages.length > 0) setCPageId(prev => prev || r.pages[0].id);
      }
    } catch (_) {}
  }, []);

  const loadTemplates = useCallback(async () => {
    try { const r = await api.get("/api/db/templates"); if (r.success) setTemplates(r.templates); } catch (_) {}
  }, []);

  const loadCampaigns = useCallback(async () => {
    try { const r = await api.get("/api/db/campaigns"); if (r.success) setCampaigns(r.campaigns); } catch (_) {}
  }, []);

  const loadGroups = useCallback(async () => {
    try { const r = await api.get("/api/db/groups"); if (r.success) setSavedGroups(r.groups); } catch (_) {}
  }, []);

  const connectApi = useCallback(async () => {
    if (!fbToken || !fbBizId) { setApiError("Token and Business ID are required"); return; }
    setApiLoading(true); setApiError("");
    api.token = fbToken; api.bizId = fbBizId;
    try {
      const status = await api.get("/api/auth/status");
      if (status.success && status.connected) {
        setApiConnected(true);
        localStorage.setItem("fb_token", fbToken);
        localStorage.setItem("fb_biz_id", fbBizId);
        if (fbAppId) localStorage.setItem("fb_app_id", fbAppId);
        if (fbAppSecret) localStorage.setItem("fb_app_secret", fbAppSecret);
        await Promise.all([fetchAccounts(), fetchPages(), loadTemplates(), loadCampaigns(), loadGroups()]);
        await api.post("/api/db/credentials", { businessId: fbBizId, appId: fbAppId, systemUserToken: fbToken, appSecret: fbAppSecret }).catch(() => {});
        flash(`Connected! ${status.accounts_count} accounts found`);
      } else {
        setApiError(status.error || "Connection failed");
        api.token = null; api.bizId = null;
      }
    } catch (e) {
      setApiError(e.message || "Connection failed");
      api.token = null; api.bizId = null;
    }
    setApiLoading(false);
  }, [fbToken, fbBizId, fbAppId, fbAppSecret, fetchAccounts, fetchPages, loadTemplates, loadCampaigns, loadGroups, flash]);

  const disconnectApi = useCallback(() => {
    api.token = null; api.bizId = null;
    setApiConnected(false); setAccounts([]); setFbPages([]);
    setFbToken(""); setFbBizId(""); setFbAppId(""); setFbAppSecret("");
    localStorage.removeItem("fb_token"); localStorage.removeItem("fb_biz_id");
    localStorage.removeItem("fb_app_id"); localStorage.removeItem("fb_app_secret");
    flash("Disconnected", "info");
  }, [flash]);

  // Auto-connect from localStorage
  useEffect(() => {
    const token = localStorage.getItem("fb_token");
    const bizId = localStorage.getItem("fb_biz_id");
    const appId = localStorage.getItem("fb_app_id");
    const appSecret = localStorage.getItem("fb_app_secret");
    if (token && bizId) {
      setFbToken(token); setFbBizId(bizId);
      if (appId) setFbAppId(appId);
      if (appSecret) setFbAppSecret(appSecret);
      api.token = token; api.bizId = bizId;
      setApiConnected(true);
      // Fetch data
      const init = async () => {
        try {
          await Promise.all([
            api.get("/api/accounts").then(r => { if (r.success) { setAccounts(r.accounts); setLastSync(new Date().toLocaleTimeString()); } }),
            api.get("/api/accounts/pages").then(r => { if (r.success && r.pages) { setFbPages(r.pages); if (r.pages.length > 0) setCPageId(r.pages[0].id); } }),
            loadTemplates(), loadCampaigns(), loadGroups(),
          ]);
        } catch (e) {
          setApiConnected(false);
          api.token = null; api.bizId = null;
        }
      };
      init();
    } else {
      // Still load templates/campaigns/groups
      loadTemplates(); loadCampaigns(); loadGroups();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // WebSocket
  useEffect(() => {
    let ws;
    let reconnectTimer;
    const connect = () => {
      try {
        const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.hostname === "localhost" ? "localhost:5001" : window.location.host;
        ws = new WebSocket(`${proto}//${host}/ws`);
        ws.onopen = () => setWsConnected(true);
        ws.onmessage = (msg) => {
          try {
            const d = JSON.parse(msg.data);
            if (d.event === "publish:account") setWsResults(p => [...p, d]);
            if (d.event === "publish:progress") setPubProgress(d.percentage);
            if (d.event === "publish:complete") { setPubDone(true); setPubProgress(100); }
          } catch (_) {}
        };
        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimer = setTimeout(connect, 5000);
        };
        ws.onerror = () => ws.close();
        wsRef.current = ws;
      } catch (_) {}
    };
    connect();
    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  // Interest search with debounce
  const searchInterests = useCallback((q) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setInterestResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await api.get(`/api/campaigns/interests?q=${encodeURIComponent(q)}`);
        if (r.success) setInterestResults(r.interests);
      } catch (_) {}
    }, 350);
  }, []);

  const generateAiCopy = useCallback(async () => {
    if (!aiUrl) { flash("Enter a landing page URL first", "error"); return; }
    setAiLoading(true); setAiVariations([]);
    try {
      const r = await api.post("/api/campaigns/generate-copy", { url: aiUrl, objective: cObj || "sales" });
      if (r.success && r.variations) {
        setAiVariations(r.variations);
        if (r.variations.length > 0) {
          const v = r.variations[0];
          setAdCopy(p => ({ ...p, primaryText: v.primaryText, headline: v.headline, description: v.description, url: aiUrl }));
        }
        flash("AI generated " + r.variations.length + " variations!");
      } else { flash(r.error || "AI generation failed", "error"); }
    } catch (e) { flash(e.message, "error"); }
    setAiLoading(false);
  }, [aiUrl, cObj, flash]);

  /* ══════════════════════════════════════
     EXCLUDE LOCATION SEARCH
     ══════════════════════════════════════ */
  const searchExcludeLocations = useCallback((q) => {
    if (excludeDebounce.current) clearTimeout(excludeDebounce.current);
    if (q.length < 2) { setExcludeResults([]); return; }
    excludeDebounce.current = setTimeout(async () => {
      try {
        const r = await api.get(`/api/accounts/geo-search?q=${encodeURIComponent(q)}&type=region`);
        if (r.success) setExcludeResults(r.locations);
      } catch (_) {}
    }, 350);
  }, []);

  /* ══════════════════════════════════════
     ANALYTICS
     ══════════════════════════════════════ */
  const fetchAnalytics = useCallback(async (preset) => {
    if (accounts.length === 0) return;
    setAnalyticsLoading(true);
    const activeIds = accounts.filter(a => a.status === "active").slice(0, 5).map(a => a.account_id || a.id.replace("act_", ""));
    if (activeIds.length === 0) { setAnalyticsLoading(false); return; }
    try {
      const [overview, daily] = await Promise.all([
        api.get(`/api/analytics/overview?account_ids=${activeIds.join(",")}&date_preset=${preset || analyticsPreset}`),
        api.get(`/api/analytics/daily?account_ids=${activeIds.join(",")}&date_preset=${preset || analyticsPreset}`),
      ]);
      if (overview.success) setAnalyticsData(overview.results);
      if (daily.success) setDailyData(daily.daily);
    } catch (_) {}
    setAnalyticsLoading(false);
  }, [accounts, analyticsPreset]);

  const fetchActiveSpend = useCallback(async () => {
    if (accounts.length === 0) return;
    const activeIds = accounts.filter(a => a.status === "active").slice(0, 20).map(a => a.account_id || a.id.replace("act_", ""));
    if (activeIds.length === 0) return;
    try {
      const r = await api.get(`/api/analytics/active-spend?account_ids=${activeIds.join(",")}`);
      if (r.success) setActiveSpend({ accounts: r.accounts, total: r.total_spend_today });
    } catch (_) {}
  }, [accounts]);

  /* ══════════════════════════════════════
     CAMPAIGN BUILDER LOGIC
     ══════════════════════════════════════ */
  const curAdSet = adSets.find(a => a.id === activeAdSet) || adSets[0];
  const updateAdSet = (field, value) => setAdSets(prev => prev.map(a => a.id === activeAdSet ? { ...a, [field]: value } : a));

  const addAdSet = () => {
    const nid = Math.max(...adSets.map(a => a.id)) + 1;
    setAdSets(prev => [...prev, { id: nid, name: `Ad Set ${nid}`, audienceType: "broad", ageMin: 18, ageMax: 65, gender: "all", interests: [], budget: cBudget }]);
    setActiveAdSet(nid);
  };

  const removeAdSet = (id) => {
    if (adSets.length <= 1) return;
    const remaining = adSets.filter(a => a.id !== id);
    setAdSets(remaining);
    if (activeAdSet === id) setActiveAdSet(remaining[0].id);
  };

  const handleFileUpload = useCallback((e) => {
    const files = Array.from(e.target?.files || e.dataTransfer?.files || []);
    if (files.length === 0) return;
    // Validate file sizes
    const maxSize = 100 * 1024 * 1024; // 100MB
    const validFiles = files.filter(f => {
      if (f.size > maxSize) { flash(`${f.name} is too large (max 100MB)`, "error"); return false; }
      return true;
    });
    setCreativeFiles(p => [...p, ...validFiles]);
    validFiles.forEach(f => {
      const r = new FileReader();
      r.onload = (ev) => setCreatives(p => [...p, {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
        name: f.name,
        type: f.type.startsWith("video") ? "video" : "image",
        preview: ev.target.result,
        size: (f.size / 1024 / 1024).toFixed(1) + " MB",
      }]);
      r.readAsDataURL(f);
    });
    // Reset file input
    if (e.target) e.target.value = "";
  }, [flash]);

  const removeCreative = useCallback((creativeId) => {
    const idx = creatives.findIndex(x => x.id === creativeId);
    setCreatives(p => p.filter(x => x.id !== creativeId));
    if (idx >= 0) setCreativeFiles(p => p.filter((_, i) => i !== idx));
  }, [creatives]);

  const resetCampaign = () => {
    setStep(0); setCName(""); setCObj(""); setCBudget("50"); setCreatives([]); setCreativeFiles([]);
    setAdCopy({ primaryText: "", headline: "", description: "", cta: "Shop Now", url: "" });
    setAdSets([{ id: 1, name: "Broad", audienceType: "broad", ageMin: 18, ageMax: 65, gender: "all", interests: [], budget: "50" }]);
    setActiveAdSet(1); setSelAccounts([]); setCBudgetMode("CBO");
    setCCountries(["IN"]); setCUseLocation(true); setCPixelMode("auto"); setCPixelId("");
    setCExcludedRegions([]); setExcludeSearch(""); setExcludeResults([]);
    setPublishing(false); setPubDone(false); setPubProgress(0); setPubResults(null); setWsResults([]);
    setAiVariations([]); setAiUrl("");
  };

  const applyTemplate = (t) => {
    setCName((t.name || "") + " - " + new Date().toLocaleDateString());
    setCObj(t.objective || "sales"); setCBudget(t.budget || "50");
    setAdCopy({ primaryText: t.primaryText || "", headline: t.headline || "", description: t.description || "", cta: t.cta || "Shop Now", url: t.url || "" });
    setAdSets([{ id: 1, name: t.audienceType === "broad" ? "Broad" : "Detailed", audienceType: t.audienceType || "broad", ageMin: t.ageMin || 18, ageMax: t.ageMax || 65, gender: t.gender || "all", interests: t.interests || [], budget: t.budget || "50" }]);
    setActiveAdSet(1);
    flash(`Template "${t.name}" applied!`);
  };

  const saveTemplate = async () => {
    if (!tpl.name || !tpl.primaryText || !tpl.headline) { flash("Name, text, and headline required", "error"); return; }
    try {
      if (editTplId) { await api.put(`/api/db/templates/${editTplId}`, tpl); }
      else { await api.post("/api/db/templates", tpl); }
      await loadTemplates();
      setShowTplEditor(false);
      flash(editTplId ? "Template updated" : "Template created!");
    } catch (e) { flash("Save failed: " + e.message, "error"); }
  };

  const saveGroup = async () => {
    if (!newGrpName || selAccounts.length === 0) return;
    try {
      await api.post("/api/db/groups", { name: newGrpName, accountIds: selAccounts });
      await loadGroups();
      setNewGrpName(""); setShowNewGrp(false);
      flash(`Group "${newGrpName}" saved!`);
    } catch (e) { flash("Save failed: " + e.message, "error"); }
  };

  /* ── PUBLISH ── */
  const handlePublish = async () => {
    setPublishing(true); setPubProgress(5); setPubResults(null); setPubDone(false); setWsResults([]);

    // Build targeting per ad set
    const adSetsForApi = adSets.map(as => {
      const targeting = {};

      // Location — REQUIRED by Facebook. Always send at least one country.
      targeting.geo_locations = { countries: cCountries.length > 0 ? cCountries : ["IN"] };

      // Excluded locations
      if (cExcludedRegions.length > 0) {
        targeting.excluded_geo_locations = { regions: cExcludedRegions.map(r => ({ key: r.key })) };
      }

      if (as.audienceType !== "broad") {
        targeting.age_min = as.ageMin;
        targeting.age_max = as.ageMax;
        if (as.gender !== "all") targeting.genders = as.gender === "male" ? [1] : [2];
        if (as.interests?.length > 0) targeting.interests = as.interests.map(i => ({ id: i.id, name: i.name }));
      }

      return {
        name: as.name,
        audience_type: as.audienceType,
        targeting,
        budget: parseFloat(as.budget || cBudget),
      };
    });

    // Each file = one ad variation
    const adVariations = creativeFiles.map((f, i) => ({
      primary_text: adCopy.primaryText,
      headline: adCopy.headline,
      description: adCopy.description,
      cta: adCopy.cta,
      url: adCopy.url,
      creative_index: i,
    }));

    const config = {
      name: cName, objective: cObj, budget: parseFloat(cBudget), budget_type: cBudgetType,
      budget_mode: cBudgetMode, bid_strategy: cBidStrategy, publish_status: "PAUSED", page_id: cPageId,
      account_ids: selAccounts, ad_sets: adSetsForApi, ad_variations: adVariations,
      pixel_id: cPixelMode === "specific" && cPixelId ? cPixelId : undefined,
    };

    try {
      setPubProgress(15);
      const formData = new FormData();
      creativeFiles.forEach(f => formData.append("creatives", f));
      formData.append("config", JSON.stringify(config));

      const result = await api.postForm("/api/campaigns/publish", formData);
      setPubProgress(100); setPubResults(result); setPubDone(true);

      // Save to history
      await api.post("/api/db/campaigns", {
        name: cName, objective: cObj, status: result.summary?.failed === 0 ? "published" : "partial",
        budget: parseFloat(cBudget), budgetType: cBudgetType, budgetMode: cBudgetMode,
        accountIds: selAccounts, accountCount: selAccounts.length,
        successCount: result.summary?.successful || 0, failCount: result.summary?.failed || 0,
        publishResults: result.results, publishedAt: new Date(),
      }).catch(() => {});

      await loadCampaigns();
      flash(`Published! ${result.summary?.successful || 0} success, ${result.summary?.failed || 0} failed`);
    } catch (e) {
      setPubDone(true);
      setPubResults({ success: false, error: e.message });
      flash("Publish failed: " + e.message, "error");
    }
    setPublishing(false);
  };

  /* ── Computed ── */
  const accGroups = useMemo(() => [...new Set(accounts.map(a => a.business_name || "Default"))], [accounts]);
  const filteredAccs = useMemo(() => accounts.filter(a => {
    const ms = a.name.toLowerCase().includes(accSearch.toLowerCase()) || a.id.includes(accSearch);
    const mg = accGroupFilter === "all" || (a.business_name || "Default") === accGroupFilter;
    return ms && mg;
  }), [accounts, accSearch, accGroupFilter]);

  const toggleAcc = (id) => setSelAccounts(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const selectAllFilteredAccs = () => {
    const allSelected = filteredAccs.every(a => selAccounts.includes(a.id));
    if (allSelected) setSelAccounts(p => p.filter(id => !filteredAccs.find(a => a.id === id)));
    else setSelAccounts(p => [...new Set([...p, ...filteredAccs.map(a => a.id)])]);
  };

  const totalDaily = useMemo(() => {
    if (cBudgetMode === "ABO") {
      return adSets.reduce((sum, as) => sum + parseFloat(as.budget || 0), 0) * selAccounts.length;
    }
    return parseFloat(cBudget || 0) * selAccounts.length;
  }, [cBudgetMode, cBudget, adSets, selAccounts]);

  const steps = ["Campaign", "Creatives", "Ad Copy", "Ad Sets", "Accounts", "Review"];
  const canNext = () => {
    if (step === 0) return cName && cObj && cPageId;
    if (step === 1) return creativeFiles.length > 0;
    if (step === 2) return adCopy.primaryText && adCopy.headline && adCopy.url;
    if (step === 3) return adSets.length > 0;
    if (step === 4) return selAccounts.length > 0;
    return true;
  };

  /* ══════════════════════════════════════
     NAV CONFIG
     ══════════════════════════════════════ */
  const navItems = [
    { id: "dashboard", icon: "dashboard", label: "Dashboard" },
    { id: "create", icon: "plus", label: "Create Campaign" },
    { id: "campaigns", icon: "list", label: "Campaigns" },
    { id: "templates", icon: "grid", label: "Templates" },
    { id: "accounts", icon: "users", label: "Ad Accounts" },
    { id: "analytics", icon: "chart", label: "Analytics" },
    { id: "settings", icon: "gear", label: "Settings" },
  ];

  const titles = { dashboard: "Dashboard", create: "Create Campaign", campaigns: "All Campaigns", templates: "Templates", accounts: "Ad Accounts", analytics: "Analytics", settings: "API Settings" };

  /* ══════════════════════════════════════
     RENDER: DASHBOARD
     ══════════════════════════════════════ */
  const renderDashboard = () => (
    <div style={S.ct}>
      {!apiConnected && (
        <div style={{ padding: "14px 18px", borderRadius: 10, background: "rgba(234,179,8,.04)", border: "1px solid rgba(234,179,8,.15)", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13, color: T.warn }}>Facebook API Not Connected</div><div style={{ fontSize: 12, color: T.txM }}>Go to Settings to connect your System User token</div></div>
          <Btn variant="ghost" onClick={() => setPg("settings")}><Ic t="gear" sz={13} /> Connect</Btn>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(165px,1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { l: "Ad Accounts", v: accounts.length || "—", c: T.ac, ic: "users" },
          { l: "Active", v: accounts.filter(a => a.status === "active").length || "—", c: T.ok, ic: "check" },
          { l: "Campaigns", v: campaigns.length, c: T.ac2, ic: "list" },
          { l: "Templates", v: templates.length, c: T.warn, ic: "grid" },
          { l: "WebSocket", v: wsConnected ? "Live" : "Off", c: wsConnected ? T.ok : T.err, ic: "ws" },
        ].map((k, i) => (
          <div key={i} style={{ ...S.card, padding: 16, marginBottom: 0, animation: `fi .3s ease ${i * .05}s both` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: T.txM, textTransform: "uppercase", letterSpacing: ".6px", fontWeight: 600 }}>{k.l}</span>
              <span style={{ color: T.txD }}><Ic t={k.ic} sz={14} /></span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-1px", color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { icon: "plus", t: "New Campaign", d: "Build from scratch", act: () => { resetCampaign(); setPg("create"); } },
          { icon: "grid", t: "Templates", d: `${templates.length} ready to use`, act: () => setPg("templates") },
          { icon: "gear", t: apiConnected ? "API Connected" : "Connect API", d: apiConnected ? `${accounts.length} accounts` : "Add your token", act: () => setPg("settings") },
          { icon: "chart", t: "Analytics", d: "View performance", act: () => setPg("analytics") },
        ].map((q, i) => (
          <div key={i} className="hg" style={{ ...S.card, marginBottom: 0, cursor: "pointer", animation: `fi .3s ease ${i * .06}s both` }} onClick={q.act}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: T.gradS, display: "flex", alignItems: "center", justifyContent: "center", color: T.ac }}><Ic t={q.icon} /></div>
              <div><div style={{ fontWeight: 700, fontSize: 13 }}>{q.t}</div><div style={{ fontSize: 11.5, color: T.txM }}>{q.d}</div></div>
            </div>
          </div>
        ))}
      </div>

      {campaigns.length > 0 && (
        <div style={S.card}>
          <div style={S.cardT}>Recent Campaigns</div>
          <div style={{ marginTop: 12 }}>
            {campaigns.slice(0, 5).map((c, i) => (
              <div key={c.id || i} className="hr" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 8, fontSize: 12.5 }}>
                <div><div style={{ fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: 10.5, color: T.txD }}>{c.objective} · {c.budgetMode || "CBO"} · {c.accountCount} accounts</div></div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge color={T.ok}>{c.successCount} ok</Badge>
                  {c.failCount > 0 && <Badge color={T.err}>{c.failCount} fail</Badge>}
                  <Dot status={c.status === "published" ? "active" : "paused"} />
                  <span style={{ fontSize: 11, color: T.txM }}>{c.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  /* ══════════════════════════════════════
     RENDER: SETTINGS
     ══════════════════════════════════════ */
  const renderSettings = () => (
    <div style={S.ct}>
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(24,119,242,.1)", display: "flex", alignItems: "center", justifyContent: "center", color: T.fb }}><Ic t="fb" sz={22} /></div>
          <div style={{ flex: 1 }}><div style={S.cardT}>Facebook Marketing API</div><div style={{ fontSize: 12, color: T.txM }}>Connect via System User Access Token</div></div>
          {apiConnected && <Badge color={T.ok}>Connected</Badge>}
        </div>
      </div>

      {apiConnected && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(165px,1fr))", gap: 10, marginBottom: 14 }}>
          {[{ l: "Accounts", v: accounts.length, c: T.ac }, { l: "Active", v: accounts.filter(a => a.status === "active").length, c: T.ok }, { l: "Pages", v: fbPages.length, c: T.ac2 }, { l: "Last Sync", v: lastSync || "—", c: T.warn }].map((s2, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,.02)", borderRadius: 10, border: `1px solid ${T.bd}`, padding: 14 }}>
              <div style={{ fontSize: 10, color: T.txM, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4, fontWeight: 600 }}>{s2.l}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s2.c, letterSpacing: "-1px" }}>{s2.v}</div>
            </div>
          ))}
        </div>
      )}

      <div style={S.card}>
        <div style={{ padding: 14, background: "rgba(99,102,241,.04)", borderRadius: 10, border: "1px solid rgba(99,102,241,.1)", marginBottom: 18, fontSize: 12, color: "rgba(255,255,255,.5)", lineHeight: 1.8 }}>
          <div style={{ fontWeight: 700, color: T.ac, marginBottom: 4, fontSize: 13 }}>Setup Steps:</div>
          <div><b>1.</b> Go to business.facebook.com → Settings → System Users</div>
          <div><b>2.</b> Create System User (Admin) → Generate Token with <code style={{ color: T.ac2, fontFamily: MONO, fontSize: 11 }}>ads_management, ads_read, business_management</code></div>
          <div><b>3.</b> Copy Business ID from Business Settings → Business Info</div>
          <div><b>4.</b> Assign all ad accounts to the System User</div>
        </div>

        <div style={{ ...S.row, marginBottom: 14 }}>
          <div style={S.col()}><label style={S.lbl}>Business ID *</label><input style={{ ...S.inp, fontFamily: MONO }} value={fbBizId} onChange={e => setFbBizId(e.target.value)} placeholder="1234567890" disabled={apiConnected} /></div>
          <div style={S.col()}><label style={S.lbl}>App ID (optional)</label><input style={{ ...S.inp, fontFamily: MONO }} value={fbAppId} onChange={e => setFbAppId(e.target.value)} placeholder="9876543210" disabled={apiConnected} /></div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={S.lbl}>System User Access Token *</label>
          <div style={{ position: "relative" }}>
            <input type={showToken ? "text" : "password"} style={{ ...S.inp, fontFamily: MONO, paddingRight: 40 }} value={fbToken} onChange={e => setFbToken(e.target.value)} placeholder="EAAxxxxxxx..." disabled={apiConnected} />
            <button style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.txM, cursor: "pointer" }} onClick={() => setShowToken(!showToken)}><Ic t={showToken ? "eyeOff" : "eye"} sz={14} /></button>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={S.lbl}>App Secret (optional)</label>
          <div style={{ position: "relative" }}>
            <input type={showSecret ? "text" : "password"} style={{ ...S.inp, fontFamily: MONO, paddingRight: 40 }} value={fbAppSecret} onChange={e => setFbAppSecret(e.target.value)} placeholder="Secret..." disabled={apiConnected} />
            <button style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.txM, cursor: "pointer" }} onClick={() => setShowSecret(!showSecret)}><Ic t={showSecret ? "eyeOff" : "eye"} sz={14} /></button>
          </div>
        </div>
        {apiError && <div style={{ padding: 10, borderRadius: 8, background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.15)", color: T.err, fontSize: 12, marginBottom: 14 }}>{apiError}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          {!apiConnected ? (
            <Btn variant="fb" onClick={connectApi} disabled={apiLoading}>
              {apiLoading ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⚙️</span> Connecting...</> : <><Ic t="fb" sz={14} /> Connect Facebook API</>}
            </Btn>
          ) : (
            <>
              <Btn variant="ghost" onClick={fetchAccounts} disabled={accLoading}><Ic t="refresh" sz={13} /> {accLoading ? "Syncing..." : "Refresh"}</Btn>
              <Btn variant="danger" onClick={disconnectApi}><Ic t="x" sz={13} /> Disconnect</Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════
     RENDER: CREATE CAMPAIGN (6 steps)
     ══════════════════════════════════════ */
  const renderCreate = () => {
    const stepContent = [
      // Step 0: Setup
      () => (
        <div style={S.card}>
          <div style={S.cardT}>Campaign Setup</div>
          <div style={S.cardD}>Name, objective, budget, page, and optional location targeting</div>

          <div style={{ marginBottom: 16 }}><label style={S.lbl}>Campaign Name</label><input style={S.inp} value={cName} onChange={e => setCName(e.target.value)} placeholder="e.g. Summer Sale 2026" /></div>

          <label style={S.lbl}>Objective</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 7, marginBottom: 16 }}>
            {OBJECTIVES.map(o => (
              <div key={o.id} className="hg" style={{ padding: "12px 10px", borderRadius: 10, cursor: "pointer", textAlign: "center", background: cObj === o.id ? "rgba(99,102,241,.1)" : "rgba(255,255,255,.015)", border: cObj === o.id ? "1.5px solid rgba(99,102,241,.35)" : `1.5px solid ${T.bd}`, transition: "all .15s" }} onClick={() => setCObj(o.id)}>
                <div style={{ marginBottom: 3, color: cObj === o.id ? T.ac : T.txM }}><Ic t={o.icon} sz={20} /></div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: cObj === o.id ? T.tx : T.txM }}>{o.label}</div>
                <div style={{ fontSize: 9.5, color: T.txD, marginTop: 2 }}>{o.desc}</div>
              </div>
            ))}
          </div>

          <div style={S.row}>
            <div style={S.col()}>
              <label style={S.lbl}>Facebook Page *</label>
              <select style={S.sel} value={cPageId} onChange={e => setCPageId(e.target.value)}>
                <option value="">Select page...</option>
                {fbPages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                {fbPages.length === 0 && <option disabled>Connect API to load pages</option>}
              </select>
            </div>
            <div style={S.col()}>
              <label style={S.lbl}>Budget ($)</label>
              <input style={S.inp} type="number" min="1" value={cBudget} onChange={e => setCBudget(e.target.value)} />
            </div>
            <div style={S.col()}>
              <label style={S.lbl}>Bid Strategy</label>
              <select style={S.sel} value={cBidStrategy} onChange={e => setCBidStrategy(e.target.value)}>
                <option value="LOWEST_COST_WITHOUT_CAP">Lowest Cost</option>
                <option value="COST_CAP">Cost Cap</option>
                <option value="BID_CAP">Bid Cap</option>
                <option value="MINIMUM_ROAS">Min ROAS</option>
              </select>
            </div>
          </div>

          {/* Location — REQUIRED by Facebook */}
          <div style={{ borderTop: `1px solid ${T.bd}`, paddingTop: 16, marginTop: 16 }}>
            <label style={S.lbl}>Target Location *</label>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
              {COUNTRIES.slice(0, 10).map(c => (
                <Chip key={c.code} selected={cCountries.includes(c.code)} onClick={() => {
                  setCCountries(p => {
                    const has = p.includes(c.code);
                    if (has && p.length <= 1) return p; // Keep at least one country
                    return has ? p.filter(x => x !== c.code) : [...p, c.code];
                  });
                }}>
                  {c.name}
                </Chip>
              ))}
            </div>
            <select style={{ ...S.sel, marginBottom: 8 }} onChange={e => { if (e.target.value && !cCountries.includes(e.target.value)) setCCountries(p => [...p, e.target.value]); e.target.value = ""; }} value="">
              <option value="">Add more countries...</option>
              {COUNTRIES.filter(c => !cCountries.includes(c.code)).map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
            </select>
            {cCountries.length > 0 && (
              <div style={{ padding: 10, background: "rgba(99,102,241,.04)", borderRadius: 8, border: "1px solid rgba(99,102,241,.1)", fontSize: 12, color: T.ac }}>
                Targeting: <b>{cCountries.map(c => COUNTRIES.find(x => x.code === c)?.name || c).join(", ")}</b>
                {cCountries.length > 1 && <span style={{ cursor: "pointer", marginLeft: 8, color: T.err, fontSize: 11 }} onClick={() => setCCountries(["IN"])}>Reset</span>}
              </div>
            )}
          </div>

          {/* Exclude Locations */}
          <div style={{ borderTop: `1px solid ${T.bd}`, paddingTop: 16, marginTop: 16 }}>
            <label style={S.lbl}>Exclude Locations (Optional)</label>
            <div style={{ fontSize: 11.5, color: T.txM, marginBottom: 8 }}>Exclude specific regions/states from targeting (e.g. high-RTO areas)</div>
            <input style={S.inp} value={excludeSearch} onChange={e => { setExcludeSearch(e.target.value); searchExcludeLocations(e.target.value); }} placeholder="Search regions to exclude (e.g. Jammu, Kashmir, Northeast)..." />
            {excludeResults.length > 0 && (
              <div style={{ marginTop: 6, padding: 8, background: "rgba(255,255,255,.02)", borderRadius: 8, border: `1px solid ${T.bd}`, maxHeight: 160, overflowY: "auto" }}>
                {excludeResults.map(l => (
                  <div key={l.key} className="hr" style={{ padding: "7px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12, display: "flex", justifyContent: "space-between" }}
                    onClick={() => {
                      if (!cExcludedRegions.some(r => r.key === l.key)) {
                        setCExcludedRegions(p => [...p, l]);
                      }
                      setExcludeResults([]); setExcludeSearch("");
                    }}>
                    <span>{l.name}</span>
                    <span style={{ fontSize: 10, color: T.txD }}>{l.country_name} ({l.type})</span>
                  </div>
                ))}
              </div>
            )}
            {cExcludedRegions.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                {cExcludedRegions.map(r => (
                  <Chip key={r.key} selected onClick={() => setCExcludedRegions(p => p.filter(x => x.key !== r.key))}>
                    {r.name} ({r.country_code}) x
                  </Chip>
                ))}
                <span style={{ cursor: "pointer", fontSize: 11, color: T.err, padding: "5px 8px" }} onClick={() => setCExcludedRegions([])}>Clear all</span>
              </div>
            )}
            {/* Quick presets for India */}
            {cCountries.includes("IN") && cExcludedRegions.length === 0 && (
              <div style={{ marginTop: 8 }}>
                <Btn variant="ghost" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => {
                  setCExcludedRegions([
                    { key: "1732", name: "Jammu and Kashmir", country_code: "IN", type: "region" },
                    { key: "1738", name: "Manipur", country_code: "IN", type: "region" },
                    { key: "1739", name: "Meghalaya", country_code: "IN", type: "region" },
                    { key: "1740", name: "Mizoram", country_code: "IN", type: "region" },
                    { key: "1741", name: "Nagaland", country_code: "IN", type: "region" },
                    { key: "1746", name: "Tripura", country_code: "IN", type: "region" },
                    { key: "1722", name: "Arunachal Pradesh", country_code: "IN", type: "region" },
                  ]);
                  flash("Excluded high-RTO regions (J&K + Northeast)");
                }}>
                  Exclude High-RTO India Regions (J&K + Northeast)
                </Btn>
              </div>
            )}
          </div>

          {/* Pixel — only for conversion-based objectives */}
          {["conversions", "sales", "leads"].includes(cObj) && (
            <div style={{ borderTop: `1px solid ${T.bd}`, paddingTop: 16, marginTop: 16 }}>
              <label style={S.lbl}>Conversion Pixel</label>
              <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
                {["auto", "specific"].map(m => (
                  <div key={m} className="hg" style={{ flex: 1, padding: "10px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: cPixelMode === m ? `1.5px solid ${T.ac}` : `1px solid ${T.bd}`, background: cPixelMode === m ? "rgba(99,102,241,.08)" : "rgba(255,255,255,.02)", color: cPixelMode === m ? T.ac : T.txM, textAlign: "center", transition: "all .15s" }} onClick={() => { setCPixelMode(m); if (m === "auto") setCPixelId(""); }}>
                    {m === "auto" ? "Auto-detect per account" : "Specific pixel ID"}
                  </div>
                ))}
              </div>
              {cPixelMode === "auto" && (
                <div style={{ padding: 10, background: "rgba(99,102,241,.04)", borderRadius: 8, border: "1px solid rgba(99,102,241,.1)", fontSize: 12, color: T.txM }}>
                  <b style={{ color: T.ac }}>Auto mode:</b> The system fetches the first pixel from each ad account. If no pixel found, falls back to link clicks optimization.
                </div>
              )}
              {cPixelMode === "specific" && (
                <div>
                  <input style={{ ...S.inp, fontFamily: MONO }} value={cPixelId} onChange={e => setCPixelId(e.target.value)} placeholder="Enter Pixel ID (e.g. 817841624449303)" />
                </div>
              )}
            </div>
          )}
        </div>
      ),

      // Step 1: Creatives
      () => (
        <div style={S.card}>
          <div style={S.cardT}>Upload Creatives</div>
          <div style={S.cardD}>Images and videos — each file becomes one ad in every ad set</div>
          <div style={{ border: `2px dashed ${T.bd}`, borderRadius: 12, padding: "32px 16px", textAlign: "center", cursor: "pointer", background: "rgba(255,255,255,.01)", transition: "border-color .2s" }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = T.ac; }}
            onDragLeave={e => { e.currentTarget.style.borderColor = T.bd; }}
            onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = T.bd; handleFileUpload(e); }}>
            <Ic t="upload" sz={32} /><div style={{ marginTop: 8, fontSize: 13, fontWeight: 600 }}>Drag & drop or click to upload</div>
            <div style={{ fontSize: 11.5, color: T.txD, marginTop: 3 }}>PNG, JPG, MP4, MOV — Max 100MB per file</div>
            <input ref={fileRef} type="file" multiple accept="image/*,video/*" style={{ display: "none" }} onChange={handleFileUpload} />
          </div>
          {creatives.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 8, marginTop: 12 }}>
              {creatives.map(c => (
                <div key={c.id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "1", background: "rgba(255,255,255,.02)", border: `1px solid ${T.bd}` }}>
                  {c.type === "image" ? <img src={c.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <video src={c.preview} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "4px 6px", background: "rgba(0,0,0,.7)", fontSize: 9.5, color: "#fff" }}>
                    {c.type === "video" ? "🎬" : "🖼"} {c.size}
                  </div>
                  <button style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,.8)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}
                    onClick={() => removeCreative(c.id)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ),

      // Step 2: Ad Copy + AI
      () => (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={S.cardT}>Ad Copy</div>
            <Badge color={T.ac2}>AI Powered</Badge>
          </div>
          <div style={S.cardD}>Write copy or let AI generate it from your landing page</div>

          {/* AI Section */}
          <div style={{ padding: 16, background: "linear-gradient(135deg,rgba(168,85,247,.06),rgba(99,102,241,.06))", borderRadius: 12, border: "1px solid rgba(168,85,247,.12)", marginBottom: 18 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ac2, marginBottom: 6 }}>AI Ad Copy Generator</div>
            <div style={{ fontSize: 12, color: T.txM, marginBottom: 10 }}>Paste your URL — AI analyzes the page and writes scroll-stopping ad copy</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...S.inp, flex: 1 }} value={aiUrl} onChange={e => setAiUrl(e.target.value)} placeholder="https://yoursite.com/product" />
              <Btn onClick={generateAiCopy} disabled={aiLoading} style={{ whiteSpace: "nowrap" }}>
                {aiLoading ? "Generating..." : "Generate Copy"}
              </Btn>
            </div>
          </div>

          {aiVariations.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <label style={S.lbl}>AI Variations — Click to apply</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {aiVariations.map((v, i) => (
                  <div key={i} className="hr" style={{ padding: 14, borderRadius: 10, border: adCopy.primaryText === v.primaryText ? `1.5px solid ${T.ac}` : `1px solid ${T.bd}`, background: adCopy.primaryText === v.primaryText ? "rgba(99,102,241,.05)" : "rgba(255,255,255,.02)", cursor: "pointer", transition: "all .15s" }}
                    onClick={() => setAdCopy(p => ({ ...p, primaryText: v.primaryText, headline: v.headline, description: v.description }))}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.ac2 }}>Variation {String.fromCharCode(65 + i)}</span>
                      {adCopy.primaryText === v.primaryText && <Badge color={T.ac}>Active</Badge>}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 4 }}>{v.primaryText}</div>
                    <div style={{ fontSize: 11.5, color: T.txM }}>Headline: <b style={{ color: T.tx }}>{v.headline}</b></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 14 }}><label style={S.lbl}>Primary Text *</label><textarea style={S.ta} value={adCopy.primaryText} onChange={e => setAdCopy(p => ({ ...p, primaryText: e.target.value }))} placeholder="Your ad copy text..." /></div>
          <div style={{ ...S.row, marginBottom: 14 }}>
            <div style={S.col()}><label style={S.lbl}>Headline *</label><input style={S.inp} value={adCopy.headline} onChange={e => setAdCopy(p => ({ ...p, headline: e.target.value }))} placeholder="Short punchy headline" /></div>
            <div style={S.col()}><label style={S.lbl}>Description</label><input style={S.inp} value={adCopy.description} onChange={e => setAdCopy(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" /></div>
          </div>
          <div style={S.row}>
            <div style={S.col()}><label style={S.lbl}>CTA Button</label><select style={S.sel} value={adCopy.cta} onChange={e => setAdCopy(p => ({ ...p, cta: e.target.value }))}>{CTA_OPTIONS.map(c => <option key={c}>{c}</option>)}</select></div>
            <div style={S.col()}><label style={S.lbl}>Website URL *</label><input style={S.inp} value={adCopy.url} onChange={e => setAdCopy(p => ({ ...p, url: e.target.value }))} placeholder="https://yoursite.com" /></div>
          </div>

          {/* Ad Preview */}
          {(adCopy.primaryText || adCopy.headline) && (
            <div style={{ marginTop: 18 }}>
              <label style={S.lbl}>Ad Preview</label>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {/* Facebook Feed Preview */}
                <div style={{ flex: "1 1 300px", maxWidth: 380, background: "#1c1c1c", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.fb, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                      {(fbPages.find(p => p.id === cPageId)?.name || "Page").charAt(0)}
                    </div>
                    <div><div style={{ fontSize: 12, fontWeight: 600, color: "#e4e6eb" }}>{fbPages.find(p => p.id === cPageId)?.name || "Your Page"}</div><div style={{ fontSize: 10, color: "#b0b3b8" }}>Sponsored</div></div>
                  </div>
                  <div style={{ padding: "0 12px 8px", fontSize: 13, color: "#e4e6eb", lineHeight: 1.5 }}>{adCopy.primaryText || "Your ad text here..."}</div>
                  {creatives.length > 0 && (
                    <div style={{ width: "100%", aspectRatio: "1.91/1", background: "#2d2d2d", overflow: "hidden" }}>
                      {creatives[0].type === "image" ? <img src={creatives[0].preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <video src={creatives[0].preview} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    </div>
                  )}
                  {!creatives.length && <div style={{ width: "100%", aspectRatio: "1.91/1", background: "#2d2d2d", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontSize: 12 }}>Your creative here</div>}
                  <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,.05)" }}>
                    <div style={{ fontSize: 10, color: "#b0b3b8", marginBottom: 2 }}>{adCopy.url ? new URL(adCopy.url).hostname : "yoursite.com"}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div><div style={{ fontSize: 13, fontWeight: 600, color: "#e4e6eb" }}>{adCopy.headline || "Your Headline"}</div>{adCopy.description && <div style={{ fontSize: 11, color: "#b0b3b8" }}>{adCopy.description}</div>}</div>
                      <div style={{ padding: "6px 14px", borderRadius: 6, background: "#e4e6eb", color: "#050505", fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap" }}>{adCopy.cta || "Learn More"}</div>
                    </div>
                  </div>
                </div>

                {/* Instagram Feed Preview */}
                <div style={{ flex: "1 1 260px", maxWidth: 320, background: "#000", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700 }}>
                      {(fbPages.find(p => p.id === cPageId)?.name || "P").charAt(0)}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{(fbPages.find(p => p.id === cPageId)?.name || "page").toLowerCase().replace(/\s+/g, "")}</div>
                    <span style={{ fontSize: 10, color: "#a8a8a8", marginLeft: 4 }}>Sponsored</span>
                  </div>
                  {creatives.length > 0 ? (
                    <div style={{ width: "100%", aspectRatio: "1", overflow: "hidden" }}>
                      {creatives[0].type === "image" ? <img src={creatives[0].preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <video src={creatives[0].preview} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    </div>
                  ) : <div style={{ width: "100%", aspectRatio: "1", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#444", fontSize: 11 }}>Creative</div>}
                  <div style={{ padding: "8px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{adCopy.headline || "Headline"}</span>
                      <span style={{ padding: "4px 12px", borderRadius: 4, border: "1px solid #fff", color: "#fff", fontSize: 10, fontWeight: 600 }}>{adCopy.cta || "Learn More"}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#e4e6eb", lineHeight: 1.4 }}>
                      <b style={{ color: "#fff" }}>{(fbPages.find(p => p.id === cPageId)?.name || "page").toLowerCase().replace(/\s+/g, "")}</b>{" "}{(adCopy.primaryText || "").slice(0, 100)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ),

      // Step 3: Ad Sets
      () => (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={S.cardT}>Ad Sets <Badge color={T.ac}>{adSets.length}</Badge></div>
            <Btn variant="ghost" onClick={addAdSet}><Ic t="plus" sz={12} /> Add Ad Set</Btn>
          </div>
          <div style={S.cardD}>Each ad set gets its own targeting. All creatives go into every set.</div>

          {/* Budget Mode */}
          <div style={{ ...S.row, marginBottom: 16 }}>
            <div style={S.col()}>
              <label style={S.lbl}>Budget Mode</label>
              <div style={{ display: "flex", gap: 7 }}>
                {["CBO", "ABO"].map(m => (
                  <Btn key={m} variant={cBudgetMode === m ? "primary" : "ghost"} onClick={() => setCBudgetMode(m)} style={{ flex: 1, justifyContent: "center" }}>
                    {m === "CBO" ? "CBO (Campaign)" : "ABO (Per Ad Set)"}
                  </Btn>
                ))}
              </div>
            </div>
            {cBudgetMode === "CBO" && <div style={S.col()}><label style={S.lbl}>Campaign Budget ($)</label><input style={S.inp} type="number" min="1" value={cBudget} onChange={e => setCBudget(e.target.value)} /></div>}
          </div>

          {/* Ad Set Tabs */}
          <div style={{ display: "flex", gap: 2, borderBottom: `1px solid ${T.bd}`, marginBottom: 16, flexWrap: "wrap" }}>
            {adSets.map(as => (
              <div key={as.id} style={{ padding: "8px 16px", borderRadius: "8px 8px 0 0", fontSize: 12, fontWeight: 600, cursor: "pointer", background: activeAdSet === as.id ? T.sf : "transparent", color: activeAdSet === as.id ? T.tx : T.txM, border: activeAdSet === as.id ? `1px solid ${T.bd}` : "1px solid transparent", borderBottom: activeAdSet === as.id ? `1px solid ${T.sf}` : "none", marginBottom: -1, display: "flex", alignItems: "center", gap: 7 }} onClick={() => setActiveAdSet(as.id)}>
                {as.name || "Ad Set"}
                {adSets.length > 1 && <span style={{ cursor: "pointer", color: T.txD, fontSize: 15, lineHeight: 1 }} onClick={e => { e.stopPropagation(); removeAdSet(as.id); }}>×</span>}
              </div>
            ))}
          </div>

          {/* Active Ad Set */}
          <div style={{ ...S.row, marginBottom: 14 }}>
            <div style={S.col(2)}><label style={S.lbl}>Ad Set Name</label><input style={S.inp} value={curAdSet.name} onChange={e => updateAdSet("name", e.target.value)} placeholder="e.g. Broad, Interest - Fitness" /></div>
            {cBudgetMode === "ABO" && <div style={S.col()}><label style={S.lbl}>Ad Set Budget ($)</label><input style={S.inp} type="number" min="1" value={curAdSet.budget} onChange={e => updateAdSet("budget", e.target.value)} /></div>}
          </div>

          <label style={S.lbl}>Audience Type</label>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
            {[{ id: "broad", l: "Broad (Advantage+)", ic: "globe" }, { id: "detailed", l: "Detailed (Interests)", ic: "target" }, { id: "custom", l: "Custom Audience", ic: "users" }].map(t => (
              <div key={t.id} className="hg" style={{ flex: "1 1 140px", padding: "10px 12px", borderRadius: 10, cursor: "pointer", border: curAdSet.audienceType === t.id ? `1.5px solid ${T.ac}` : `1.5px solid ${T.bd}`, background: curAdSet.audienceType === t.id ? "rgba(99,102,241,.08)" : "rgba(255,255,255,.015)", transition: "all .15s", textAlign: "center" }} onClick={() => updateAdSet("audienceType", t.id)}>
                <div style={{ marginBottom: 2, color: curAdSet.audienceType === t.id ? T.ac : T.txM }}><Ic t={t.ic} sz={16} /></div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: curAdSet.audienceType === t.id ? T.tx : T.txM }}>{t.l}</div>
              </div>
            ))}
          </div>

          {curAdSet.audienceType !== "broad" && (
            <div style={{ animation: "fi .2s" }}>
              <div style={{ ...S.row, marginBottom: 14 }}>
                <div style={S.col()}>
                  <label style={S.lbl}>Age Range</label>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <select style={S.sel} value={curAdSet.ageMin} onChange={e => updateAdSet("ageMin", +e.target.value)}>{Array.from({ length: 48 }, (_, i) => i + 18).map(a => <option key={a}>{a}</option>)}</select>
                    <span style={{ color: T.txD }}>to</span>
                    <select style={S.sel} value={curAdSet.ageMax} onChange={e => updateAdSet("ageMax", +e.target.value)}>{Array.from({ length: 48 }, (_, i) => i + 18).filter(a => a >= curAdSet.ageMin).map(a => <option key={a}>{a}</option>)}</select>
                  </div>
                </div>
                <div style={S.col()}>
                  <label style={S.lbl}>Gender</label>
                  <select style={S.sel} value={curAdSet.gender} onChange={e => updateAdSet("gender", e.target.value)}><option value="all">All</option><option value="male">Male</option><option value="female">Female</option></select>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={S.lbl}>Interest Targeting</label>
                <input style={S.inp} value={interestQuery} onChange={e => { setInterestQuery(e.target.value); searchInterests(e.target.value); }} placeholder="Search interests..." />
                {interestResults.length > 0 && (
                  <div style={{ marginTop: 6, padding: 8, background: "rgba(255,255,255,.02)", borderRadius: 8, border: `1px solid ${T.bd}`, maxHeight: 160, overflowY: "auto" }}>
                    {interestResults.map(i => (
                      <div key={i.id} className="hr" style={{ padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12, display: "flex", justifyContent: "space-between" }}
                        onClick={() => {
                          const exists = (curAdSet.interests || []).some(x => x.id === i.id);
                          if (!exists) updateAdSet("interests", [...(curAdSet.interests || []), i]);
                          setInterestResults([]); setInterestQuery("");
                        }}>
                        <span>{i.name}</span>
                        <span style={{ fontSize: 10, color: T.txD }}>{i.audience_size_lower_bound?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                {curAdSet.interests?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                    {curAdSet.interests.map((i, idx) => (
                      <Chip key={idx} selected onClick={() => updateAdSet("interests", curAdSet.interests.filter((_, j) => j !== idx))}>{i.name} ×</Chip>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ padding: 12, background: "rgba(168,85,247,.04)", borderRadius: 10, border: "1px solid rgba(168,85,247,.1)", fontSize: 12, color: T.ac2, marginTop: 8 }}>
            <b>Structure:</b> 1 Campaign → {adSets.length} Ad Set{adSets.length > 1 ? "s" : ""} → {creativeFiles.length} Ad{creativeFiles.length !== 1 ? "s" : ""} each = <b>{adSets.length * creativeFiles.length} total ads per account</b>
          </div>
        </div>
      ),

      // Step 4: Accounts
      () => (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
            <div><div style={S.cardT}>Select Ad Accounts</div><div style={S.cardD}>{apiConnected ? `${accounts.length} accounts from Facebook API` : "Connect API in Settings first"}</div></div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Badge color={T.ac}>{selAccounts.length} selected</Badge>
              <Btn variant="ghost" onClick={selectAllFilteredAccs}>{filteredAccs.every(a => selAccounts.includes(a.id)) ? "Deselect" : "Select"} All</Btn>
            </div>
          </div>

          {!apiConnected && <div style={{ padding: 14, borderRadius: 10, background: "rgba(234,179,8,.04)", border: "1px solid rgba(234,179,8,.15)", marginBottom: 14, fontSize: 12.5 }}>⚠️ <span style={{ color: T.ac, cursor: "pointer", fontWeight: 600 }} onClick={() => setPg("settings")}>Connect Facebook API →</span></div>}

          {savedGroups.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label style={S.lbl}>Saved Groups</label>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {savedGroups.map(g => (
                  <Btn key={g.id} variant="ghost" onClick={() => { setSelAccounts(g.accountIds || []); flash(`Loaded "${g.name}"`); }} style={{ padding: "5px 10px", fontSize: 11 }}>
                    {g.name} ({(g.accountIds || []).length})
                  </Btn>
                ))}
                {!showNewGrp ? (
                  <Btn variant="ghost" onClick={() => setShowNewGrp(true)} style={{ padding: "5px 10px", fontSize: 11, color: T.ac }}>+ Save Current</Btn>
                ) : (
                  <div style={{ display: "flex", gap: 4 }}>
                    <input style={{ ...S.inp, width: 130, padding: "5px 8px", fontSize: 11 }} value={newGrpName} onChange={e => setNewGrpName(e.target.value)} placeholder="Group name" onKeyDown={e => e.key === "Enter" && saveGroup()} />
                    <Btn onClick={saveGroup} style={{ padding: "5px 10px", fontSize: 11 }}>Save</Btn>
                    <Btn variant="ghost" onClick={() => setShowNewGrp(false)} style={{ padding: "5px 8px", fontSize: 11 }}>×</Btn>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ ...S.row, marginBottom: 10 }}>
            <div style={{ ...S.col(2), position: "relative" }}>
              <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.txD }}><Ic t="search" sz={14} /></div>
              <input style={{ ...S.inp, paddingLeft: 32 }} placeholder="Search accounts..." value={accSearch} onChange={e => setAccSearch(e.target.value)} />
            </div>
            <div style={S.col()}>
              <select style={S.sel} value={accGroupFilter} onChange={e => setAccGroupFilter(e.target.value)}>
                <option value="all">All Groups</option>
                {accGroups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {/* Account header */}
          <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 80px 70px 60px", gap: 8, padding: "5px 14px", fontSize: 10, textTransform: "uppercase", letterSpacing: ".5px", color: T.txD, fontWeight: 600 }}>
            <div /><div>Account</div><div>Group</div><div>Spend</div><div>Status</div>
          </div>

          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {filteredAccs.map((a, i) => {
              const sel = selAccounts.includes(a.id);
              return (
                <div key={a.id} className="hr" style={{ display: "grid", gridTemplateColumns: "28px 1fr 80px 70px 60px", gap: 8, alignItems: "center", padding: "9px 14px", borderRadius: 6, cursor: "pointer", background: sel ? "rgba(99,102,241,.04)" : "transparent", animation: `fi .12s ease ${i * .01}s both` }} onClick={() => toggleAcc(a.id)}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", background: sel ? T.ac : "rgba(255,255,255,.03)", border: sel ? "none" : `1.5px solid rgba(255,255,255,.1)`, color: "#fff", fontSize: 10 }}>
                    {sel && <Ic t="check" sz={9} />}
                  </div>
                  <div><div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.name}</div><div style={{ fontSize: 10, color: T.txD, fontFamily: MONO }}>{a.id}</div></div>
                  <div style={{ fontSize: 11, color: T.txM }}>{a.business_name || "—"}</div>
                  <div style={{ fontSize: 11, fontFamily: MONO, color: T.txM }}>${parseFloat(a.amount_spent || 0).toLocaleString()}</div>
                  <div><Dot status={a.status} /><span style={{ fontSize: 11, color: T.txM }}>{a.status}</span></div>
                </div>
              );
            })}
            {filteredAccs.length === 0 && <div style={{ textAlign: "center", padding: 28, color: T.txD }}>No accounts found</div>}
          </div>
        </div>
      ),

      // Step 5: Review & Publish
      () => {
        if (publishing || pubDone) {
          const res = pubResults;
          const okC = res?.summary?.successful || wsResults.filter(r => r.success).length;
          const failC = res?.summary?.failed || wsResults.filter(r => !r.success).length;
          return (
            <div style={S.card}>
              <div style={{ textAlign: "center", marginBottom: 18 }}>
                {pubDone ? (
                  <><div style={{ fontSize: 48, marginBottom: 6 }}>🎉</div><div style={{ fontSize: 20, fontWeight: 800 }}>Published!</div><div style={{ color: T.txM, fontSize: 13 }}>{okC} success{failC > 0 ? ` · ${failC} failed` : ""}</div></>
                ) : (
                  <><div style={{ fontSize: 48, marginBottom: 6, animation: "spin 2s linear infinite" }}>⚙️</div><div style={{ fontSize: 20, fontWeight: 800 }}>Publishing to Facebook...</div><div style={{ color: T.txM, fontSize: 13 }}>Creating campaigns via Graph API</div></>
                )}
              </div>
              <div style={{ width: "100%", height: 6, borderRadius: 8, background: "rgba(255,255,255,.05)", overflow: "hidden", marginBottom: 14 }}>
                <div style={{ width: `${pubProgress}%`, height: "100%", borderRadius: 8, background: T.grad, transition: "width .3s" }} />
              </div>
              <div style={{ maxHeight: 260, overflowY: "auto" }}>
                {(wsResults.length > 0 ? wsResults : res?.results || []).map((r, i) => {
                  const acc = accounts.find(a => a.id === r.accountId);
                  const ok = r.success;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 6, marginBottom: 3, background: ok ? "rgba(34,197,94,.03)" : "rgba(239,68,68,.03)" }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, background: ok ? "rgba(34,197,94,.12)" : "rgba(239,68,68,.12)", color: ok ? T.ok : T.err }}>{ok ? "✓" : "✕"}</div>
                      <div style={{ flex: 1, fontSize: 12.5, fontWeight: 500 }}>{acc?.name || r.accountId}</div>
                      {ok && <div style={{ fontSize: 10.5, color: T.ok }}>{r.data?.ad_sets} sets · {r.data?.total_ads} ads</div>}
                      {!ok && <div style={{ fontSize: 10.5, color: T.err, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.error || "Failed"}</div>}
                    </div>
                  );
                })}
              </div>
              {pubDone && (
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
                  <Btn onClick={() => { resetCampaign(); setPg("dashboard"); }}>Dashboard</Btn>
                  <Btn variant="ghost" onClick={resetCampaign}>New Campaign</Btn>
                </div>
              )}
            </div>
          );
        }

        const obj = OBJECTIVES.find(o => o.id === cObj);
        const totalAdsPerAccount = adSets.length * creativeFiles.length;
        return (
          <div style={S.card}>
            <div style={S.cardT}>Review & Launch</div>
            <div style={S.cardD}>Verify everything before publishing</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 18 }}>
              {[
                { l: "Campaign", v: cName },
                { l: "Objective", v: obj?.label || cObj },
                { l: "Budget", v: `$${cBudget} ${cBudgetType} (${cBudgetMode})` },
                { l: "Page", v: fbPages.find(p => p.id === cPageId)?.name || cPageId },
                { l: "Location", v: cCountries.map(c => COUNTRIES.find(x => x.code === c)?.name || c).join(", ") },
                { l: "Excluded", v: cExcludedRegions.length > 0 ? cExcludedRegions.map(r => r.name).join(", ") : "None" },
                { l: "Creatives", v: creativeFiles.length },
                { l: "Ad Sets", v: adSets.map(a => a.name).join(", ") },
                { l: "Ads per Account", v: totalAdsPerAccount },
                { l: "Total Ads", v: totalAdsPerAccount * selAccounts.length },
              ].map((it, i) => (
                <div key={i}><div style={{ fontSize: 10, fontWeight: 600, color: T.txD, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 3 }}>{it.l}</div><div style={{ fontSize: 13, fontWeight: 600 }}>{it.v}</div></div>
              ))}
            </div>

            {/* Ad Sets Summary */}
            <div style={{ marginBottom: 16 }}>
              {adSets.map(as => (
                <div key={as.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 8, background: "rgba(255,255,255,.02)", border: `1px solid ${T.bd}`, marginBottom: 5, fontSize: 12.5 }}>
                  <Badge color={T.ac2}>{as.audienceType}</Badge>
                  <span style={{ fontWeight: 600 }}>{as.name}</span>
                  <span style={{ color: T.txM }}>→ {creativeFiles.length} ads</span>
                  {cBudgetMode === "ABO" && <span style={{ marginLeft: "auto", fontFamily: MONO, color: T.ac }}>${as.budget}/day</span>}
                </div>
              ))}
            </div>

            {/* Summary Bar */}
            <div style={{ padding: 18, background: T.gradS, borderRadius: 12, border: "1px solid rgba(99,102,241,.1)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div><div style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-2px", background: T.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{selAccounts.length}</div><div style={{ fontSize: 10, color: T.txM }}>Accounts</div></div>
              <div style={{ width: 1, height: 36, background: T.bd }} />
              <div><div style={{ fontSize: 22, fontWeight: 800, color: T.ac }}>{totalAdsPerAccount * selAccounts.length}</div><div style={{ fontSize: 10, color: T.txM }}>Total Ads</div></div>
              <div style={{ width: 1, height: 36, background: T.bd }} />
              <div><div style={{ fontSize: 22, fontWeight: 800, color: T.ac2 }}>${totalDaily.toLocaleString()}/day</div><div style={{ fontSize: 10, color: T.txM }}>Est. Spend</div></div>
              <Btn onClick={handlePublish} style={{ marginLeft: "auto", padding: "12px 28px", fontSize: 14 }}>
                Publish to Facebook
              </Btn>
            </div>
            <div style={{ fontSize: 11.5, color: T.warn, marginTop: 10 }}>Campaigns created as PAUSED. Activate in Facebook Ads Manager after review.</div>
          </div>
        );
      },
    ];

    return (
      <div style={S.ct}>
        {/* Stepper */}
        <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,.025)", borderRadius: 10, padding: 4, border: `1px solid ${T.bd}`, marginBottom: 18 }}>
          {steps.map((st, i) => (
            <button key={i} style={{
              padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: i <= step ? "pointer" : "default", transition: "all .15s", border: "none", fontFamily: FNT,
              background: step === i ? T.grad : i < step ? "rgba(99,102,241,.08)" : "transparent",
              color: step === i ? "#fff" : i < step ? "#818cf8" : T.txD,
            }} onClick={() => i <= step && !publishing && setStep(i)}>
              {i < step ? "✓ " : `${i + 1}. `}{st}
            </button>
          ))}
        </div>
        {stepContent[step]()}
        {step < 5 && !publishing && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>← Back</Btn>
            <Btn disabled={!canNext()} onClick={() => canNext() && setStep(step + 1)}>{step === 4 ? "Review →" : "Continue →"}</Btn>
          </div>
        )}
      </div>
    );
  };

  /* ══════════════════════════════════════
     RENDER: TEMPLATES
     ══════════════════════════════════════ */
  const renderTemplates = () => (
    <div style={S.ct}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div><div style={{ fontSize: 15, fontWeight: 700 }}>Templates</div><div style={{ fontSize: 12, color: T.txM }}>Pre-built and custom campaign templates</div></div>
        <Btn onClick={() => { setEditTplId(null); setTpl({ name: "", icon: "🎯", objective: "sales", budget: "50", audienceType: "broad", primaryText: "", headline: "", description: "", cta: "Shop Now", url: "", ageMin: 18, ageMax: 65, gender: "all", interests: [] }); setShowTplEditor(true); }}>
          <Ic t="plus" sz={13} /> Create Template
        </Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 12 }}>
        {templates.map((t, i) => (
          <div key={t.id} className="hg" style={{ ...S.card, marginBottom: 0, animation: `fi .3s ease ${i * .04}s both` }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 26 }}>{t.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.name}</div>
                <div style={{ display: "flex", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
                  <Badge color={T.ac}>{OBJECTIVES.find(o => o.id === t.objective)?.label || t.objective}</Badge>
                  <Badge color={T.ac2}>${t.budget}/day</Badge>
                  {t.isDefault && <Badge color={T.txM}>Default</Badge>}
                </div>
              </div>
            </div>
            <div style={{ padding: 10, background: "rgba(255,255,255,.015)", borderRadius: 8, border: `1px solid ${T.bd}`, marginBottom: 10 }}>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.45)", lineHeight: 1.5, marginBottom: 3 }}>{(t.primaryText || "").slice(0, 100)}{(t.primaryText || "").length > 100 ? "..." : ""}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{t.headline}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn onClick={() => { applyTemplate(t); setPg("create"); setStep(0); }} style={{ flex: 1, justifyContent: "center", padding: "7px 12px" }}><Ic t="zap" sz={12} /> Use</Btn>
              {!t.isDefault && <Btn variant="ghost" onClick={() => { setEditTplId(t.id); setTpl({ name: t.name, icon: t.icon, objective: t.objective, budget: t.budget, audienceType: t.audienceType, primaryText: t.primaryText || "", headline: t.headline || "", description: t.description || "", cta: t.cta || "Shop Now", url: t.url || "", ageMin: t.ageMin || 18, ageMax: t.ageMax || 65, gender: t.gender || "all", interests: t.interests || [] }); setShowTplEditor(true); }} style={{ padding: "7px 10px" }}><Ic t="edit" sz={12} /></Btn>}
              {!t.isDefault && <Btn variant="danger" onClick={async () => { await api.del(`/api/db/templates/${t.id}`); loadTemplates(); flash("Deleted"); }} style={{ padding: "7px 10px" }}><Ic t="trash" sz={12} /></Btn>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ══════════════════════════════════════
     RENDER: OTHER PAGES
     ══════════════════════════════════════ */
  const renderCampaigns = () => (
    <div style={S.ct}>
      <div style={S.card}>
        <div style={S.cardT}>Published Campaigns</div>
        {campaigns.length === 0 ? <div style={{ textAlign: "center", padding: 36, color: T.txD }}>No campaigns published yet. <span style={{ color: T.ac, cursor: "pointer" }} onClick={() => setPg("create")}>Create one →</span></div> :
          <div style={{ marginTop: 12 }}>
            {campaigns.map((c, i) => (
              <div key={c.id || i} className="hr" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", borderRadius: 8, fontSize: 12.5 }}>
                <div><div style={{ fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: 10.5, color: T.txD }}>{c.objective} · {c.budgetMode || "CBO"} · ${c.budget} {c.budgetType} · {new Date(c.publishedAt || c.createdAt).toLocaleDateString()}</div></div>
                <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: T.txM }}>{c.accountCount} accts</span>
                  <Badge color={T.ok}>{c.successCount} ok</Badge>
                  {c.failCount > 0 && <Badge color={T.err}>{c.failCount} fail</Badge>}
                  <Dot status={c.status === "published" ? "active" : "paused"} />
                  <span style={{ fontSize: 11, color: T.txM }}>{c.status}</span>
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );

  const renderAccounts = () => (
    <div style={S.ct}>
      {!apiConnected ? (
        <div style={{ ...S.card, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}><Ic t="fb" sz={48} /></div>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 5 }}>Connect Facebook API</div>
          <div style={{ fontSize: 13, color: T.txM, marginBottom: 16 }}>Add your System User token to fetch ad accounts</div>
          <Btn variant="fb" onClick={() => setPg("settings")}><Ic t="fb" sz={14} /> Connect</Btn>
        </div>
      ) : (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={S.cardT}>All Ad Accounts ({accounts.length})</div>
            <Btn variant="ghost" onClick={fetchAccounts} disabled={accLoading}><Ic t="refresh" sz={13} /> {accLoading ? "Syncing..." : "Refresh"}</Btn>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 70px 90px 70px", gap: 8, padding: "5px 14px", fontSize: 10, textTransform: "uppercase", letterSpacing: ".5px", color: T.txD, fontWeight: 600 }}>
            <div>Account</div><div>Group</div><div>Currency</div><div>Total Spent</div><div>Status</div>
          </div>
          {accounts.map(a => {
            const currSymbol = { INR: "₹", USD: "$", GBP: "£", EUR: "€", AED: "د.إ", CAD: "C$", AUD: "A$", JPY: "¥", BRL: "R$", MXN: "MX$", SGD: "S$" }[a.currency] || a.currency + " ";
            return (
              <div key={a.id} className="hr" style={{ display: "grid", gridTemplateColumns: "1fr 90px 70px 90px 70px", gap: 8, alignItems: "center", padding: "9px 14px", borderRadius: 6, fontSize: 12.5 }}>
                <div><div style={{ fontWeight: 600 }}>{a.name}</div><div style={{ fontSize: 10, color: T.txD, fontFamily: MONO }}>{a.id}</div></div>
                <div style={{ color: T.txM, fontSize: 11 }}>{a.business_name || "—"}</div>
                <div><Badge color={T.ac2}>{a.currency}</Badge></div>
                <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: T.txM }}>{currSymbol}{parseFloat(a.amount_spent || 0).toLocaleString()}</div>
                <div><Dot status={a.status} /><span style={{ fontSize: 11 }}>{a.status}</span></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderAnalytics = () => {
    // Aggregate analytics data
    const totals = analyticsData.reduce((acc, r) => {
      if (r.data && r.data[0]) {
        const d = r.data[0];
        acc.spend += parseFloat(d.spend || 0);
        acc.impressions += parseInt(d.impressions || 0);
        acc.clicks += parseInt(d.clicks || 0);
        acc.reach += parseInt(d.reach || 0);
        if (d.actions) {
          const purchases = d.actions.find(a => a.action_type === "purchase" || a.action_type === "omni_purchase");
          if (purchases) acc.purchases += parseInt(purchases.value || 0);
        }
      }
      return acc;
    }, { spend: 0, impressions: 0, clicks: 0, reach: 0, purchases: 0 });

    const ctr = totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : "0.00";
    const cpc = totals.clicks > 0 ? (totals.spend / totals.clicks).toFixed(2) : "0.00";
    const cpa = totals.purchases > 0 ? (totals.spend / totals.purchases).toFixed(2) : "—";

    return (
      <div style={S.ct}>
        {!apiConnected ? (
          <div style={{ ...S.card, textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}><Ic t="chart" sz={48} /></div>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 5 }}>Connect Facebook API</div>
            <div style={{ fontSize: 13, color: T.txM, marginBottom: 16 }}>Connect your API to view live analytics</div>
            <Btn variant="fb" onClick={() => setPg("settings")}><Ic t="fb" sz={14} /> Connect</Btn>
          </div>
        ) : (
          <>
            {/* Date Filter + Refresh */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 5 }}>
                {[{ v: "today", l: "Today" }, { v: "yesterday", l: "Yesterday" }, { v: "last_7d", l: "7 Days" }, { v: "last_14d", l: "14 Days" }, { v: "last_30d", l: "30 Days" }].map(p => (
                  <Btn key={p.v} variant={analyticsPreset === p.v ? "primary" : "ghost"} onClick={() => { setAnalyticsPreset(p.v); fetchAnalytics(p.v); }} style={{ padding: "5px 12px", fontSize: 11 }}>{p.l}</Btn>
                ))}
              </div>
              <Btn variant="ghost" onClick={() => { fetchAnalytics(); fetchActiveSpend(); }} disabled={analyticsLoading}>
                <Ic t="refresh" sz={13} /> {analyticsLoading ? "Loading..." : "Refresh"}
              </Btn>
            </div>

            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(145px,1fr))", gap: 10, marginBottom: 16 }}>
              {[
                { l: "Spend", v: `${totals.spend.toFixed(2)}`, c: T.ac },
                { l: "Impressions", v: totals.impressions.toLocaleString(), c: T.ac2 },
                { l: "Clicks", v: totals.clicks.toLocaleString(), c: T.ok },
                { l: "CTR", v: `${ctr}%`, c: T.warn },
                { l: "CPC", v: cpc, c: T.ac },
                { l: "Purchases", v: totals.purchases, c: T.ok },
                { l: "CPA", v: cpa, c: T.err },
                { l: "Reach", v: totals.reach.toLocaleString(), c: T.ac2 },
              ].map((k, i) => (
                <div key={i} style={{ ...S.card, padding: 14, marginBottom: 0 }}>
                  <div style={{ fontSize: 10, color: T.txM, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4, fontWeight: 600 }}>{k.l}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: k.c, letterSpacing: "-1px" }}>{k.v}</div>
                </div>
              ))}
            </div>

            {/* Daily Chart */}
            {dailyData.length > 0 && (
              <div style={S.card}>
                <div style={S.cardT}>Daily Performance</div>
                <div style={{ height: 250, marginTop: 12 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyData}>
                      <defs>
                        <linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={T.ac} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={T.ac} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke={T.txD} fontSize={10} tickFormatter={d => d.slice(5)} />
                      <YAxis stroke={T.txD} fontSize={10} />
                      <Tooltip contentStyle={{ background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="spend" stroke={T.ac} fill="url(#gSpend)" strokeWidth={2} name="Spend" />
                      <Area type="monotone" dataKey="clicks" stroke={T.ok} fill="none" strokeWidth={1.5} name="Clicks" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Budget Calculator — Active Campaign Spend */}
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={S.cardT}>Budget Calculator — Today's Active Spend</div>
                <Btn variant="ghost" onClick={fetchActiveSpend} style={{ padding: "5px 10px", fontSize: 11 }}><Ic t="refresh" sz={11} /> Refresh</Btn>
              </div>
              <div style={S.cardD}>Real-time spend across active accounts</div>
              {activeSpend.accounts.length > 0 ? (
                <>
                  {activeSpend.accounts.map((a, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 12px", borderRadius: 6, fontSize: 12.5, background: i % 2 === 0 ? "rgba(255,255,255,.015)" : "transparent" }}>
                      <span>{a.name || a.account_id}</span>
                      <span style={{ fontFamily: MONO, fontWeight: 600, color: a.spend_today > 0 ? T.ok : T.txD }}>
                        {a.currency} {a.spend_today.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div style={{ marginTop: 10, padding: 12, background: T.gradS, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700 }}>Total Spend Today</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: T.ac, fontFamily: MONO }}>{activeSpend.total.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: 20, color: T.txD }}>Click Refresh to load today's spend data</div>
              )}
            </div>

            {analyticsData.length === 0 && !analyticsLoading && (
              <div style={{ textAlign: "center", padding: 24, color: T.txD }}>
                Click a date range above to load analytics data from Facebook Insights.
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  /* ══════════════════════════════════════
     RENDER: TEMPLATE EDITOR MODAL
     ══════════════════════════════════════ */
  const renderTplEditor = () => (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.65)", backdropFilter: "blur(6px)" }} onClick={() => setShowTplEditor(false)}>
      <div style={{ background: T.sf, borderRadius: 16, border: `1px solid ${T.bd}`, padding: 26, width: "min(660px,93vw)", maxHeight: "85vh", overflowY: "auto", animation: "fi .2s ease" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{editTplId ? "Edit Template" : "Create Template"}</div>
          <button style={{ background: "none", border: "none", color: T.txM, cursor: "pointer", fontSize: 20 }} onClick={() => setShowTplEditor(false)}>×</button>
        </div>
        <div style={{ marginBottom: 14 }}><label style={S.lbl}>Icon</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {ICONS_LIST.map(ic => <button key={ic} onClick={() => setTpl(p => ({ ...p, icon: ic }))} style={{ width: 34, height: 34, borderRadius: 7, border: tpl.icon === ic ? `2px solid ${T.ac}` : `1px solid ${T.bd}`, background: tpl.icon === ic ? "rgba(99,102,241,.1)" : "rgba(255,255,255,.015)", fontSize: 17, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{ic}</button>)}
          </div>
        </div>
        <div style={{ ...S.row, marginBottom: 12 }}>
          <div style={S.col(2)}><label style={S.lbl}>Name *</label><input style={S.inp} value={tpl.name} onChange={e => setTpl(p => ({ ...p, name: e.target.value }))} placeholder="Template name" /></div>
          <div style={S.col()}><label style={S.lbl}>Objective</label><select style={S.sel} value={tpl.objective} onChange={e => setTpl(p => ({ ...p, objective: e.target.value }))}>{OBJECTIVES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>
          <div style={S.col()}><label style={S.lbl}>Budget</label><input style={S.inp} type="number" value={tpl.budget} onChange={e => setTpl(p => ({ ...p, budget: e.target.value }))} /></div>
        </div>
        <div style={{ marginBottom: 12 }}><label style={S.lbl}>Primary Text *</label><textarea style={S.ta} value={tpl.primaryText} onChange={e => setTpl(p => ({ ...p, primaryText: e.target.value }))} placeholder="Ad copy..." /></div>
        <div style={{ ...S.row, marginBottom: 12 }}>
          <div style={S.col()}><label style={S.lbl}>Headline *</label><input style={S.inp} value={tpl.headline} onChange={e => setTpl(p => ({ ...p, headline: e.target.value }))} placeholder="Headline" /></div>
          <div style={S.col()}><label style={S.lbl}>CTA</label><select style={S.sel} value={tpl.cta} onChange={e => setTpl(p => ({ ...p, cta: e.target.value }))}>{CTA_OPTIONS.map(c => <option key={c}>{c}</option>)}</select></div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={() => setShowTplEditor(false)}>Cancel</Btn>
          <Btn onClick={saveTemplate}><Ic t="save" sz={13} /> {editTplId ? "Update" : "Create"}</Btn>
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════
     MAIN RENDER
     ══════════════════════════════════════ */
  const pages = { dashboard: renderDashboard, create: renderCreate, campaigns: renderCampaigns, templates: renderTemplates, accounts: renderAccounts, analytics: renderAnalytics, settings: renderSettings };

  return (
    <div style={S.layout}>
      <style>{CSS}</style>
      {notif && <div style={{ position: "fixed", top: 18, right: 18, zIndex: 200, padding: "11px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, backdropFilter: "blur(10px)", animation: "ni .25s ease", background: notif.t === "success" ? "rgba(34,197,94,.1)" : notif.t === "error" ? "rgba(239,68,68,.1)" : "rgba(99,102,241,.1)", color: notif.t === "success" ? T.ok : notif.t === "error" ? T.err : T.ac, border: `1px solid ${notif.t === "success" ? "rgba(34,197,94,.2)" : notif.t === "error" ? "rgba(239,68,68,.2)" : "rgba(99,102,241,.2)"}` }}>{notif.m}</div>}
      {showTplEditor && renderTplEditor()}

      {/* Sidebar */}
      <div style={{ width: sbOpen ? 232 : 60, background: T.sf, borderRight: `1px solid ${T.bd}`, display: "flex", flexDirection: "column", transition: "width .25s", flexShrink: 0, zIndex: 10 }}>
        <div style={{ padding: sbOpen ? "18px 16px" : "18px 10px", display: "flex", alignItems: "center", gap: 11, borderBottom: `1px solid ${T.bd}`, minHeight: 60 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: T.grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#fff", flexShrink: 0 }}>B</div>
          {sbOpen && <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-.5px" }}>BulkAds<span style={{ color: T.ac }}> Pro</span></div>}
        </div>
        <div style={{ flex: 1, padding: "10px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map(n => (
            <button key={n.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: sbOpen ? "9px 12px" : "9px 0", borderRadius: 8, cursor: "pointer", transition: "all .12s",
              fontSize: 12.5, fontWeight: pg === n.id ? 600 : 500, background: pg === n.id ? "rgba(99,102,241,.1)" : "transparent",
              color: pg === n.id ? T.ac : T.txM, justifyContent: sbOpen ? "flex-start" : "center",
              border: "none", fontFamily: FNT, width: "100%", textAlign: "left",
            }} onClick={() => { setPg(n.id); if (n.id === "create" && pg !== "create") resetCampaign(); }}>
              <Ic t={n.icon} sz={17} />{sbOpen && <span>{n.label}</span>}
              {n.id === "settings" && sbOpen && apiConnected && <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.ok, marginLeft: "auto" }} />}
            </button>
          ))}
        </div>
        <div style={{ padding: "10px 6px", borderTop: `1px solid ${T.bd}` }}>
          <button style={{ display: "flex", alignItems: "center", gap: 10, padding: sbOpen ? "8px 12px" : "8px 0", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 500, background: "transparent", color: T.txM, border: "none", fontFamily: FNT, width: "100%", justifyContent: sbOpen ? "flex-start" : "center" }} onClick={() => setSbOpen(!sbOpen)}>
            <span style={{ transform: sbOpen ? "rotate(0)" : "rotate(180deg)", transition: "transform .25s", display: "flex" }}><Ic t="chevL" /></span>
            {sbOpen && <span>Collapse</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={S.main}>
        <div style={{ position: "sticky", top: 0, zIndex: 5, background: "rgba(6,6,17,.92)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${T.bd}`, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.2px" }}>{titles[pg]}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {wsConnected && <span style={{ fontSize: 10.5, color: T.ok, display: "flex", alignItems: "center", gap: 5 }}><Ic t="ws" sz={12} /> Live</span>}
            {apiConnected && <span style={{ fontSize: 10.5, color: T.ok, display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: T.ok }} />{accounts.length} accounts</span>}
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: "#fff" }}>A</div>
          </div>
        </div>
        {pages[pg]?.()}
      </div>
    </div>
  );
}
