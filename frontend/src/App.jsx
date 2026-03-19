import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

/*
 ╔══════════════════════════════════════════════════════════════════╗
 ║  BulkAds Pro v4 — PRODUCTION DASHBOARD                         ║
 ║  Connected to Real Facebook Marketing API Backend               ║
 ║                                                                 ║
 ║  This dashboard talks to the Express backend via API calls.     ║
 ║  Set REACT_APP_API_URL in .env to point to your backend.        ║
 ╚══════════════════════════════════════════════════════════════════╝
*/

const API = ""; // Uses Vite proxy to localhost:5000

/* ── API Helper ── */
const FB_TOKEN = "EAAmtrIU2PbkBQ4lUEsLZAhM8A8OxALhLOXNKlW2KJqpEg3cCy3GV3PxMvMUK7N4HmAfwEAZBXipJtD11CbmhqW5vJICHpKtmwoyvQSsZAgY93yVsaZCR1W0xcv2B6KY8FYbK6ufieaGJc4ZCALXHUFasOHt3rC3rLZBZCK1ictL5zhYMzXjSvV2V5Dd7OElM0LEBgZDZD";
const FB_BIZ_ID = "644141538776203";

const api = {
  token: FB_TOKEN, bizId: FB_BIZ_ID,
  headers() {
    const h = { "Content-Type": "application/json" };
    if (this.token) h["x-fb-access-token"] = this.token;
    if (this.bizId) h["x-fb-business-id"] = this.bizId;
    return h;
  },
  async get(path) { const r = await fetch(`${API}${path}`, { headers: this.headers() }); return r.json(); },
  async post(path, body) { const r = await fetch(`${API}${path}`, { method: "POST", headers: this.headers(), body: JSON.stringify(body) }); return r.json(); },
  async postForm(path, formData) {
    const h = {};
    if (this.token) h["x-fb-access-token"] = this.token;
    if (this.bizId) h["x-fb-business-id"] = this.bizId;
    const r = await fetch(`${API}${path}`, { method: "POST", headers: h, body: formData });
    return r.json();
  },
  async del(path) { const r = await fetch(`${API}${path}`, { method: "DELETE", headers: this.headers() }); return r.json(); },
};

/* ── Constants ── */
const OBJECTIVES = [
  { id: "conversions", label: "Conversions", icon: "🎯", fbValue: "OUTCOME_SALES" },
  { id: "traffic", label: "Traffic", icon: "🔗", fbValue: "OUTCOME_TRAFFIC" },
  { id: "awareness", label: "Awareness", icon: "📢", fbValue: "OUTCOME_AWARENESS" },
  { id: "engagement", label: "Engagement", icon: "💬", fbValue: "OUTCOME_ENGAGEMENT" },
  { id: "leads", label: "Leads", icon: "📋", fbValue: "OUTCOME_LEADS" },
  { id: "sales", label: "Sales", icon: "🛒", fbValue: "OUTCOME_SALES" },
  { id: "app_installs", label: "App Installs", icon: "📱", fbValue: "OUTCOME_APP_PROMOTION" },
  { id: "video_views", label: "Video Views", icon: "▶️", fbValue: "OUTCOME_ENGAGEMENT" },
];

const PLACEMENTS = [
  { id: "fb_feed", label: "Facebook Feed", plat: "facebook", pos: "feed" },
  { id: "ig_feed", label: "Instagram Feed", plat: "instagram", pos: "stream" },
  { id: "ig_stories", label: "IG Stories", plat: "instagram", pos: "story" },
  { id: "ig_reels", label: "IG Reels", plat: "instagram", pos: "reels" },
  { id: "fb_stories", label: "FB Stories", plat: "facebook", pos: "story" },
  { id: "fb_reels", label: "FB Reels", plat: "facebook", pos: "reels" },
  { id: "fb_marketplace", label: "Marketplace", plat: "facebook", pos: "marketplace" },
  { id: "audience_network", label: "Audience Network", plat: "audience_network", pos: "classic" },
  { id: "messenger", label: "Messenger", plat: "messenger", pos: "messenger_home" },
];

const CTA_MAP = { "Shop Now": "SHOP_NOW", "Learn More": "LEARN_MORE", "Sign Up": "SIGN_UP", "Book Now": "BOOK_TRAVEL", "Download": "DOWNLOAD", "Get Offer": "GET_OFFER", "Subscribe": "SUBSCRIBE", "Contact Us": "CONTACT_US", "Apply Now": "APPLY_NOW", "Order Now": "ORDER_NOW", "Watch More": "WATCH_MORE", "Send Message": "MESSAGE_PAGE" };
const CTA_OPTIONS = Object.keys(CTA_MAP);

const COUNTRIES = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "AE", name: "UAE", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
];

const ICONS = ["🎯","🛍️","📋","📢","📱","🔄","🎬","💎","🏷️","🚀","💡","🌟","🏆","💰","🔥","❄️","🎁","📧","💪","👗","📸","🎮"];

/* ── Tiny SVG Icons ── */
const Ic = ({ t, sz = 17 }) => {
  const p = { width: sz, height: sz, display: "inline-block", verticalAlign: "middle" };
  const m = {
    dashboard: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/></svg>,
    plus: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>,
    list: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h16M4 18h10"/></svg>,
    users: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    grid: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
    chart: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>,
    gear: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    check: <svg style={p} viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
    up: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>,
    x: <svg style={p} viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    search: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
    eye: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    eyeOff: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
    fb: <svg style={p} viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    refresh: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
    save: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>,
    zap: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    split: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>,
    ws: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
    edit: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    trash: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
    copy: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
    chevL: <svg style={{...p,width:12,height:12}} viewBox="0 0 12 12" fill="none"><path d="M8 10L4 6l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  };
  return m[t] || null;
};

/* ── Theme ── */
const T = {
  bg: "#05060a", sf: "#0b0c13", sfH: "#10111a", bd: "rgba(255,255,255,.055)", bdH: "rgba(255,255,255,.12)",
  tx: "#e2e2ea", txM: "rgba(255,255,255,.38)", txD: "rgba(255,255,255,.2)",
  ac: "#2d7ff9", ac2: "#9b59f5", ok: "#1cc88a", warn: "#f6c23e", err: "#e74a3b",
  grad: "linear-gradient(135deg,#2d7ff9,#9b59f5)", gradS: "linear-gradient(135deg,rgba(45,127,249,.1),rgba(155,89,245,.1))",
  fb: "#1877F2",
};
const FNT = "'Satoshi', 'Outfit', sans-serif";
const MONO = "'JetBrains Mono', monospace";

export default function App() {
  /* ─── Core State ─── */
  const [pg, setPg] = useState("dashboard");
  const [sbOpen, setSbOpen] = useState(true);
  const [notif, setNotif] = useState(null);
  const flash = (m, t = "success") => { setNotif({ m, t }); setTimeout(() => setNotif(null), 3500); };

  /* ─── FB API Connection (hardcoded for quick access) ─── */
  const [fbToken, setFbToken] = useState(FB_TOKEN);
  const [fbBizId, setFbBizId] = useState(FB_BIZ_ID);
  const [fbAppId, setFbAppId] = useState("2724231271300537");
  const [fbAppSecret, setFbAppSecret] = useState("468328ac4ae2af1a2152d46d8e05558d");
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [apiConnected, setApiConnected] = useState(true);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  /* ─── Accounts (from real API) ─── */
  const [accounts, setAccounts] = useState([]);
  const [fbPages, setFbPages] = useState([]);
  const [accLoading, setAccLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  /* ─── Templates (from DB) ─── */
  const [templates, setTemplates] = useState([]);
  const [showTplEditor, setShowTplEditor] = useState(false);
  const [editTplId, setEditTplId] = useState(null);
  const [tpl, setTpl] = useState({ name:"", icon:"🎯", objective:"conversions", budget:"50", audienceType:"broad", placements:["fb_feed","ig_feed"], primaryText:"", headline:"", description:"", cta:"Shop Now", url:"", ageMin:18, ageMax:65, gender:"all", interests:[] });

  /* ─── Campaign Builder ─── */
  const [step, setStep] = useState(0);
  const [cName, setCName] = useState("");
  const [cObj, setCObj] = useState("");
  const [cBudget, setCBudget] = useState("50");
  const [cBudgetType, setCBudgetType] = useState("daily");
  const [cBudgetMode, setCBudgetMode] = useState("CBO"); // CBO or ABO
  const [cBidStrategy, setCBidStrategy] = useState("LOWEST_COST_WITHOUT_CAP");
  const [cSchedule, setCSchedule] = useState(false);
  const [cStart, setCStart] = useState("");
  const [cEnd, setCEnd] = useState("");
  const [cPageId, setCPageId] = useState("");
  // Location targeting
  const [cCountry, setCCountry] = useState("IN"); // Default India
  const [cCountrySearch, setCCountrySearch] = useState("");
  const [cCustomCountries, setCCustomCountries] = useState([]); // for multi-country
  // Pixel selection
  const [cPixelMode, setCPixelMode] = useState("auto"); // "auto" or "specific"
  const [cPixelId, setCPixelId] = useState("");
  const [accountPixels, setAccountPixels] = useState([]); // fetched from API
  const [creatives, setCreatives] = useState([]);
  const [creativeFiles, setCreativeFiles] = useState([]);
  // Ad Copy — single copy applied to ALL ads
  const [adCopy, setAdCopy] = useState({ primaryText: "", headline: "", description: "", cta: "Shop Now", url: "" });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiUrl, setAiUrl] = useState("");
  const [aiVariations, setAiVariations] = useState([]);
  // Multiple Ad Sets — each with own targeting
  const [adSets, setAdSets] = useState([
    { id: 1, name: "Broad", audienceType: "broad", ageMin: 18, ageMax: 65, gender: "all", interests: [], budget: "50" }
  ]);
  const [activeAdSet, setActiveAdSet] = useState(1);
  const [selAccounts, setSelAccounts] = useState([]);
  const [accSearch, setAccSearch] = useState("");
  const [accGroupFilter, setAccGroupFilter] = useState("all");
  const [interestQuery, setInterestQuery] = useState("");
  const [interestResults, setInterestResults] = useState([]);

  /* ─── Publishing ─── */
  const [publishing, setPublishing] = useState(false);
  const [pubProgress, setPubProgress] = useState(0);
  const [pubResults, setPubResults] = useState(null);
  const [pubDone, setPubDone] = useState(false);

  /* ─── WebSocket ─── */
  const [wsConnected, setWsConnected] = useState(false);
  const [wsResults, setWsResults] = useState([]);
  const wsRef = useRef(null);

  /* ─── Campaign History (from DB) ─── */
  const [campaigns, setCampaigns] = useState([]);
  const [campFilter, setCampFilter] = useState("all");

  /* ─── Saved Groups (from DB) ─── */
  const [savedGroups, setSavedGroups] = useState([]);
  const [newGrpName, setNewGrpName] = useState("");
  const [showNewGrp, setShowNewGrp] = useState(false);

  const fileRef = useRef(null);

  /* ═══════════════════════════════════════
     REAL API CALLS
     ═══════════════════════════════════════ */

  // Connect to Facebook API
  const connectApi = async () => {
    if (!fbToken || !fbBizId) { setApiError("Token and Business ID required"); return; }
    setApiLoading(true); setApiError("");
    api.token = fbToken; api.bizId = fbBizId;
    try {
      const status = await api.get("/api/auth/status");
      if (status.connected) {
        setApiConnected(true);
        // Save to localStorage so it persists on refresh
        localStorage.setItem("fb_token", fbToken);
        localStorage.setItem("fb_biz_id", fbBizId);
        localStorage.setItem("fb_app_id", fbAppId);
        localStorage.setItem("fb_app_secret", fbAppSecret);
        await fetchAccounts();
        await fetchPages();
        await api.post("/api/db/credentials", { businessId: fbBizId, appId: fbAppId, systemUserToken: fbToken, appSecret: fbAppSecret });
        flash(`Connected! ${status.accounts_count} accounts found`);
      } else { setApiError(status.error || "Connection failed"); }
    } catch (e) { setApiError(e.message || "Connection failed"); }
    setApiLoading(false);
  };

  const disconnectApi = () => { 
    api.token = null; api.bizId = null; 
    setApiConnected(false); setAccounts([]); setFbPages([]); 
    localStorage.removeItem("fb_token"); localStorage.removeItem("fb_biz_id");
    localStorage.removeItem("fb_app_id"); localStorage.removeItem("fb_app_secret");
    flash("Disconnected", "info"); 
  };

  // Auto-connect on page load — always connects with hardcoded credentials
  useEffect(() => {
    api.token = FB_TOKEN; api.bizId = FB_BIZ_ID;
    fetchAccounts();
    fetchPages();
    loadTemplates();
    loadCampaigns();
    loadGroups();
  }, []);

  // Fetch real ad accounts
  const fetchAccounts = async () => {
    setAccLoading(true);
    try {
      const r = await api.get("/api/accounts");
      if (r.success) { setAccounts(r.accounts); setLastSync(new Date().toLocaleTimeString()); }
    } catch (e) { flash("Failed to fetch accounts: " + e.message, "error"); }
    setAccLoading(false);
  };

  // Fetch Facebook Pages (needed for ad creative)
  const fetchPages = async () => {
    try { const r = await api.get("/api/accounts/pages"); if (r.success) { setFbPages(r.pages); if (r.pages.length > 0) setCPageId(r.pages[0].id); } } catch (e) {}
  };

  // Fetch all unique pixels from the first few accounts
  const fetchPixels = async () => {
    try {
      const pixelMap = {};
      const accs = accounts.length > 0 ? accounts.filter(a => a.status === "active").slice(0, 10) : [];
      for (const acc of accs) {
        try {
          const r = await api.get(`/api/accounts/${acc.account_id || acc.id.replace("act_","")}/pixels`);
          if (r.success && r.pixels) {
            r.pixels.forEach(p => {
              if (!pixelMap[p.id]) pixelMap[p.id] = { ...p, accounts: [] };
              pixelMap[p.id].accounts.push(acc.name);
            });
          }
        } catch (e) {}
      }
      setAccountPixels(Object.values(pixelMap));
    } catch (e) {}
  };

  // Load templates from DB
  const loadTemplates = async () => {
    try { const r = await api.get("/api/db/templates"); if (r.success) setTemplates(r.templates); } catch (e) {}
  };

  // Load campaign history from DB
  const loadCampaigns = async () => {
    try { const r = await api.get("/api/db/campaigns"); if (r.success) setCampaigns(r.campaigns); } catch (e) {}
  };

  // Load saved groups from DB
  const loadGroups = async () => {
    try { const r = await api.get("/api/db/groups"); if (r.success) setSavedGroups(r.groups); } catch (e) {}
  };

  // Search interests (real Facebook API)
  const searchInterests = async (q) => {
    if (q.length < 2) { setInterestResults([]); return; }
    try { const r = await api.get(`/api/campaigns/interests?q=${encodeURIComponent(q)}`); if (r.success) setInterestResults(r.interests); } catch (e) {}
  };

  // AI Ad Copy Generator — uses Claude to write high-converting ad copy
  const generateAiCopy = async () => {
    if (!aiUrl) { flash("Enter a landing page URL first", "error"); return; }
    setAiLoading(true); setAiVariations([]);
    try {
      const r = await api.post("/api/campaigns/generate-copy", { url: aiUrl, objective: cObj || "sales" });
      if (r.success && r.variations) {
        setAiVariations(r.variations);
        // Auto-apply first variation
        if (r.variations.length > 0) {
          const v = r.variations[0];
          setAdCopy(p => ({ ...p, primaryText: v.primaryText, headline: v.headline, description: v.description, url: aiUrl }));
        }
        flash("AI generated " + r.variations.length + " variations!");
      } else { flash(r.error || "AI generation failed", "error"); }
    } catch (e) { flash("AI generation failed: " + e.message, "error"); }
    setAiLoading(false);
  };

  // Save template to DB
  const saveTemplate = async () => {
    if (!tpl.name || !tpl.primaryText || !tpl.headline) { flash("Name, text, and headline required", "error"); return; }
    try {
      if (editTplId) { await api.post(`/api/db/templates`, { ...tpl }); } // simplified - use PUT for update
      else { await api.post("/api/db/templates", tpl); }
      await loadTemplates();
      setShowTplEditor(false);
      flash(editTplId ? "Template updated" : "Template created!");
    } catch (e) { flash("Save failed: " + e.message, "error"); }
  };

  // Save account group to DB
  const saveGroup = async () => {
    if (!newGrpName || selAccounts.length === 0) return;
    try {
      await api.post("/api/db/groups", { name: newGrpName, accountIds: selAccounts });
      await loadGroups();
      setNewGrpName(""); setShowNewGrp(false);
      flash(`Group "${newGrpName}" saved!`);
    } catch (e) {}
  };

  /* ═══════════════════════════════════════
     REAL PUBLISH — Multiple Ad Sets + All Videos
     ═══════════════════════════════════════ */
  const handlePublish = async () => {
    setPublishing(true); setPubProgress(5); setPubResults(null); setPubDone(false); setWsResults([]);

    // Build selected countries array
    const selectedCountries = cCustomCountries.length > 0 ? cCustomCountries : [cCountry];

    // Build ad_sets array with targeting per ad set
    const adSetsForApi = adSets.map(as => {
      const targeting = { geo_locations: { countries: selectedCountries } };
      if (as.audienceType !== "broad") {
        targeting.age_min = as.ageMin; targeting.age_max = as.ageMax;
        if (as.gender !== "all") targeting.genders = as.gender === "male" ? [1] : [2];
        if (as.interests?.length > 0) targeting.interests = as.interests.map(i => ({ id: i.id, name: i.name }));
      }
      return { name: as.name, audience_type: as.audienceType, targeting, budget: parseFloat(as.budget || cBudget) };
    });

    // Each uploaded file becomes one ad variation (1 video = 1 ad in each ad set)
    const adVariations = creativeFiles.map((f, i) => ({
      primary_text: adCopy.primaryText, headline: adCopy.headline, description: adCopy.description,
      cta: adCopy.cta, url: adCopy.url, creative_index: i,
    }));

    const config = {
      name: cName, objective: cObj, budget: parseFloat(cBudget), budget_type: cBudgetType,
      budget_mode: cBudgetMode, bid_strategy: cBidStrategy, publish_status: "PAUSED", page_id: cPageId,
      account_ids: selAccounts, ad_sets: adSetsForApi, ad_variations: adVariations,
      // Pixel override — if specific mode, pass the pixel ID to use for all accounts
      pixel_id: cPixelMode === "specific" && cPixelId ? cPixelId : undefined,
      start_time: cSchedule && cStart ? new Date(cStart).toISOString() : undefined,
      end_time: cSchedule && cEnd ? new Date(cEnd).toISOString() : undefined,
    };

    try {
      setPubProgress(20);
      const formData = new FormData();
      creativeFiles.forEach(f => formData.append("creatives", f));
      formData.append("config", JSON.stringify(config));

      const result = await api.postForm("/api/campaigns/publish", formData);
      setPubProgress(100); setPubResults(result); setPubDone(true);

      await api.post("/api/db/campaigns", {
        name: cName, objective: cObj, status: result.summary?.failed === 0 ? "published" : "partial",
        budget: parseFloat(cBudget), budgetType: cBudgetType, accountIds: selAccounts,
        accountCount: selAccounts.length, successCount: result.summary?.successful || 0,
        failCount: result.summary?.failed || 0, publishResults: result.results, publishedAt: new Date(),
      });
      flash(`Published! ${result.summary?.successful || 0} success, ${result.summary?.failed || 0} failed`);
    } catch (e) { setPubDone(true); flash("Publish failed: " + (e.message || "Unknown error"), "error"); }
    setPublishing(false);
  };

  // Ad set helpers
  const curAdSet = adSets.find(a => a.id === activeAdSet) || adSets[0];
  const updateAdSet = (field, value) => setAdSets(prev => prev.map(a => a.id === activeAdSet ? { ...a, [field]: value } : a));
  const addAdSet = () => {
    const nid = Math.max(...adSets.map(a => a.id)) + 1;
    setAdSets(prev => [...prev, { id: nid, name: `Ad Set ${nid}`, audienceType: "broad", ageMin: 18, ageMax: 65, gender: "all", interests: [], budget: cBudget }]);
    setActiveAdSet(nid);
  };
  const removeAdSet = (id) => {
    if (adSets.length <= 1) return;
    setAdSets(prev => prev.filter(a => a.id !== id));
    if (activeAdSet === id) setActiveAdSet(adSets.find(a => a.id !== id).id);
  };

  /* ─── WebSocket Connect ─── */
  useEffect(() => {
    try {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsHost = window.location.hostname === "localhost" ? "localhost:5001" : window.location.host;
      const ws = new WebSocket(`${wsProtocol}//${wsHost}/ws`);
      ws.onopen = () => setWsConnected(true);
      ws.onmessage = (msg) => {
        try {
          const d = JSON.parse(msg.data);
          if (d.event === "publish:account") setWsResults(p => [...p, d]);
          if (d.event === "publish:progress") setPubProgress(d.percentage);
          if (d.event === "publish:complete") { setPubDone(true); setPubProgress(100); }
        } catch (e) {}
      };
      ws.onclose = () => setWsConnected(false);
      wsRef.current = ws;
    } catch (e) {}
    return () => wsRef.current?.close();
  }, []);

  /* ─── Load DB data handled in auto-connect above ─── */

  /* ─── Computed ─── */
  // Ad set helpers are defined in handlePublish section above
  const accGroups = [...new Set(accounts.map(a => a.business_name || "Default"))];
  const filteredAccs = accounts.filter(a => {
    const ms = a.name.toLowerCase().includes(accSearch.toLowerCase()) || a.id.includes(accSearch);
    const mg = accGroupFilter === "all" || (a.business_name || "Default") === accGroupFilter;
    return ms && mg;
  });
  const toggleAcc = (id) => setSelAccounts(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const selectAllFilteredAccs = () => {
    const all = filteredAccs.every(a => selAccounts.includes(a.id));
    if (all) setSelAccounts(p => p.filter(id => !filteredAccs.find(a => a.id === id)));
    else setSelAccounts(p => [...new Set([...p, ...filteredAccs.map(a => a.id)])]);
  };
  const totalDaily = parseFloat(cBudget || 0) * selAccounts.length;
  const steps = ["Campaign", "Creatives", "Ad Copy", "Ad Sets", "Accounts", "Review"];
  const canNext = () => {
    if (step === 0) return cName && cObj && cPageId;
    if (step === 1) return creatives.length > 0;
    if (step === 2) return adCopy.primaryText && adCopy.headline;
    if (step === 3) return adSets.length > 0;
    if (step === 4) return selAccounts.length > 0;
    return true;
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setCreativeFiles(p => [...p, ...files]);
    files.forEach(f => {
      const r = new FileReader();
      r.onload = (ev) => setCreatives(p => [...p, { id: Date.now() + Math.random(), name: f.name, type: f.type.startsWith("video") ? "video" : "image", preview: ev.target.result, size: (f.size / 1024 / 1024).toFixed(2) + " MB" }]);
      r.readAsDataURL(f);
    });
  };

  const resetCampaign = () => {
    setStep(0); setCName(""); setCObj(""); setCBudget("50"); setCreatives([]); setCreativeFiles([]);
    setAdCopy({ primaryText: "", headline: "", description: "", cta: "Shop Now", url: "" });
    setAdSets([{ id: 1, name: "Broad", audienceType: "broad", ageMin: 18, ageMax: 65, gender: "all", interests: [], budget: "50" }]);
    setActiveAdSet(1); setSelAccounts([]); setCBudgetMode("CBO");
    setCCountry("IN"); setCCustomCountries([]); setCPixelMode("auto"); setCPixelId("");
    setPublishing(false); setPubDone(false); setPubProgress(0); setPubResults(null); setWsResults([]);
  };

  const applyTemplate = (t) => {
    setCName((t.name || "") + " — " + new Date().toLocaleDateString());
    setCObj(t.objective || "conversions"); setCBudget(t.budget || "50");
    setAdCopy({ primaryText: t.primaryText||"", headline: t.headline||"", description: t.description||"", cta: t.cta||"Shop Now", url: t.url||"" });
    setAdSets([{ id: 1, name: t.audienceType === "broad" ? "Broad" : "Detailed", audienceType: t.audienceType || "broad", ageMin: t.ageMin || 18, ageMax: t.ageMax || 65, gender: t.gender || "all", interests: t.interests || [], budget: t.budget || "50" }]);
    setActiveAdSet(1);
    flash(`Template "${t.name}" applied!`);
  };

  /* ═══════════════════════════════════════
     STYLES  (dark industrial/utilitarian)
     ═══════════════════════════════════════ */
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.07);border-radius:10px}
    input:focus,textarea:focus,select:focus{border-color:${T.ac}!important;outline:none}
    ::selection{background:rgba(45,127,249,.3)}
    @keyframes fi{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
    @keyframes ni{from{opacity:0;transform:translateY(-14px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
    .hr:hover{background:${T.sfH}!important}.hs:hover{transform:scale(1.012)!important}
    .hg:hover{box-shadow:0 0 16px rgba(45,127,249,.1)!important;border-color:${T.bdH}!important}
  `;

  const S = {
    layout: { display:"flex", minHeight:"100vh", background:T.bg, fontFamily:FNT, color:T.tx, fontSize:14 },
    sb: { width: sbOpen?224:56, background:T.sf, borderRight:`1px solid ${T.bd}`, display:"flex", flexDirection:"column", transition:"width .25s", flexShrink:0, zIndex:10 },
    sbHead: { padding: sbOpen?"16px 14px":"16px 8px", display:"flex", alignItems:"center", gap:10, borderBottom:`1px solid ${T.bd}`, minHeight:56 },
    logo: { width:28, height:28, borderRadius:7, background:T.grad, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, color:"#fff", flexShrink:0 },
    nav: { flex:1, padding:"8px 5px", display:"flex", flexDirection:"column", gap:1 },
    ni: (a) => ({ display:"flex", alignItems:"center", gap:9, padding:sbOpen?"8px 11px":"8px 0", borderRadius:6, cursor:"pointer", transition:"all .12s", fontSize:12.5, fontWeight:a?600:500, background:a?"rgba(45,127,249,.1)":"transparent", color:a?T.ac:T.txM, justifyContent:sbOpen?"flex-start":"center", border:"none", fontFamily:FNT, width:"100%", textAlign:"left" }),
    main: { flex:1, overflow:"auto" },
    top: { position:"sticky", top:0, zIndex:5, background:"rgba(5,6,10,.9)", backdropFilter:"blur(14px)", borderBottom:`1px solid ${T.bd}`, padding:"11px 22px", display:"flex", alignItems:"center", justifyContent:"space-between" },
    ct: { padding:"20px 22px", maxWidth:1160 },
    card: { background:T.sf, borderRadius:12, border:`1px solid ${T.bd}`, padding:20, marginBottom:12, animation:"fi .25s ease" },
    cardT: { fontSize:15, fontWeight:700, marginBottom:2, letterSpacing:"-.2px" },
    cardD: { fontSize:11.5, color:T.txM, marginBottom:16 },
    lbl: { display:"block", fontSize:10.5, fontWeight:600, color:T.txM, marginBottom:5, textTransform:"uppercase", letterSpacing:".7px" },
    inp: { width:"100%", padding:"8px 12px", borderRadius:6, border:`1px solid ${T.bd}`, background:"rgba(255,255,255,.025)", color:T.tx, fontSize:12.5, fontFamily:FNT, transition:"border .2s" },
    ta: { width:"100%", padding:"8px 12px", borderRadius:6, border:`1px solid ${T.bd}`, background:"rgba(255,255,255,.025)", color:T.tx, fontSize:12.5, fontFamily:FNT, minHeight:72, resize:"vertical" },
    sel: { width:"100%", padding:"8px 12px", borderRadius:6, border:`1px solid ${T.bd}`, background:T.sf, color:T.tx, fontSize:12.5, fontFamily:FNT, cursor:"pointer" },
    row: { display:"flex", gap:11, flexWrap:"wrap" },
    col: (f=1) => ({ flex:f, minWidth:160 }),
    btn: (v="primary", d=false) => ({
      padding:"8px 18px", borderRadius:6, border:v==="ghost"?`1px solid ${T.bd}`:"none",
      fontWeight:600, fontSize:12.5, fontFamily:FNT, cursor:d?"not-allowed":"pointer",
      display:"inline-flex", alignItems:"center", gap:6, transition:"all .15s",
      background:v==="primary"?(d?"rgba(255,255,255,.05)":T.grad):v==="danger"?"rgba(231,74,59,.1)":v==="fb"?T.fb:"transparent",
      color:v==="primary"?(d?T.txD:"#fff"):v==="danger"?T.err:v==="fb"?"#fff":T.txM, opacity:d?.45:1,
    }),
    chip: (s) => ({
      display:"inline-flex", alignItems:"center", gap:4, padding:"4px 10px", borderRadius:16, fontSize:11, fontWeight:600,
      cursor:"pointer", transition:"all .1s", userSelect:"none",
      background:s?"rgba(45,127,249,.12)":"rgba(255,255,255,.03)", color:s?"#5da2fc":T.txM,
      border:s?"1px solid rgba(45,127,249,.25)":`1px solid ${T.bd}`,
    }),
    badge: (c) => ({ display:"inline-flex", padding:"2px 8px", borderRadius:16, fontSize:10, fontWeight:600, background:`${c}15`, color:c }),
    dot: (st) => ({ width:6, height:6, borderRadius:"50%", display:"inline-block", marginRight:5, background:st==="active"?T.ok:st==="disabled"?T.err:T.warn }),
    objGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(125px,1fr))", gap:6 },
    objCard: (s) => ({ padding:"11px 9px", borderRadius:8, cursor:"pointer", transition:"all .12s", textAlign:"center", background:s?"rgba(45,127,249,.1)":"rgba(255,255,255,.015)", border:s?`1.5px solid rgba(45,127,249,.35)`:`1.5px solid ${T.bd}` }),
    stepper: { display:"flex", gap:2, background:"rgba(255,255,255,.025)", borderRadius:8, padding:3, border:`1px solid ${T.bd}` },
    stepBtn: (a,d) => ({ padding:"5px 12px", borderRadius:5, fontSize:11.5, fontWeight:600, cursor:d||a?"pointer":"default", transition:"all .15s", border:"none", fontFamily:FNT, background:a?T.grad:d?"rgba(45,127,249,.08)":"transparent", color:a?"#fff":d?"#5da2fc":T.txD }),
    pbar: { width:"100%", height:5, borderRadius:8, background:"rgba(255,255,255,.05)", overflow:"hidden" },
    pfill: (p) => ({ width:`${p}%`, height:"100%", borderRadius:8, background:T.grad, transition:"width .3s" }),
    accRow: (s) => ({ display:"grid", gridTemplateColumns:"24px 1fr 80px 60px 50px 60px", gap:7, alignItems:"center", padding:"8px 12px", borderRadius:5, cursor:"pointer", transition:"all .08s", background:s?"rgba(45,127,249,.05)":"transparent" }),
    accChk: (s) => ({ width:16, height:16, borderRadius:3, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background:s?T.ac:"rgba(255,255,255,.03)", border:s?"none":`1.5px solid rgba(255,255,255,.1)`, color:"#fff" }),
    modal: { position:"fixed", inset:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,.6)", backdropFilter:"blur(5px)" },
    modalC: { background:T.sf, borderRadius:14, border:`1px solid ${T.bd}`, padding:24, width:"min(640px,92vw)", maxHeight:"85vh", overflowY:"auto", animation:"fi .2s ease" },
    notif: (t) => ({ position:"fixed", top:16, right:16, zIndex:200, padding:"10px 16px", borderRadius:8, fontSize:12.5, fontWeight:600, background:t==="success"?"rgba(28,200,138,.12)":t==="error"?"rgba(231,74,59,.12)":"rgba(45,127,249,.12)", color:t==="success"?T.ok:t==="error"?T.err:T.ac, border:`1px solid ${t==="success"?"rgba(28,200,138,.25)":t==="error"?"rgba(231,74,59,.25)":"rgba(45,127,249,.25)"}`, animation:"ni .25s ease", backdropFilter:"blur(8px)" }),
  };

  /* ═══════════════════════════════════════
     RENDER HELPERS (abbreviated for space)
     ═══════════════════════════════════════ */

  // For brevity, this renders the complete app structure
  // The key difference from v3: every data operation calls the real backend API

  const navItems = [
    { id:"dashboard", icon:"dashboard", label:"Dashboard" },
    { id:"create", icon:"plus", label:"Create Campaign" },
    { id:"campaigns", icon:"list", label:"Campaigns" },
    { id:"templates", icon:"grid", label:"Templates" },
    { id:"accounts", icon:"users", label:"Ad Accounts" },
    { id:"analytics", icon:"chart", label:"Analytics" },
    { id:"settings", icon:"gear", label:"API Settings" },
  ];

  const titles = { dashboard:"Dashboard", create:"Create Campaign", campaigns:"All Campaigns", templates:"Campaign Templates", accounts:"Ad Accounts", analytics:"Analytics", settings:"Facebook API Settings" };

  /* ── Dashboard Page ── */
  const renderDashboard = () => (
    <div style={S.ct}>
      {!apiConnected && (
        <div style={{ padding:"12px 16px", borderRadius:9, background:"rgba(246,194,62,.05)", border:"1px solid rgba(246,194,62,.2)", marginBottom:14, display:"flex", alignItems:"center", gap:10, animation:"fi .3s" }}>
          <span style={{fontSize:18}}>⚠️</span>
          <div style={{flex:1}}><div style={{fontWeight:700,fontSize:12.5,color:T.warn}}>Facebook API Not Connected</div><div style={{fontSize:11.5,color:T.txM}}>Connect your System User token to start publishing real ads</div></div>
          <button style={S.btn("ghost")} onClick={() => setPg("settings")}><Ic t="gear" sz={13}/> Connect</button>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10, marginBottom:14 }}>
        {[
          { l:"Ad Accounts", v:accounts.length||"—", c:T.ac },
          { l:"Active", v:accounts.filter(a=>a.status==="active").length||"—", c:T.ok },
          { l:"Campaigns", v:campaigns.length, c:T.ac2 },
          { l:"Templates", v:templates.length, c:T.warn },
          { l:"WebSocket", v:wsConnected?"Live":"Off", c:wsConnected?T.ok:T.err },
        ].map((k,i) => (
          <div key={i} style={{...S.card, padding:14, marginBottom:0, animation:`fi .25s ease ${i*.04}s both`}}>
            <div style={{fontSize:10,color:T.txM,textTransform:"uppercase",letterSpacing:".5px",marginBottom:5}}>{k.l}</div>
            <div style={{fontSize:20,fontWeight:800,letterSpacing:"-1px",color:k.c}}>{k.v}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(195px,1fr))",gap:10}}>
        {[
          { icon:"plus", t:"New Campaign", d:"Build from scratch", act:()=>{resetCampaign();setPg("create")} },
          { icon:"grid", t:"Templates", d:`${templates.length} ready`, act:()=>setPg("templates") },
          { icon:"gear", t:apiConnected?"API Connected":"Connect API", d:apiConnected?`${accounts.length} accounts`:"Add token", act:()=>setPg("settings") },
          { icon:"split", t:"A/B Test", d:"Compare variations", act:()=>{resetCampaign();setPg("create")} },
        ].map((q,i) => (
          <div key={i} className="hg hs" style={{...S.card, marginBottom:0, cursor:"pointer", animation:`fi .25s ease ${i*.05}s both`}} onClick={q.act}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <div style={{width:32,height:32,borderRadius:6,background:T.gradS,display:"flex",alignItems:"center",justifyContent:"center",color:T.ac}}><Ic t={q.icon}/></div>
              <div><div style={{fontWeight:700,fontSize:12.5}}>{q.t}</div><div style={{fontSize:11,color:T.txM}}>{q.d}</div></div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Campaigns */}
      {campaigns.length > 0 && (
        <div style={{...S.card, marginTop:14}}>
          <div style={S.cardT}>Recent Campaigns</div>
          {campaigns.slice(0,5).map((c,i) => (
            <div key={c.id||i} className="hr" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderRadius:5,fontSize:12.5}}>
              <div><div style={{fontWeight:600}}>{c.name}</div><div style={{fontSize:10,color:T.txD}}>{c.objective} · {c.accountCount} accounts</div></div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={S.badge(T.ok)}>{c.successCount}✓</span>
                {c.failCount > 0 && <span style={S.badge(T.err)}>{c.failCount}✕</span>}
                <span style={{...S.dot(c.status==="published"?"active":"paused")}}/><span style={{fontSize:11,color:T.txM}}>{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ── Settings (API Connection) Page ── */
  const renderSettings = () => (
    <div style={S.ct}>
      <div style={S.card}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:3}}>
          <div style={{width:36,height:36,borderRadius:8,background:"rgba(24,119,242,.1)",display:"flex",alignItems:"center",justifyContent:"center",color:T.fb}}><Ic t="fb" sz={20}/></div>
          <div><div style={S.cardT}>Facebook Marketing API</div><div style={{fontSize:11.5,color:T.txM}}>Connect via System User token</div></div>
          {apiConnected && <span style={{...S.badge(T.ok),marginLeft:"auto",padding:"3px 12px"}}>● Connected</span>}
        </div>
      </div>

      {apiConnected && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:9,marginBottom:12}}>
          {[{l:"Accounts",v:accounts.length,c:T.ac},{l:"Active",v:accounts.filter(a=>a.status==="active").length,c:T.ok},{l:"Pages",v:fbPages.length,c:T.ac2},{l:"Last Sync",v:lastSync||"—",c:T.warn}].map((s2,i)=>(
            <div key={i} style={{background:"rgba(255,255,255,.02)",borderRadius:8,border:`1px solid ${T.bd}`,padding:13}}>
              <div style={{fontSize:10,color:T.txM,textTransform:"uppercase",letterSpacing:".5px",marginBottom:4}}>{s2.l}</div>
              <div style={{fontSize:20,fontWeight:800,color:s2.c,letterSpacing:"-1px"}}>{s2.v}</div>
            </div>
          ))}
        </div>
      )}

      <div style={S.card}>
        <div style={{padding:12,background:"rgba(45,127,249,.05)",borderRadius:8,border:"1px solid rgba(45,127,249,.12)",marginBottom:16,fontSize:11.5,color:"rgba(255,255,255,.55)",lineHeight:1.7}}>
          <div style={{fontWeight:700,color:T.ac,marginBottom:4,fontSize:12.5}}>📋 Setup Steps:</div>
          <div><b>1.</b> Go to business.facebook.com → Settings → System Users</div>
          <div><b>2.</b> Create System User (Admin) → Generate Token with <code style={{color:T.ac2,fontFamily:MONO,fontSize:10.5}}>ads_management, ads_read, business_management</code></div>
          <div><b>3.</b> Copy Business ID from Business Settings → Business Info</div>
          <div><b>4.</b> Assign all ad accounts to the System User with Full Control</div>
        </div>

        <div style={{...S.row,marginBottom:12}}>
          <div style={S.col()}><label style={S.lbl}>Business ID *</label><input style={{...S.inp,fontFamily:MONO}} value={fbBizId} onChange={e=>setFbBizId(e.target.value)} placeholder="1234567890" disabled={apiConnected}/></div>
          <div style={S.col()}><label style={S.lbl}>App ID (optional)</label><input style={{...S.inp,fontFamily:MONO}} value={fbAppId} onChange={e=>setFbAppId(e.target.value)} placeholder="9876543210" disabled={apiConnected}/></div>
        </div>
        <div style={{marginBottom:12}}>
          <label style={S.lbl}>System User Access Token *</label>
          <div style={{position:"relative"}}>
            <input type={showToken?"text":"password"} style={{...S.inp,fontFamily:MONO,paddingRight:36}} value={fbToken} onChange={e=>setFbToken(e.target.value)} placeholder="EAAxxxxxxx..." disabled={apiConnected}/>
            <button style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:T.txM,cursor:"pointer"}} onClick={()=>setShowToken(!showToken)}><Ic t={showToken?"eyeOff":"eye"} sz={14}/></button>
          </div>
        </div>
        <div style={{marginBottom:12}}>
          <label style={S.lbl}>App Secret (optional)</label>
          <div style={{position:"relative"}}>
            <input type={showSecret?"text":"password"} style={{...S.inp,fontFamily:MONO,paddingRight:36}} value={fbAppSecret} onChange={e=>setFbAppSecret(e.target.value)} placeholder="Secret..." disabled={apiConnected}/>
            <button style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:T.txM,cursor:"pointer"}} onClick={()=>setShowSecret(!showSecret)}><Ic t={showSecret?"eyeOff":"eye"} sz={14}/></button>
          </div>
        </div>
        {apiError && <div style={{padding:8,borderRadius:6,background:"rgba(231,74,59,.07)",border:"1px solid rgba(231,74,59,.2)",color:T.err,fontSize:12,marginBottom:12}}>{apiError}</div>}
        <div style={{display:"flex",gap:8}}>
          {!apiConnected ? (
            <button style={S.btn("fb")} onClick={connectApi} disabled={apiLoading}>
              {apiLoading?<><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⚙️</span> Connecting...</>:<><Ic t="fb" sz={14}/> Connect Facebook API</>}
            </button>
          ) : (
            <>
              <button style={S.btn("ghost")} onClick={fetchAccounts} disabled={accLoading}><Ic t="refresh" sz={13}/> {accLoading?"Syncing...":"Refresh"}</button>
              <button style={S.btn("danger")} onClick={disconnectApi}><Ic t="x" sz={13}/> Disconnect</button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  /* ── Create Campaign (6 Steps) ── */
  const renderCreate = () => {
    const stepContent = [
      // Step 0: Setup
      () => (
        <div style={S.card}>
          <div style={S.cardT}>Campaign Setup</div><div style={S.cardD}>Name, objective, budget, location, pixel, and Facebook Page</div>
          <div style={{marginBottom:14}}><label style={S.lbl}>Campaign Name</label><input style={S.inp} value={cName} onChange={e=>setCName(e.target.value)} placeholder="e.g. Summer Sale 2026"/></div>
          <label style={S.lbl}>Objective</label>
          <div style={{...S.objGrid,marginBottom:14}}>{OBJECTIVES.map(o=><div key={o.id} className="hs" style={S.objCard(cObj===o.id)} onClick={()=>setCObj(o.id)}><div style={{fontSize:18,marginBottom:2}}>{o.icon}</div><div style={{fontSize:11,fontWeight:700}}>{o.label}</div></div>)}</div>
          <div style={S.row}>
            <div style={S.col()}><label style={S.lbl}>Facebook Page *</label>
              <select style={S.sel} value={cPageId} onChange={e=>setCPageId(e.target.value)}>
                <option value="">Select page...</option>
                {fbPages.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                {fbPages.length===0 && <option disabled>Connect API to load pages</option>}
              </select>
            </div>
            <div style={S.col()}><label style={S.lbl}>Budget ($)</label><input style={S.inp} type="number" value={cBudget} onChange={e=>setCBudget(e.target.value)}/></div>
            <div style={S.col()}><label style={S.lbl}>Bid Strategy</label>
              <select style={S.sel} value={cBidStrategy} onChange={e=>setCBidStrategy(e.target.value)}>
                <option value="LOWEST_COST_WITHOUT_CAP">Lowest Cost</option>
                <option value="COST_CAP">Cost Cap</option>
                <option value="BID_CAP">Bid Cap</option>
                <option value="MINIMUM_ROAS">Min ROAS</option>
              </select>
            </div>
          </div>

          {/* Location Selector */}
          <div style={{borderTop:`1px solid ${T.bd}`,paddingTop:14,marginTop:14}}>
            <label style={S.lbl}>Target Location</label>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
              {COUNTRIES.slice(0,8).map(c=>(
                <div key={c.code} className="hs" style={{padding:"6px 10px",borderRadius:7,fontSize:11.5,fontWeight:600,cursor:"pointer",border:cCountry===c.code&&cCustomCountries.length===0?`1.5px solid ${T.ac}`:`1px solid ${T.bd}`,background:cCountry===c.code&&cCustomCountries.length===0?"rgba(45,127,249,.1)":"rgba(255,255,255,.02)",color:cCountry===c.code&&cCustomCountries.length===0?T.ac:T.txM}} onClick={()=>{setCCountry(c.code);setCCustomCountries([])}}>
                  {c.flag} {c.name}
                </div>
              ))}
              <div className="hs" style={{padding:"6px 10px",borderRadius:7,fontSize:11.5,fontWeight:600,cursor:"pointer",border:cCustomCountries.length>0?`1.5px solid ${T.ac2}`:`1px solid ${T.bd}`,background:cCustomCountries.length>0?"rgba(155,89,245,.1)":"rgba(255,255,255,.02)",color:cCustomCountries.length>0?T.ac2:T.txM}} onClick={()=>{if(cCustomCountries.length===0)setCCustomCountries([cCountry])}}>
                + Custom
              </div>
            </div>
            {cCustomCountries.length>0&&(
              <div style={{marginBottom:6}}>
                <select style={S.sel} onChange={e=>{if(e.target.value&&!cCustomCountries.includes(e.target.value)){setCCustomCountries(p=>[...p,e.target.value])}e.target.value=""}} value="">
                  <option value="">Add country...</option>
                  {COUNTRIES.filter(c=>!cCustomCountries.includes(c.code)).map(c=><option key={c.code} value={c.code}>{c.flag} {c.name} ({c.code})</option>)}
                </select>
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>
                  {cCustomCountries.map(cc=>{const ct=COUNTRIES.find(c=>c.code===cc);return(
                    <span key={cc} style={S.chip(true)} onClick={()=>setCCustomCountries(p=>p.filter(x=>x!==cc))}>{ct?ct.flag:""} {ct?.name||cc} x</span>
                  )})}
                </div>
              </div>
            )}
            <div style={{padding:7,background:"rgba(28,200,138,.06)",borderRadius:6,border:"1px solid rgba(28,200,138,.1)",fontSize:11,color:T.ok}}>
              Target: <b>{cCustomCountries.length>0?cCustomCountries.map(c=>COUNTRIES.find(x=>x.code===c)?.name||c).join(", "):(COUNTRIES.find(c=>c.code===cCountry)?.flag+" "+COUNTRIES.find(c=>c.code===cCountry)?.name||cCountry)}</b>
            </div>
          </div>

          {/* Pixel Selector */}
          {["conversions","sales","leads"].includes(cObj)&&(
            <div style={{borderTop:`1px solid ${T.bd}`,paddingTop:14,marginTop:14}}>
              <label style={S.lbl}>Conversion Pixel</label>
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                {["auto","specific"].map(m=>(
                  <div key={m} className="hs" style={{padding:"7px 14px",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer",border:cPixelMode===m?`1.5px solid ${T.ac}`:`1px solid ${T.bd}`,background:cPixelMode===m?"rgba(45,127,249,.1)":"rgba(255,255,255,.02)",color:cPixelMode===m?T.ac:T.txM,flex:1,textAlign:"center"}} onClick={()=>{setCPixelMode(m);if(m==="auto")setCPixelId("")}}>
                    {m==="auto"?"Auto-detect per account":"Select specific pixel"}
                  </div>
                ))}
              </div>
              {cPixelMode==="auto"&&(
                <div style={{padding:8,background:"rgba(45,127,249,.05)",borderRadius:7,border:"1px solid rgba(45,127,249,.1)",fontSize:11.5,color:T.txM}}>
                  <b style={{color:T.ac}}>Auto mode:</b> System fetches the first pixel from each ad account automatically. Best when accounts have different pixels.
                </div>
              )}
              {cPixelMode==="specific"&&(
                <div>
                  <div style={{padding:8,background:"rgba(155,89,245,.05)",borderRadius:7,border:"1px solid rgba(155,89,245,.1)",fontSize:11.5,color:T.txM,marginBottom:8}}>
                    <b style={{color:T.ac2}}>Manual mode:</b> Enter a Pixel ID to use for ALL accounts.
                  </div>
                  <input style={{...S.inp,fontFamily:MONO}} value={cPixelId} onChange={e=>setCPixelId(e.target.value)} placeholder="Pixel ID (e.g. 817841624449303)"/>
                  {/* Known pixels from your accounts */}
                  <div style={{marginTop:8}}>
                    {[{id:"817841624449303",name:"Latest pixel - Nov 2025"},{id:"1501496027627536",name:"Toys Adsmit"},{id:"801420225589210",name:"Unibuds"}].map(p=>(
                      <div key={p.id} className="hr" style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:7,border:cPixelId===p.id?`1.5px solid ${T.ac}`:`1px solid ${T.bd}`,background:cPixelId===p.id?"rgba(45,127,249,.06)":"rgba(255,255,255,.02)",marginBottom:4,cursor:"pointer"}} onClick={()=>setCPixelId(p.id)}>
                        <div style={{width:16,height:16,borderRadius:"50%",border:cPixelId===p.id?`2px solid ${T.ac}`:`2px solid ${T.bd}`,display:"flex",alignItems:"center",justifyContent:"center"}}>{cPixelId===p.id&&<div style={{width:8,height:8,borderRadius:"50%",background:T.ac}}/>}</div>
                        <div style={{flex:1}}><div style={{fontSize:12.5,fontWeight:600}}>{p.name}</div><div style={{fontSize:10.5,color:T.txD,fontFamily:MONO}}>{p.id}</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ),
      // Step 1: Creatives
      () => (
        <div style={S.card}>
          <div style={S.cardT}>Upload Creatives</div><div style={S.cardD}>These will be uploaded to each ad account via POST /adimages</div>
          <div style={{border:`2px dashed ${T.bd}`,borderRadius:10,padding:"28px 14px",textAlign:"center",cursor:"pointer",background:"rgba(255,255,255,.01)"}} onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();handleFileUpload({target:{files:e.dataTransfer.files}})}}>
            <Ic t="up" sz={28}/><div style={{marginTop:6,fontSize:12.5,fontWeight:600}}>Drag & drop or click</div><div style={{fontSize:11,color:T.txD,marginTop:2}}>PNG, JPG, MP4 — Max 30MB</div>
            <input ref={fileRef} type="file" multiple accept="image/*,video/*" style={{display:"none"}} onChange={handleFileUpload}/>
          </div>
          {creatives.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))",gap:7,marginTop:10}}>
            {creatives.map(c=><div key={c.id} style={{position:"relative",borderRadius:8,overflow:"hidden",aspectRatio:"1",background:"rgba(255,255,255,.02)",border:`1px solid ${T.bd}`}}>
              {c.type==="image"?<img src={c.preview} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<video src={c.preview} style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
              <button style={{position:"absolute",top:3,right:3,width:18,height:18,borderRadius:"50%",background:"rgba(0,0,0,.7)",border:"none",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>{setCreatives(p=>p.filter(x=>x.id!==c.id));setCreativeFiles(p=>p.filter((_,i)=>i!==creatives.findIndex(x=>x.id===c.id)))}}><Ic t="x" sz={8}/></button>
            </div>)}
          </div>}
        </div>
      ),
      // Step 2: Ad Copy (single copy for all ads) + AI Generator
      () => (
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
            <div style={S.cardT}>Ad Copy</div>
            <span style={S.badge(T.ac2)}>AI Powered</span>
          </div>
          <div style={S.cardD}>Write your own copy or let AI generate high-converting ad copy from your landing page.</div>

          {/* AI Generator Section */}
          <div style={{padding:14,background:"linear-gradient(135deg,rgba(155,89,245,.08),rgba(45,127,249,.08))",borderRadius:10,border:"1px solid rgba(155,89,245,.15)",marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:16}}>🤖</span>
              <span style={{fontSize:13,fontWeight:700,color:T.ac2}}>AI Ad Copy Generator</span>
            </div>
            <div style={{fontSize:11.5,color:T.txM,marginBottom:10}}>Paste your landing page URL and AI will analyze it to write high-converting ad copy with emojis, hooks, and CTAs.</div>
            <div style={{display:"flex",gap:8}}>
              <input style={{...S.inp,flex:1}} value={aiUrl} onChange={e=>setAiUrl(e.target.value)} placeholder="https://yoursite.com/product-page"/>
              <button style={{...S.btn("primary"),whiteSpace:"nowrap",minWidth:140}} onClick={generateAiCopy} disabled={aiLoading}>
                {aiLoading?"Generating...":"🤖 Generate Copy"}
              </button>
            </div>
            {aiLoading&&<div style={{marginTop:8,fontSize:11.5,color:T.ac2}}>Analyzing landing page and writing high-converting copy...</div>}
          </div>

          {/* AI Variations */}
          {aiVariations.length>0&&(
            <div style={{marginBottom:16}}>
              <label style={S.lbl}>AI Generated Variations — Click to apply</label>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {aiVariations.map((v,i)=>(
                  <div key={i} className="hr" style={{padding:12,borderRadius:8,border:`1px solid ${adCopy.primaryText===v.primaryText?T.ac:T.bd}`,background:adCopy.primaryText===v.primaryText?"rgba(45,127,249,.06)":"rgba(255,255,255,.02)",cursor:"pointer"}} onClick={()=>setAdCopy(p=>({...p,primaryText:v.primaryText,headline:v.headline,description:v.description}))}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:11,fontWeight:700,color:T.ac2}}>Variation {String.fromCharCode(65+i)}</span>
                      {adCopy.primaryText===v.primaryText&&<span style={S.badge(T.ac)}>Active</span>}
                    </div>
                    <div style={{fontSize:12.5,lineHeight:1.5,marginBottom:4}}>{v.primaryText}</div>
                    <div style={{fontSize:11,color:T.txM}}>Headline: <b style={{color:T.tx}}>{v.headline}</b></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual Ad Copy Fields */}
          <div style={{marginBottom:12}}><label style={S.lbl}>Primary Text</label><textarea style={{...S.ta,minHeight:80}} value={adCopy.primaryText} onChange={e=>setAdCopy(p=>({...p,primaryText:e.target.value}))} placeholder="Ad copy text with emojis..."/></div>
          <div style={{...S.row,marginBottom:12}}><div style={S.col()}><label style={S.lbl}>Headline</label><input style={S.inp} value={adCopy.headline} onChange={e=>setAdCopy(p=>({...p,headline:e.target.value}))} placeholder="Headline"/></div><div style={S.col()}><label style={S.lbl}>Description</label><input style={S.inp} value={adCopy.description} onChange={e=>setAdCopy(p=>({...p,description:e.target.value}))} placeholder="Description"/></div></div>
          <div style={S.row}><div style={S.col()}><label style={S.lbl}>CTA</label><select style={S.sel} value={adCopy.cta} onChange={e=>setAdCopy(p=>({...p,cta:e.target.value}))}>{CTA_OPTIONS.map(c=><option key={c}>{c}</option>)}</select></div><div style={S.col()}><label style={S.lbl}>Website URL</label><input style={S.inp} value={adCopy.url} onChange={e=>setAdCopy(p=>({...p,url:e.target.value}))} placeholder="https://yoursite.com"/></div></div>
          <div style={{marginTop:14,padding:10,background:"rgba(45,127,249,.05)",borderRadius:8,border:"1px solid rgba(45,127,249,.12)",fontSize:11.5,color:T.txM}}>
            {creatives.length} video{creatives.length!==1?"s":""} uploaded → {creatives.length} ad{creatives.length!==1?"s":""} per ad set, across all accounts.
          </div>
        </div>
      ),
      // Step 3: Ad Sets (multiple, each with own targeting)
      () => (
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
            <div style={S.cardT}>Ad Sets <span style={S.badge(T.ac)}>{adSets.length}</span></div>
            <button style={S.btn("ghost")} onClick={addAdSet}><Ic t="plus" sz={12}/> Add Ad Set</button>
          </div>
          <div style={S.cardD}>Each ad set can have different targeting. All {creatives.length} videos go into every ad set.</div>

          {/* Budget Mode Toggle */}
          <div style={{...S.row,marginBottom:14}}>
            <div style={S.col()}>
              <label style={S.lbl}>Budget Mode</label>
              <div style={{display:"flex",gap:6}}>
                {["CBO","ABO"].map(m=><button key={m} style={{...S.btn(cBudgetMode===m?"primary":"ghost"),flex:1,justifyContent:"center"}} onClick={()=>setCBudgetMode(m)}>{m === "CBO" ? "CBO (Campaign Budget)" : "ABO (Per Ad Set)"}</button>)}
              </div>
            </div>
            {cBudgetMode==="CBO"&&<div style={S.col()}><label style={S.lbl}>Campaign Budget ($)</label><input style={S.inp} type="number" value={cBudget} onChange={e=>setCBudget(e.target.value)}/></div>}
          </div>

          {/* Ad Set Tabs */}
          <div style={{display:"flex",gap:2,borderBottom:`1px solid ${T.bd}`,marginBottom:14,flexWrap:"wrap"}}>
            {adSets.map((as,i)=>(
              <div key={as.id} style={{padding:"7px 14px",borderRadius:"7px 7px 0 0",fontSize:12,fontWeight:600,cursor:"pointer",background:activeAdSet===as.id?T.sf:"transparent",color:activeAdSet===as.id?T.tx:T.txM,border:activeAdSet===as.id?`1px solid ${T.bd}`:"1px solid transparent",borderBottom:activeAdSet===as.id?`1px solid ${T.sf}`:"none",marginBottom:-1,display:"flex",alignItems:"center",gap:6}} onClick={()=>setActiveAdSet(as.id)}>
                {as.name||`Ad Set ${i+1}`}
                {adSets.length>1&&<span style={{cursor:"pointer",color:T.txD,fontSize:14}} onClick={e=>{e.stopPropagation();removeAdSet(as.id)}}>×</span>}
              </div>
            ))}
          </div>

          {/* Active Ad Set Config */}
          <div style={{...S.row,marginBottom:12}}>
            <div style={S.col(2)}><label style={S.lbl}>Ad Set Name</label><input style={S.inp} value={curAdSet.name} onChange={e=>updateAdSet("name",e.target.value)} placeholder="e.g. Broad, Interest - Fitness, Retarget"/></div>
            {cBudgetMode==="ABO"&&<div style={S.col()}><label style={S.lbl}>Ad Set Budget ($)</label><input style={S.inp} type="number" value={curAdSet.budget} onChange={e=>updateAdSet("budget",e.target.value)}/></div>}
          </div>

          <label style={S.lbl}>Audience Type</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
            {[{id:"broad",l:"🌐 Broad (Advantage+)"},{id:"detailed",l:"🎯 Detailed (Interests)"},{id:"custom",l:"👤 Custom Audience"},{id:"lookalike",l:"👥 Lookalike"}].map(t=><div key={t.id} className="hs" style={{...S.objCard(curAdSet.audienceType===t.id),flex:"1 1 130px",padding:"10px 8px"}} onClick={()=>updateAdSet("audienceType",t.id)}><div style={{fontSize:11.5,fontWeight:700}}>{t.l}</div></div>)}
          </div>

          {curAdSet.audienceType!=="broad"&&(
            <div style={{animation:"fi .2s"}}>
              <div style={{...S.row,marginBottom:12}}>
                <div style={S.col()}><label style={S.lbl}>Age</label><div style={{display:"flex",gap:5,alignItems:"center"}}><select style={S.sel} value={curAdSet.ageMin} onChange={e=>updateAdSet("ageMin",+e.target.value)}>{Array.from({length:48},(_,i)=>i+18).map(a=><option key={a}>{a}</option>)}</select><span style={{color:T.txD}}>–</span><select style={S.sel} value={curAdSet.ageMax} onChange={e=>updateAdSet("ageMax",+e.target.value)}>{Array.from({length:48},(_,i)=>i+18).filter(a=>a>=curAdSet.ageMin).map(a=><option key={a}>{a}</option>)}</select></div></div>
                <div style={S.col()}><label style={S.lbl}>Gender</label><select style={S.sel} value={curAdSet.gender} onChange={e=>updateAdSet("gender",e.target.value)}><option value="all">All</option><option value="male">Male</option><option value="female">Female</option></select></div>
              </div>
              <div style={{marginBottom:12}}>
                <label style={S.lbl}>Search Interests</label>
                <input style={S.inp} value={interestQuery} onChange={e=>{setInterestQuery(e.target.value);searchInterests(e.target.value)}} placeholder="Type to search..."/>
                {interestResults.length>0&&<div style={{marginTop:6,padding:8,background:"rgba(255,255,255,.02)",borderRadius:6,border:`1px solid ${T.bd}`,maxHeight:140,overflowY:"auto"}}>{interestResults.map(i=><div key={i.id} className="hr" style={{padding:"5px 8px",borderRadius:4,cursor:"pointer",fontSize:12,display:"flex",justifyContent:"space-between"}} onClick={()=>{updateAdSet("interests",[...(curAdSet.interests||[]),i]);setInterestResults([]);setInterestQuery("")}}><span>{i.name}</span><span style={{fontSize:10,color:T.txD}}>{i.audience_size_lower_bound?.toLocaleString()}</span></div>)}</div>}
                {curAdSet.interests?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>{curAdSet.interests.map((i,idx)=><span key={idx} style={S.chip(true)} onClick={()=>updateAdSet("interests",curAdSet.interests.filter((_,j)=>j!==idx))}>{i.name||i} ×</span>)}</div>}
              </div>
            </div>
          )}

          <div style={{padding:10,background:"rgba(28,200,138,.06)",borderRadius:8,border:"1px solid rgba(28,200,138,.15)"}}>
            <div style={{fontSize:12,fontWeight:600,color:T.ok}}>Advantage+ Placements (Auto)</div>
            <div style={{fontSize:11,color:T.txM}}>All ad sets use auto-placement for best performance.</div>
          </div>

          {/* Summary */}
          <div style={{marginTop:12,padding:10,background:"rgba(155,89,245,.06)",borderRadius:8,border:"1px solid rgba(155,89,245,.15)",fontSize:12,color:T.ac2}}>
            <b>Structure preview:</b> 1 Campaign → {adSets.length} Ad Set{adSets.length>1?"s":""} → {creatives.length} Ad{creatives.length>1?"s":""} each = <b>{adSets.length * creatives.length} total ads per account</b>
          </div>
        </div>
      ),
      // Step 4: Accounts
      () => (
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:3}}>
            <div><div style={S.cardT}>Select Ad Accounts</div><div style={S.cardD}>{apiConnected?`${accounts.length} accounts from Facebook API`:"Connect API in Settings first"}</div></div>
            <div style={{display:"flex",gap:5,alignItems:"center"}}><span style={S.badge(T.ac)}>{selAccounts.length} selected</span><button style={S.btn("ghost")} onClick={selectAllFilteredAccs}>{filteredAccs.every(a=>selAccounts.includes(a.id))?"Deselect":"Select"} All</button></div>
          </div>
          {!apiConnected&&<div style={{padding:12,borderRadius:8,background:"rgba(246,194,62,.05)",border:"1px solid rgba(246,194,62,.2)",marginBottom:12,fontSize:12}}>⚠️ <span style={{color:T.ac,cursor:"pointer",fontWeight:600}} onClick={()=>setPg("settings")}>Connect Facebook API →</span></div>}
          {savedGroups.length>0&&<div style={{marginBottom:10}}><label style={S.lbl}>Saved Groups</label><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{savedGroups.map((g,i)=><button key={i} style={{...S.btn("ghost"),padding:"4px 9px",fontSize:11}} onClick={()=>{setSelAccounts(g.accountIds||[]);flash(`Loaded "${g.name}"`);}}>{g.name} ({(g.accountIds||[]).length})</button>)}{!showNewGrp?<button style={{...S.btn("ghost"),padding:"4px 9px",fontSize:11,color:T.ac}} onClick={()=>setShowNewGrp(true)}>+ Save</button>:<div style={{display:"flex",gap:4}}><input style={{...S.inp,width:120,padding:"4px 7px",fontSize:11}} value={newGrpName} onChange={e=>setNewGrpName(e.target.value)} placeholder="Name" onKeyDown={e=>e.key==="Enter"&&saveGroup()}/><button style={{...S.btn("primary"),padding:"4px 8px",fontSize:11}} onClick={saveGroup}>Save</button><button style={{...S.btn("ghost"),padding:"4px 8px",fontSize:11}} onClick={()=>setShowNewGrp(false)}>✕</button></div>}</div></div>}
          <div style={{...S.row,marginBottom:8}}>
            <div style={{...S.col(2),position:"relative"}}><div style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:T.txD}}><Ic t="search" sz={13}/></div><input style={{...S.inp,paddingLeft:28}} placeholder="Search..." value={accSearch} onChange={e=>setAccSearch(e.target.value)}/></div>
            <div style={S.col()}><select style={S.sel} value={accGroupFilter} onChange={e=>setAccGroupFilter(e.target.value)}><option value="all">All Groups</option>{accGroups.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"24px 1fr 80px 60px 50px 60px",gap:7,padding:"4px 12px",fontSize:10,textTransform:"uppercase",letterSpacing:".5px",color:T.txD,fontWeight:600}}><div/><div>Account</div><div>Group</div><div>Spend</div><div>Pixel</div><div>Status</div></div>
          <div style={{maxHeight:300,overflowY:"auto"}}>{filteredAccs.map((a,i)=>(
            <div key={a.id} className="hr" style={{...S.accRow(selAccounts.includes(a.id)),animation:`fi .12s ease ${i*.012}s both`}} onClick={()=>toggleAcc(a.id)}>
              <div style={S.accChk(selAccounts.includes(a.id))}>{selAccounts.includes(a.id)&&<Ic t="check" sz={8}/>}</div>
              <div><div style={{fontSize:12,fontWeight:600}}>{a.name}</div><div style={{fontSize:10,color:T.txD,fontFamily:MONO}}>{a.id}</div></div>
              <div style={{fontSize:11,color:T.txM}}>{a.business_name||"—"}</div>
              <div style={{fontSize:11,fontFamily:MONO,color:T.txM}}>${parseFloat(a.amount_spent||0).toLocaleString()}</div>
              <div>{a.pixel?<span style={S.badge(T.ok)}>✓</span>:<span style={S.badge(T.txD)}>—</span>}</div>
              <div><span style={S.dot(a.status)}/><span style={{fontSize:11,color:T.txM}}>{a.status}</span></div>
            </div>
          ))}{filteredAccs.length===0&&<div style={{textAlign:"center",padding:24,color:T.txD}}>No accounts</div>}</div>
        </div>
      ),
      // Step 5: Review & Publish
      () => {
        if (publishing || pubDone) {
          const res = pubResults;
          const okC = res?.summary?.successful || wsResults.filter(r=>r.success).length;
          const failC = res?.summary?.failed || wsResults.filter(r=>!r.success).length;
          return (
            <div style={S.card}>
              <div style={{textAlign:"center",marginBottom:16}}>
                {pubDone?<><div style={{fontSize:42,marginBottom:4}}>🎉</div><div style={{fontSize:17,fontWeight:800}}>Published!</div><div style={{color:T.txM,fontSize:12}}>{okC} success{failC>0?` · ${failC} failed`:""}</div></>:<><div style={{fontSize:42,marginBottom:4,animation:"spin 2s linear infinite"}}>⚙️</div><div style={{fontSize:17,fontWeight:800}}>Publishing to Facebook...</div><div style={{color:T.txM,fontSize:12}}>Creating campaigns via Graph API</div></>}
              </div>
              <div style={{...S.pbar,marginBottom:12}}><div style={S.pfill(pubProgress)}/></div>
              <div style={{maxHeight:240,overflowY:"auto"}}>
                {(wsResults.length>0?wsResults:res?.results||[]).map((r,i) => {
                  const acc = accounts.find(a=>a.id===(r.accountId));
                  const ok = r.success;
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 10px",borderRadius:4,marginBottom:2,background:ok?"rgba(28,200,138,.03)":"rgba(231,74,59,.03)"}}>
                      <div style={{width:16,height:16,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,background:ok?"rgba(28,200,138,.12)":"rgba(231,74,59,.12)",color:ok?T.ok:T.err}}>{ok?"✓":"✕"}</div>
                      <div style={{flex:1,fontSize:12,fontWeight:500}}>{acc?.name||r.accountId}</div>
                      {ok&&<div style={{fontSize:10,color:T.ok}}>{r.data?.ad_sets} sets · {r.data?.total_ads} ads</div>}
                      {!ok&&<div style={{fontSize:10,color:T.err}}>{r.error||"Failed"}</div>}
                      <div style={{fontSize:10,fontWeight:600,color:ok?T.ok:T.err}}>{ok?"Live":"Failed"}</div>
                    </div>
                  );
                })}
              </div>
              {pubDone&&<div style={{display:"flex",gap:7,justifyContent:"center",marginTop:14}}><button style={S.btn("primary")} onClick={()=>{resetCampaign();setPg("dashboard")}}>Dashboard</button><button style={S.btn("ghost")} onClick={resetCampaign}>New Campaign</button></div>}
            </div>
          );
        }
        const obj = OBJECTIVES.find(o=>o.id===cObj);
        const totalAdsPerAccount = adSets.length * creatives.length;
        return (
          <div style={S.card}>
            <div style={S.cardT}>Review & Launch</div><div style={S.cardD}>Publishing to {selAccounts.length} accounts × {adSets.length} ad sets × {creatives.length} videos</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12,marginBottom:16}}>
              {[{l:"Campaign",v:cName},{l:"Objective",v:`${obj?.icon} ${obj?.label}`},{l:"Budget",v:`$${cBudget} ${cBudgetType} (${cBudgetMode})`},{l:"Page",v:fbPages.find(p=>p.id===cPageId)?.name||cPageId},{l:"Videos",v:creatives.length},{l:"Ad Sets",v:adSets.map(a=>a.name).join(", ")},{l:"Ads per Account",v:totalAdsPerAccount},{l:"Total Ads",v:totalAdsPerAccount * selAccounts.length}].map((it,i)=><div key={i}><div style={{fontSize:10,fontWeight:600,color:T.txD,textTransform:"uppercase",letterSpacing:".5px",marginBottom:2}}>{it.l}</div><div style={{fontSize:12.5,fontWeight:600}}>{it.v}</div></div>)}
            </div>
            {/* Ad Sets Summary */}
            <div style={{marginBottom:14}}>
              {adSets.map((as,i)=>(
                <div key={as.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:6,background:"rgba(255,255,255,.02)",border:`1px solid ${T.bd}`,marginBottom:4,fontSize:12}}>
                  <span style={S.badge(T.ac2)}>{as.audienceType}</span>
                  <span style={{fontWeight:600}}>{as.name}</span>
                  <span style={{color:T.txM}}>→ {creatives.length} ads</span>
                  {cBudgetMode==="ABO"&&<span style={{marginLeft:"auto",fontFamily:MONO,color:T.ac}}>${as.budget}/day</span>}
                </div>
              ))}
            </div>
            <div style={{padding:16,background:T.gradS,borderRadius:10,border:"1px solid rgba(45,127,249,.12)",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
              <div><div style={{fontSize:34,fontWeight:900,letterSpacing:"-2px",background:T.grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{selAccounts.length}</div><div style={{fontSize:10,color:T.txM}}>Accounts</div></div>
              <div style={{width:1,height:32,background:T.bd}}/>
              <div><div style={{fontSize:20,fontWeight:800,color:T.ac}}>{totalAdsPerAccount * selAccounts.length}</div><div style={{fontSize:10,color:T.txM}}>Total Ads</div></div>
              <div style={{width:1,height:32,background:T.bd}}/>
              <div><div style={{fontSize:20,fontWeight:800,color:T.ac2}}>${totalDaily.toLocaleString()}/day</div><div style={{fontSize:10,color:T.txM}}>Est. Spend</div></div>
              <button style={{...S.btn("primary"),marginLeft:"auto",padding:"11px 26px",fontSize:13.5}} onClick={handlePublish}>🚀 Publish to Facebook</button>
            </div>
            <div style={{fontSize:11,color:T.warn,marginTop:8}}>⚠️ Campaigns created as PAUSED. Activate in Ads Manager after review.</div>
          </div>
        );
      },
    ];

    return (
      <div style={S.ct}>
        <div style={{...S.stepper,marginBottom:16}}>{steps.map((st,i)=><button key={i} style={S.stepBtn(step===i,i<step)} onClick={()=>i<=step&&!publishing&&setStep(i)}>{i<step?"✓ ":`${i+1}. `}{st}</button>)}</div>
        {stepContent[step]()}
        {step<5&&!publishing&&<div style={{display:"flex",justifyContent:"space-between",marginTop:7}}><button style={S.btn("ghost")} onClick={()=>setStep(Math.max(0,step-1))} disabled={step===0}>← Back</button><button style={S.btn("primary",!canNext())} onClick={()=>canNext()&&setStep(step+1)} disabled={!canNext()}>{step===4?"Review →":"Continue →"}</button></div>}
      </div>
    );
  };

  /* ── Templates Page ── */
  const renderTemplates = () => (
    <div style={S.ct}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={{fontSize:14,fontWeight:700}}>Templates</div><div style={{fontSize:11.5,color:T.txM}}>Pre-built and custom</div></div>
        <button style={S.btn("primary")} onClick={()=>{setEditTplId(null);setTpl({name:"",icon:"🎯",objective:"conversions",budget:"50",audienceType:"broad",placements:["fb_feed","ig_feed"],primaryText:"",headline:"",description:"",cta:"Shop Now",url:"",ageMin:18,ageMax:65,gender:"all",interests:[]});setShowTplEditor(true)}}><Ic t="plus" sz={13}/> Create Template</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
        {templates.map((t,i)=>(
          <div key={t.id} className="hg" style={{...S.card,marginBottom:0,animation:`fi .25s ease ${i*.04}s both`}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:9,marginBottom:8}}>
              <div style={{fontSize:24}}>{t.icon}</div>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{t.name}</div><div style={{display:"flex",gap:4,marginTop:3,flexWrap:"wrap"}}><span style={S.badge(T.ac)}>{OBJECTIVES.find(o=>o.id===t.objective)?.label||t.objective}</span><span style={S.badge(T.ac2)}>${t.budget}/day</span>{!t.isDefault&&<span style={S.badge(T.warn)}>Custom</span>}</div></div>
            </div>
            <div style={{padding:8,background:"rgba(255,255,255,.015)",borderRadius:6,border:`1px solid ${T.bd}`,marginBottom:8}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,.45)",lineHeight:1.4,marginBottom:2}}>{(t.primaryText||"").slice(0,90)}{(t.primaryText||"").length>90?"…":""}</div>
              <div style={{fontSize:12,fontWeight:700}}>{t.headline}</div>
            </div>
            <div style={{display:"flex",gap:5}}>
              <button style={{...S.btn("primary"),flex:1,justifyContent:"center",padding:"6px 10px"}} onClick={()=>{applyTemplate(t);setPg("create");setStep(0)}}><Ic t="zap" sz={11}/> Use</button>
              {!t.isDefault&&<button style={{...S.btn("ghost"),padding:"6px 8px"}} onClick={()=>{setEditTplId(t.id);setTpl({name:t.name,icon:t.icon,objective:t.objective,budget:t.budget,audienceType:t.audienceType,placements:t.placements||[],primaryText:t.primaryText||"",headline:t.headline||"",description:t.description||"",cta:t.cta||"Shop Now",url:t.url||"",ageMin:t.ageMin||18,ageMax:t.ageMax||65,gender:t.gender||"all",interests:t.interests||[]});setShowTplEditor(true)}}><Ic t="edit" sz={11}/></button>}
              {!t.isDefault&&<button style={{...S.btn("danger"),padding:"6px 8px"}} onClick={async()=>{await api.del(`/api/db/templates/${t.id}`);loadTemplates();flash("Deleted")}}><Ic t="trash" sz={11}/></button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── Campaigns / Accounts / Analytics (simplified) ── */
  const renderCampaigns = () => (
    <div style={S.ct}>
      <div style={S.card}>
        <div style={S.cardT}>Published Campaigns</div>
        {campaigns.length===0?<div style={{textAlign:"center",padding:30,color:T.txD}}>No campaigns published yet</div>:
        campaigns.map((c,i)=>(
          <div key={c.id||i} className="hr" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderRadius:6,fontSize:12.5}}>
            <div><div style={{fontWeight:600}}>{c.name}</div><div style={{fontSize:10,color:T.txD}}>{c.objective} · {new Date(c.publishedAt||c.createdAt).toLocaleDateString()}</div></div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <span style={{fontFamily:MONO,fontSize:11}}>{c.accountCount} accts</span>
              <span style={S.badge(T.ok)}>{c.successCount}✓</span>
              {c.failCount>0&&<span style={S.badge(T.err)}>{c.failCount}✕</span>}
              <span style={{...S.dot(c.status==="published"?"active":"paused")}}/><span style={{fontSize:11,color:T.txM}}>{c.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAccounts = () => (
    <div style={S.ct}>
      {!apiConnected?<div style={{...S.card,textAlign:"center",padding:36}}><div style={{fontSize:42,marginBottom:8}}>🔗</div><div style={{fontSize:16,fontWeight:800,marginBottom:4}}>Connect Facebook API</div><div style={{fontSize:12.5,color:T.txM,marginBottom:14}}>Add System User token to fetch ad accounts</div><button style={S.btn("fb")} onClick={()=>setPg("settings")}><Ic t="fb" sz={14}/> Connect</button></div>:
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={S.cardT}>All Ad Accounts ({accounts.length})</div><button style={S.btn("ghost")} onClick={fetchAccounts} disabled={accLoading}><Ic t="refresh" sz={13}/> Refresh</button></div>
        {accounts.map((a,i)=>(
          <div key={a.id} className="hr" style={{display:"grid",gridTemplateColumns:"1fr 80px 70px 60px 60px",gap:8,alignItems:"center",padding:"8px 12px",borderRadius:5,fontSize:12}}>
            <div><div style={{fontWeight:600}}>{a.name}</div><div style={{fontSize:10,color:T.txD,fontFamily:MONO}}>{a.id}</div></div>
            <div style={{color:T.txM,fontSize:11}}>{a.business_name||"—"}</div>
            <div style={{fontFamily:MONO,fontSize:11}}>{a.currency}</div>
            <div style={{fontFamily:MONO,fontSize:11}}>${parseFloat(a.amount_spent||0).toLocaleString()}</div>
            <div><span style={S.dot(a.status)}/>{a.status}</div>
          </div>
        ))}
      </div>}
    </div>
  );

  const renderAnalytics = () => (
    <div style={S.ct}>
      <div style={S.card}>
        <div style={S.cardT}>Analytics</div>
        <div style={{...S.cardD}}>Connect the API and publish campaigns to see real Facebook Insights data here.</div>
        <div style={{textAlign:"center",padding:30,color:T.txD}}>
          {apiConnected?"Analytics data loads from real Facebook Insights API once campaigns have performance data.":"Connect Facebook API to view real analytics."}
        </div>
      </div>
    </div>
  );

  /* ── Template Editor Modal ── */
  const renderTplEditor = () => (
    <div style={S.modal} onClick={()=>setShowTplEditor(false)}>
      <div style={S.modalC} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontSize:16,fontWeight:800}}>{editTplId?"Edit Template":"Create Template"}</div>
          <button style={{background:"none",border:"none",color:T.txM,cursor:"pointer",fontSize:18}} onClick={()=>setShowTplEditor(false)}>✕</button>
        </div>
        <div style={{marginBottom:12}}><label style={S.lbl}>Icon</label><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{ICONS.map(ic=><button key={ic} onClick={()=>setTpl(p=>({...p,icon:ic}))} style={{width:32,height:32,borderRadius:6,border:tpl.icon===ic?`2px solid ${T.ac}`:`1px solid ${T.bd}`,background:tpl.icon===ic?"rgba(45,127,249,.1)":"rgba(255,255,255,.015)",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{ic}</button>)}</div></div>
        <div style={{...S.row,marginBottom:10}}><div style={S.col(2)}><label style={S.lbl}>Name *</label><input style={S.inp} value={tpl.name} onChange={e=>setTpl(p=>({...p,name:e.target.value}))} placeholder="Template name"/></div><div style={S.col()}><label style={S.lbl}>Objective</label><select style={S.sel} value={tpl.objective} onChange={e=>setTpl(p=>({...p,objective:e.target.value}))}>{OBJECTIVES.map(o=><option key={o.id} value={o.id}>{o.icon} {o.label}</option>)}</select></div><div style={S.col()}><label style={S.lbl}>Budget</label><input style={S.inp} type="number" value={tpl.budget} onChange={e=>setTpl(p=>({...p,budget:e.target.value}))}/></div></div>
        <div style={{marginBottom:10}}><label style={S.lbl}>Primary Text *</label><textarea style={S.ta} value={tpl.primaryText} onChange={e=>setTpl(p=>({...p,primaryText:e.target.value}))} placeholder="Ad copy..."/></div>
        <div style={{...S.row,marginBottom:10}}><div style={S.col()}><label style={S.lbl}>Headline *</label><input style={S.inp} value={tpl.headline} onChange={e=>setTpl(p=>({...p,headline:e.target.value}))} placeholder="Headline"/></div><div style={S.col()}><label style={S.lbl}>CTA</label><select style={S.sel} value={tpl.cta} onChange={e=>setTpl(p=>({...p,cta:e.target.value}))}>{CTA_OPTIONS.map(c=><option key={c}>{c}</option>)}</select></div></div>
        <div style={{marginBottom:14,padding:10,background:"rgba(28,200,138,.06)",borderRadius:8,border:"1px solid rgba(28,200,138,.15)"}}><div style={{fontSize:12,fontWeight:600,color:T.ok}}>Advantage+ Placements (Auto)</div><div style={{fontSize:11,color:T.txM}}>All templates use automatic placement.</div></div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button style={S.btn("ghost")} onClick={()=>setShowTplEditor(false)}>Cancel</button><button style={S.btn("primary")} onClick={saveTemplate}><Ic t="save" sz={13}/> {editTplId?"Update":"Create"}</button></div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════ */
  const pages = { dashboard:renderDashboard, create:renderCreate, campaigns:renderCampaigns, templates:renderTemplates, accounts:renderAccounts, analytics:renderAnalytics, settings:renderSettings };

  return (
    <div style={S.layout}>
      <style>{CSS}</style>
      {notif&&<div style={S.notif(notif.t)}>{notif.m}</div>}
      {showTplEditor&&renderTplEditor()}

      {/* Sidebar */}
      <div style={S.sb}>
        <div style={S.sbHead}><div style={S.logo}>B</div>{sbOpen&&<div style={{fontWeight:800,fontSize:13.5,letterSpacing:"-.5px"}}>BulkAds<span style={{color:T.ac}}> Pro</span></div>}</div>
        <div style={S.nav}>
          {navItems.map(n=>(
            <button key={n.id} style={S.ni(pg===n.id)} onClick={()=>{setPg(n.id);if(n.id==="create"&&pg!=="create")resetCampaign()}}>
              <Ic t={n.icon} sz={16}/>{sbOpen&&<span>{n.label}</span>}
              {n.id==="settings"&&sbOpen&&apiConnected&&<span style={{width:6,height:6,borderRadius:"50%",background:T.ok,marginLeft:"auto"}}/>}
            </button>
          ))}
        </div>
        <div style={{padding:"8px 5px",borderTop:`1px solid ${T.bd}`}}>
          <button style={S.ni(false)} onClick={()=>setSbOpen(!sbOpen)}>
            <span style={{transform:sbOpen?"rotate(0)":"rotate(180deg)",transition:"transform .25s",display:"flex"}}><Ic t="chevL"/></span>
            {sbOpen&&<span style={{fontSize:11.5}}>Collapse</span>}
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={S.main}>
        <div style={S.top}>
          <div style={{fontSize:14,fontWeight:700,letterSpacing:"-.2px"}}>{titles[pg]}</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {wsConnected&&<span style={{fontSize:10,color:T.ok,display:"flex",alignItems:"center",gap:4}}><Ic t="ws" sz={12}/> Live</span>}
            {apiConnected&&<span style={{fontSize:10.5,color:T.ok,display:"flex",alignItems:"center",gap:3}}><span style={{width:5,height:5,borderRadius:"50%",background:T.ok}}/>{accounts.length} accounts</span>}
            <div style={{width:28,height:28,borderRadius:"50%",background:T.grad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>A</div>
          </div>
        </div>
        {pages[pg]?.()}
      </div>
    </div>
  );
}
