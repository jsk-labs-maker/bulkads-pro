import { useState, useRef, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const API = "";

const api = {
  token: null, bizId: null,
  headers() {
    const h = { "Content-Type": "application/json" };
    if (this.token) h["x-fb-access-token"] = this.token;
    if (this.bizId) h["x-fb-business-id"] = this.bizId;
    return h;
  },
  async get(p) { const r = await fetch(`${API}${p}`, { headers: this.headers() }); return r.json(); },
  async post(p, b) { const r = await fetch(`${API}${p}`, { method:"POST", headers: this.headers(), body: JSON.stringify(b) }); return r.json(); },
  async postForm(p, fd) {
    const h = {};
    if (this.token) h["x-fb-access-token"] = this.token;
    if (this.bizId) h["x-fb-business-id"] = this.bizId;
    const r = await fetch(`${API}${p}`, { method:"POST", headers: h, body: fd });
    return r.json();
  },
  async del(p) { const r = await fetch(`${API}${p}`, { method:"DELETE", headers: this.headers() }); return r.json(); },
};

const OBJECTIVES = [
  { id: "sales", label: "Sales", icon: "🛒", fbValue: "OUTCOME_SALES" },
  { id: "engagement", label: "Engagement", icon: "💬", fbValue: "OUTCOME_ENGAGEMENT" },
  { id: "traffic", label: "Traffic", icon: "🔗", fbValue: "OUTCOME_TRAFFIC" },
];

const CTA_OPTIONS = ["Shop Now","Learn More","Sign Up","Book Now","Download","Get Offer","Subscribe","Contact Us","Apply Now","Order Now","Watch More","Send Message"];

const INDIA_STATES_HIGH_RTO = [
  "Jammu and Kashmir","Uttar Pradesh","Bihar","Rajasthan","Jharkhand",
  "Arunachal Pradesh","Assam","Manipur","Meghalaya","Mizoram","Nagaland","Sikkim","Tripura"
];

const ALL_INDIA_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jammu and Kashmir","Jharkhand","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha",
  "Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Chandigarh","Puducherry","Ladakh"
];

const COUNTRIES = [
  { code:"IN", name:"India", flag:"\u{1F1EE}\u{1F1F3}" },
  { code:"US", name:"United States", flag:"\u{1F1FA}\u{1F1F8}" },
];

const Ic = ({ t, sz = 17 }) => {
  const p = { width: sz, height: sz, display: "inline-block", verticalAlign: "middle" };
  const m = {
    dashboard: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/></svg>,
    plus: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>,
    list: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h16M4 18h10"/></svg>,
    users: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
    gear: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    check: <svg style={p} viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
    up: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>,
    x: <svg style={p} viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    search: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
    eye: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    eyeOff: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
    fb: <svg style={p} viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    refresh: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="23 4 23 10 17 10"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/></svg>,
    ws: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
    copy: <svg style={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  };
  return m[t] || null;
};

const T = {
  bg:"#05060a", sf:"#0b0c13", sfH:"#10111a", bd:"rgba(255,255,255,.055)", bdH:"rgba(255,255,255,.12)",
  tx:"#e2e2ea", txM:"rgba(255,255,255,.38)", txD:"rgba(255,255,255,.2)",
  ac:"#2d7ff9", ac2:"#9b59f5", ok:"#1cc88a", warn:"#f6c23e", err:"#e74a3b",
  grad:"linear-gradient(135deg,#2d7ff9,#9b59f5)", gradS:"linear-gradient(135deg,rgba(45,127,249,.1),rgba(155,89,245,.1))",
  fb:"#1877F2",
};
const FNT = "'Outfit', sans-serif";
const MONO = "'JetBrains Mono', monospace";

export default function App() {
  const [pg, setPg] = useState("dashboard");
  const [sbOpen, setSbOpen] = useState(true);
  const [notif, setNotif] = useState(null);
  const flash = (m, t = "success") => { setNotif({ m, t }); setTimeout(() => setNotif(null), 3500); };
  const addLog = (type, msg, detail="") => setLogs(p => [{ts: new Date().toLocaleTimeString(), type, msg, detail}, ...p].slice(0, 500));

  /* ── FB API — manual entry with localStorage ── */
  const [fbToken, setFbToken] = useState(() => localStorage.getItem("fb_token") || "");
  const [fbBizId, setFbBizId] = useState(() => localStorage.getItem("fb_biz_id") || "");
  const [fbAppId, setFbAppId] = useState(() => localStorage.getItem("fb_app_id") || "");
  const [fbAppSecret, setFbAppSecret] = useState(() => localStorage.getItem("fb_app_secret") || "");
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  /* ── Accounts ── */
  const [accounts, setAccounts] = useState([]);
  const [fbPages, setFbPages] = useState([]);
  const [accLoading, setAccLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  /* ── Campaign Builder ── */
  const [step, setStep] = useState(0);
  const [cName, setCName] = useState("");
  const [cObj, setCObj] = useState("");
  const [cBudget, setCBudget] = useState("50");
  const [cBudgetType, setCBudgetType] = useState("daily");
  const [cBudgetMode, setCBudgetMode] = useState("CBO");
  const [cBidStrategy, setCBidStrategy] = useState("LOWEST_COST_WITHOUT_CAP");
  const [cPageId, setCPageId] = useState("");
  const [cCountry, setCCountry] = useState("IN");
  const [cCustomCountries, setCCustomCountries] = useState([]);
  const [cExcludeRtoStates, setCExcludeRtoStates] = useState(false);
  const [cExcludedStates, setCExcludedStates] = useState([...INDIA_STATES_HIGH_RTO]);
  const [cPixelMode, setCPixelMode] = useState("auto");
  const [cPixelId, setCPixelId] = useState("");
  const [cVerticalScale, setCVerticalScale] = useState(1);
  const [creatives, setCreatives] = useState([]);
  const [creativeFiles, setCreativeFiles] = useState([]);
  const [adCopy, setAdCopy] = useState({ primaryText:"", headline:"", description:"", cta:"Shop Now", url:"" });
  const [adSets, setAdSets] = useState([{ id:1, name:"Broad", audienceType:"broad", ageMin:18, ageMax:65, gender:"all", interests:[], budget:"50" }]);
  const [activeAdSet, setActiveAdSet] = useState(1);
  const [selAccounts, setSelAccounts] = useState([]);
  const [accSearch, setAccSearch] = useState("");
  const [accGroupFilter, setAccGroupFilter] = useState("all");
  const [interestQuery, setInterestQuery] = useState("");
  const [interestResults, setInterestResults] = useState([]);

  /* ── Publishing ── */
  const [publishing, setPublishing] = useState(false);
  const [pubProgress, setPubProgress] = useState(0);
  const [pubResults, setPubResults] = useState(null);
  const [pubDone, setPubDone] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsResults, setWsResults] = useState([]);

  /* ── Campaigns history ── */
  const [campaigns, setCampaigns] = useState([]);
  const [logs, setLogs] = useState([]);
  const [savedGroups, setSavedGroups] = useState([]);
  const [showNewGrp, setShowNewGrp] = useState(false);
  const [newGrpName, setNewGrpName] = useState("");

  /* ── API Functions ── */
  const connectApi = async () => {
    if (!fbToken || !fbBizId) { setApiError("Token and Business ID required"); return; }
    setApiLoading(true); setApiError("");
    api.token = fbToken; api.bizId = fbBizId;
    try {
      const status = await api.get("/api/auth/status");
      if (status.connected) {
        setApiConnected(true);
        localStorage.setItem("fb_token", fbToken);
        localStorage.setItem("fb_biz_id", fbBizId);
        localStorage.setItem("fb_app_id", fbAppId);
        localStorage.setItem("fb_app_secret", fbAppSecret);
        await fetchAccounts();
        await fetchPages();
        flash("Connected! " + status.accounts_count + " accounts found");
        addLog("success", "API Connected", status.accounts_count + " accounts found");
      } else { setApiError(status.error || "Connection failed"); addLog("error", "Connection failed", status.error || "Unknown"); }
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

  useEffect(() => {
    const t = localStorage.getItem("fb_token");
    const b = localStorage.getItem("fb_biz_id");
    if (t && b) { api.token = t; api.bizId = b; setApiConnected(true); fetchAccounts(); fetchPages(); }
    loadCampaigns(); loadGroups();
  }, []);

  const fetchAccounts = async () => {
    setAccLoading(true);
    try { const r = await api.get("/api/accounts"); if (r.success) { setAccounts(r.accounts); setLastSync(new Date().toLocaleTimeString()); } } catch (e) {}
    setAccLoading(false);
  };

  const fetchPages = async () => {
    try { const r = await api.get("/api/accounts/pages"); if (r.success) { setFbPages(r.pages); if (r.pages.length > 0) setCPageId(r.pages[0].id); } } catch (e) {}
  };

  const loadCampaigns = async () => { try { const r = await api.get("/api/db/campaigns"); if (r.success) setCampaigns(r.campaigns); } catch (e) {} };
  const loadGroups = async () => { try { const r = await api.get("/api/db/groups"); if (r.success) setSavedGroups(r.groups); } catch (e) {} };

  const searchInterests = async (q) => {
    if (q.length < 2) { setInterestResults([]); return; }
    try { const r = await api.get("/api/campaigns/interests?q=" + encodeURIComponent(q)); if (r.success) setInterestResults(r.interests); } catch (e) {}
  };

  const saveGroup = async () => {
    if (!newGrpName || selAccounts.length === 0) return;
    try { await api.post("/api/db/groups", { name: newGrpName, accountIds: selAccounts }); await loadGroups(); setNewGrpName(""); setShowNewGrp(false); flash("Group saved!"); } catch (e) {}
  };

  /* ── Publish ── */
  const handlePublish = async () => {
    setPublishing(true); setPubProgress(5); setPubResults(null); setPubDone(false); setWsResults([]);
    const selectedCountries = cCustomCountries.length > 0 ? cCustomCountries : [cCountry];

    const adSetsForApi = adSets.map(as => {
      const targeting = { geo_locations: { countries: selectedCountries } };
      if (cCountry === "IN" && cExcludeRtoStates && cExcludedStates.length > 0) {
        targeting.excluded_geo_locations = { regions: cExcludedStates.map(s => ({ key: s, name: s })) };
      }
      if (as.audienceType !== "broad") {
        targeting.age_min = as.ageMin; targeting.age_max = as.ageMax;
        if (as.gender !== "all") targeting.genders = as.gender === "male" ? [1] : [2];
        if (as.interests && as.interests.length > 0) targeting.interests = as.interests.map(i => ({ id: i.id, name: i.name }));
      }
      return { name: as.name, audience_type: as.audienceType, targeting, budget: parseFloat(as.budget || cBudget) };
    });

    const adVariations = creativeFiles.map((f, i) => ({
      primary_text: adCopy.primaryText, headline: adCopy.headline, description: adCopy.description,
      cta: adCopy.cta, url: adCopy.url, creative_index: i,
    }));

    const config = {
      name: cName, objective: cObj, budget: parseFloat(cBudget), budget_type: cBudgetType,
      budget_mode: cBudgetMode, bid_strategy: cBidStrategy, publish_status: "PAUSED", page_id: cPageId,
      account_ids: selAccounts, ad_sets: adSetsForApi, ad_variations: adVariations,
      pixel_id: cPixelMode === "specific" && cPixelId ? cPixelId : undefined,
    };

    try {
      let allResults = [];
      for (let scale = 0; scale < cVerticalScale; scale++) {
        setPubProgress(Math.round(((scale + 0.5) / cVerticalScale) * 90));
        const scaleConfig = { ...config, name: cVerticalScale > 1 ? cName + " #" + (scale + 1) : cName };
        const formData = new FormData();
        creativeFiles.forEach(f => formData.append("creatives", f));
        formData.append("config", JSON.stringify(scaleConfig));
        const result = await api.postForm("/api/campaigns/publish", formData);
        if (result.results) allResults = [...allResults, ...result.results.map(r => ({ ...r, scaleRound: scale + 1 }))];
      }
      setPubProgress(100);
      const ok = allResults.filter(r => r.success).length;
      const fail = allResults.filter(r => !r.success).length;
      setPubResults({ results: allResults, summary: { successful: ok, failed: fail, total: allResults.length } });
      setPubDone(true);
      await api.post("/api/db/campaigns", {
        name: cName, objective: cObj, status: fail === 0 ? "published" : "partial",
        budget: parseFloat(cBudget), budgetType: cBudgetType, accountIds: selAccounts,
        accountCount: selAccounts.length, successCount: ok, failCount: fail,
      });
      flash(ok + " success, " + fail + " failed");
      allResults.forEach(r => { if (r.success) addLog("success", "Published to " + r.accountId, (r.data?.ad_sets||1) + " ad sets, " + (r.data?.total_ads||1) + " ads"); else addLog("error", "Failed: " + r.accountId, r.error || r.errorDetail || "Unknown error"); });
    } catch (e) { setPubDone(true); flash("Publish failed: " + (e.message || "Unknown"), "error"); addLog("error", "Publish crashed", e.message || "Unknown"); }
    setPublishing(false);
  };

  /* ── Ad Set helpers ── */
  const curAdSet = adSets.find(a => a.id === activeAdSet) || adSets[0];
  const updateAdSet = (f, v) => setAdSets(p => p.map(a => a.id === activeAdSet ? { ...a, [f]: v } : a));
  const addAdSet = () => { const nid = Math.max(...adSets.map(a => a.id)) + 1; setAdSets(p => [...p, { id: nid, name: "Ad Set " + nid, audienceType: "broad", ageMin: 18, ageMax: 65, gender: "all", interests: [], budget: cBudget }]); setActiveAdSet(nid); };
  const removeAdSet = (id) => { if (adSets.length <= 1) return; setAdSets(p => p.filter(a => a.id !== id)); if (activeAdSet === id) setActiveAdSet(adSets.find(a => a.id !== id).id); };

  /* ── Computed ── */
  const accGroups = [...new Set(accounts.map(a => a.business_name || "Default"))];
  const filteredAccs = accounts.filter(a => { const ms = a.name.toLowerCase().includes(accSearch.toLowerCase()) || a.id.includes(accSearch); const mg = accGroupFilter === "all" || (a.business_name || "Default") === accGroupFilter; return ms && mg; });
  const toggleAcc = (id) => setSelAccounts(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const selectAllFilteredAccs = () => { const all = filteredAccs.every(a => selAccounts.includes(a.id)); if (all) setSelAccounts(p => p.filter(id => !filteredAccs.find(a => a.id === id))); else setSelAccounts(p => [...new Set([...p, ...filteredAccs.map(a => a.id)])]); };
  const totalDaily = parseFloat(cBudget || 0) * selAccounts.length * cVerticalScale;

  const steps = ["Campaign", "Creatives", "Ad Copy", "Ad Sets", "Accounts", "Review"];
  const canNext = () => { if (step===0) return cName && cObj && cPageId; if (step===1) return creatives.length > 0; if (step===2) return adCopy.primaryText && adCopy.headline && adCopy.url; if (step===3) return adSets.length > 0; if (step===4) return selAccounts.length > 0; return true; };

  const resetCampaign = () => {
    setStep(0); setCName(""); setCObj(""); setCBudget("50"); setCreatives([]); setCreativeFiles([]);
    setAdCopy({ primaryText:"", headline:"", description:"", cta:"Shop Now", url:"" });
    setAdSets([{ id:1, name:"Broad", audienceType:"broad", ageMin:18, ageMax:65, gender:"all", interests:[], budget:"50" }]);
    setActiveAdSet(1); setSelAccounts([]); setCBudgetMode("CBO"); setCVerticalScale(1);
    setCCountry("IN"); setCCustomCountries([]); setCExcludeRtoStates(false); setCPixelMode("auto"); setCPixelId("");
    setPublishing(false); setPubDone(false); setPubProgress(0); setPubResults(null); setWsResults([]);
  };

  /* ── WebSocket ── */
  useEffect(() => {
    try {
      const wsP = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsH = window.location.hostname === "localhost" ? "localhost:5001" : window.location.host;
      const ws = new WebSocket(wsP + "//" + wsH + "/ws");
      ws.onopen = () => setWsConnected(true);
      ws.onmessage = (msg) => { try { const d = JSON.parse(msg.data); if (d.type === "publish_progress") setWsResults(p => [...p, d]); } catch (e) {} };
      ws.onclose = () => setWsConnected(false);
      return () => ws.close();
    } catch (e) {}
  }, []);

  /* ═══ STYLES ═══ */
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
  `;

  const S = {
    layout: { display:"flex", minHeight:"100vh", background:T.bg, fontFamily:FNT, color:T.tx, fontSize:14 },
    sb: { width:sbOpen?224:56, background:T.sf, borderRight:"1px solid "+T.bd, display:"flex", flexDirection:"column", transition:"width .25s", flexShrink:0 },
    sbHead: { padding:sbOpen?"16px 14px":"16px 8px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid "+T.bd, minHeight:56 },
    logo: { width:28, height:28, borderRadius:7, background:T.grad, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, color:"#fff", flexShrink:0 },
    nav: { flex:1, padding:"8px 5px", display:"flex", flexDirection:"column", gap:1 },
    ni: (a) => ({ display:"flex", alignItems:"center", gap:9, padding:sbOpen?"8px 11px":"8px 0", borderRadius:6, cursor:"pointer", fontSize:12.5, fontWeight:a?600:500, background:a?"rgba(45,127,249,.1)":"transparent", color:a?T.ac:T.txM, justifyContent:sbOpen?"flex-start":"center", border:"none", fontFamily:FNT, width:"100%", textAlign:"left" }),
    main: { flex:1, overflow:"auto" },
    top: { position:"sticky", top:0, zIndex:5, background:"rgba(5,6,10,.9)", backdropFilter:"blur(14px)", borderBottom:"1px solid "+T.bd, padding:"11px 22px", display:"flex", alignItems:"center", justifyContent:"space-between" },
    ct: { padding:"20px 22px", maxWidth:1160 },
    card: { background:T.sf, borderRadius:12, border:"1px solid "+T.bd, padding:20, marginBottom:12, animation:"fi .25s ease" },
    cardT: { fontSize:15, fontWeight:700, marginBottom:2 },
    cardD: { fontSize:11.5, color:T.txM, marginBottom:16 },
    lbl: { display:"block", fontSize:10.5, fontWeight:600, color:T.txM, marginBottom:5, textTransform:"uppercase", letterSpacing:".7px" },
    inp: { width:"100%", padding:"8px 12px", borderRadius:6, border:"1px solid "+T.bd, background:"rgba(255,255,255,.025)", color:T.tx, fontSize:12.5, fontFamily:FNT },
    ta: { width:"100%", padding:"8px 12px", borderRadius:6, border:"1px solid "+T.bd, background:"rgba(255,255,255,.025)", color:T.tx, fontSize:12.5, fontFamily:FNT, minHeight:72, resize:"vertical" },
    sel: { width:"100%", padding:"8px 12px", borderRadius:6, border:"1px solid "+T.bd, background:T.sf, color:T.tx, fontSize:12.5, fontFamily:FNT, cursor:"pointer" },
    row: { display:"flex", gap:11, flexWrap:"wrap" },
    col: (f=1) => ({ flex:f, minWidth:160 }),
    btn: (v="primary",d=false) => ({ padding:"8px 18px", borderRadius:6, border:v==="ghost"?"1px solid "+T.bd:"none", fontWeight:600, fontSize:12.5, fontFamily:FNT, cursor:d?"not-allowed":"pointer", display:"inline-flex", alignItems:"center", gap:6, background:v==="primary"?T.grad:v==="danger"?"rgba(231,74,59,.1)":v==="fb"?T.fb:"transparent", color:v==="primary"?"#fff":v==="danger"?T.err:v==="fb"?"#fff":T.txM, opacity:d?.45:1 }),
    chip: (s) => ({ display:"inline-flex", alignItems:"center", gap:4, padding:"4px 10px", borderRadius:16, fontSize:11, fontWeight:600, cursor:"pointer", userSelect:"none", background:s?"rgba(45,127,249,.12)":"rgba(255,255,255,.03)", color:s?"#5da2fc":T.txM, border:s?"1px solid rgba(45,127,249,.25)":"1px solid "+T.bd }),
    badge: (c) => ({ display:"inline-flex", padding:"2px 8px", borderRadius:16, fontSize:10, fontWeight:600, background:c+"15", color:c }),
    dot: (st) => ({ width:6, height:6, borderRadius:"50%", display:"inline-block", marginRight:5, background:st==="active"?T.ok:st==="disabled"?T.err:T.warn }),
    objGrid: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 },
    objCard: (s) => ({ padding:"14px 12px", borderRadius:8, cursor:"pointer", textAlign:"center", background:s?"rgba(45,127,249,.1)":"rgba(255,255,255,.015)", border:s?"1.5px solid rgba(45,127,249,.35)":"1.5px solid "+T.bd }),
    stepper: { display:"flex", gap:2, background:"rgba(255,255,255,.025)", borderRadius:8, padding:3, border:"1px solid "+T.bd },
    stepBtn: (a,d) => ({ padding:"5px 12px", borderRadius:5, fontSize:11.5, fontWeight:600, cursor:d||a?"pointer":"default", border:"none", fontFamily:FNT, background:a?T.grad:d?"rgba(45,127,249,.08)":"transparent", color:a?"#fff":d?"#5da2fc":T.txD }),
    pbar: { width:"100%", height:5, borderRadius:8, background:"rgba(255,255,255,.05)", overflow:"hidden" },
    pfill: (p) => ({ width:p+"%", height:"100%", borderRadius:8, background:T.grad, transition:"width .3s" }),
    accRow: (s) => ({ display:"grid", gridTemplateColumns:"24px 1fr 80px 60px 60px", gap:7, alignItems:"center", padding:"8px 12px", borderRadius:5, cursor:"pointer", background:s?"rgba(45,127,249,.05)":"transparent" }),
    accChk: (s) => ({ width:16, height:16, borderRadius:3, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background:s?T.ac:"rgba(255,255,255,.03)", border:s?"none":"1.5px solid rgba(255,255,255,.1)", color:"#fff" }),
    notif: (t) => ({ position:"fixed", top:16, right:16, zIndex:200, padding:"10px 16px", borderRadius:8, fontSize:12.5, fontWeight:600, background:t==="success"?"rgba(28,200,138,.12)":"rgba(231,74,59,.12)", color:t==="success"?T.ok:T.err, border:"1px solid "+(t==="success"?"rgba(28,200,138,.25)":"rgba(231,74,59,.25)"), animation:"ni .25s ease" }),
  };

  const navItems = [
    { id:"dashboard", icon:"dashboard", label:"Dashboard" },
    { id:"create", icon:"plus", label:"Create Campaign" },
    { id:"campaigns", icon:"list", label:"Campaigns" },
    { id:"accounts", icon:"users", label:"Ad Accounts" },
    { id:"logs", icon:"list", label:"Logs" },
    { id:"settings", icon:"gear", label:"API Settings" },
  ];
  const titles = { dashboard:"Dashboard", create:"Create Campaign", campaigns:"Campaigns", accounts:"Ad Accounts", logs:"System Logs", settings:"API Settings" };

  /* ═══ PAGES ═══ */

  const renderDashboard = () => (
    <div style={S.ct}>
      {!apiConnected && <div style={{ padding:"12px 16px", borderRadius:9, background:"rgba(246,194,62,.05)", border:"1px solid rgba(246,194,62,.2)", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}><span style={{fontSize:18}}>Warning</span><div style={{flex:1}}><div style={{fontWeight:700,fontSize:12.5,color:T.warn}}>Facebook API Not Connected</div><div style={{fontSize:11.5,color:T.txM}}>Go to API Settings to connect</div></div><button style={S.btn("ghost")} onClick={() => setPg("settings")}>Connect</button></div>}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10, marginBottom:14 }}>
        {[{ l:"Ad Accounts",v:accounts.length||"--",c:T.ac },{ l:"Active",v:accounts.filter(a=>a.status==="active").length||"--",c:T.ok },{ l:"Campaigns",v:campaigns.length,c:T.ac2 },{ l:"WebSocket",v:wsConnected?"Live":"Off",c:wsConnected?T.ok:T.err }].map((s,i)=>(
          <div key={i} style={{background:"rgba(255,255,255,.02)",borderRadius:8,border:"1px solid "+T.bd,padding:13}}><div style={{fontSize:10,color:T.txM,textTransform:"uppercase",letterSpacing:".5px",marginBottom:4}}>{s.l}</div><div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div></div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
        <div className="hs" style={{...S.card,cursor:"pointer",textAlign:"center"}} onClick={()=>setPg("create")}><div style={{fontSize:28,marginBottom:6}}>+</div><div style={{fontWeight:700,fontSize:13}}>New Campaign</div><div style={{fontSize:11,color:T.txM}}>Build from scratch</div></div>
        <div className="hs" style={{...S.card,cursor:"pointer",textAlign:"center"}} onClick={()=>setPg("settings")}><div style={{fontSize:28,marginBottom:6}}>API</div><div style={{fontWeight:700,fontSize:13}}>Connect API</div><div style={{fontSize:11,color:T.txM}}>Add token</div></div>
      </div>
    </div>
  );

  /* ── Create Campaign ── */
  const renderCreate = () => {
    const stepContent = [
      // Step 0: Campaign Setup (with CBO/ABO, location, pixel)
      () => (
        <div style={S.card}>
          <div style={S.cardT}>Campaign Setup</div><div style={S.cardD}>Name, objective, budget, location, pixel</div>
          <div style={{marginBottom:14}}><label style={S.lbl}>Campaign Name</label><input style={S.inp} value={cName} onChange={e=>setCName(e.target.value)} placeholder="e.g. Summer Sale 2026"/></div>
          <label style={S.lbl}>Objective</label>
          <div style={{...S.objGrid,marginBottom:14}}>{OBJECTIVES.map(o=><div key={o.id} className="hs" style={S.objCard(cObj===o.id)} onClick={()=>setCObj(o.id)}><div style={{fontSize:22,marginBottom:4}}>{o.icon}</div><div style={{fontSize:12,fontWeight:700}}>{o.label}</div></div>)}</div>

          <div style={S.row}>
            <div style={S.col()}><label style={S.lbl}>Facebook Page *</label><select style={S.sel} value={cPageId} onChange={e=>setCPageId(e.target.value)}><option value="">Select page...</option>{fbPages.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div style={S.col()}><label style={S.lbl}>Budget ($)</label><input style={S.inp} type="number" value={cBudget} onChange={e=>setCBudget(e.target.value)}/></div>
            <div style={S.col()}><label style={S.lbl}>Bid Strategy</label><select style={S.sel} value={cBidStrategy} onChange={e=>setCBidStrategy(e.target.value)}><option value="LOWEST_COST_WITHOUT_CAP">Lowest Cost</option><option value="COST_CAP">Cost Cap</option><option value="BID_CAP">Bid Cap</option></select></div>
          </div>

          {/* CBO / ABO */}
          <div style={{borderTop:"1px solid "+T.bd,paddingTop:14,marginTop:14}}>
            <label style={S.lbl}>Budget Mode</label>
            <div style={{display:"flex",gap:6,marginBottom:10}}>{["CBO","ABO"].map(m=><button key={m} style={{...S.btn(cBudgetMode===m?"primary":"ghost"),flex:1,justifyContent:"center"}} onClick={()=>setCBudgetMode(m)}>{m==="CBO"?"CBO (Campaign Budget)":"ABO (Per Ad Set)"}</button>)}</div>
          </div>

          {/* Location */}
          <div style={{borderTop:"1px solid "+T.bd,paddingTop:14,marginTop:14}}>
            <label style={S.lbl}>Target Location</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
              {COUNTRIES.map(c=><div key={c.code} className="hs" style={{padding:"7px 12px",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer",border:cCountry===c.code&&cCustomCountries.length===0?"1.5px solid "+T.ac:"1px solid "+T.bd,background:cCountry===c.code&&cCustomCountries.length===0?"rgba(45,127,249,.1)":"rgba(255,255,255,.02)",color:cCountry===c.code&&cCustomCountries.length===0?T.ac:T.txM}} onClick={()=>{setCCountry(c.code);setCCustomCountries([])}}>{c.flag} {c.name}</div>)}
              <div className="hs" style={{padding:"7px 12px",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer",border:cCustomCountries.length>0?"1.5px solid "+T.ac2:"1px solid "+T.bd,background:cCustomCountries.length>0?"rgba(155,89,245,.1)":"rgba(255,255,255,.02)",color:cCustomCountries.length>0?T.ac2:T.txM}} onClick={()=>{if(cCustomCountries.length===0)setCCustomCountries([cCountry])}}>+ Custom</div>
            </div>
            {cCustomCountries.length>0&&<div style={{marginBottom:8}}><input style={S.inp} placeholder="Type country code (e.g. GB, CA, AU) and press Enter" onKeyDown={e=>{if(e.key==="Enter"&&e.target.value.trim()){setCCustomCountries(p=>[...p,e.target.value.trim().toUpperCase()]);e.target.value=""}}}/><div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>{cCustomCountries.map(cc=><span key={cc} style={S.chip(true)} onClick={()=>setCCustomCountries(p=>p.filter(x=>x!==cc))}>{cc} x</span>)}</div></div>}

            {/* India RTO State Exclusion */}
            {cCountry==="IN"&&cCustomCountries.length===0&&(
              <div style={{marginTop:8}}>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:12,color:T.txM}}>
                  <input type="checkbox" checked={cExcludeRtoStates} onChange={e=>setCExcludeRtoStates(e.target.checked)} style={{width:16,height:16,accentColor:T.ac}}/>
                  Exclude High RTO States (J&K, UP, Bihar, Rajasthan, Jharkhand, North East)
                </label>
                {cExcludeRtoStates&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:8}}>{ALL_INDIA_STATES.map(st=><span key={st} style={S.chip(cExcludedStates.includes(st))} onClick={()=>setCExcludedStates(p=>p.includes(st)?p.filter(x=>x!==st):[...p,st])}>{st}</span>)}</div>}
              </div>
            )}
            <div style={{padding:7,background:"rgba(28,200,138,.06)",borderRadius:6,border:"1px solid rgba(28,200,138,.1)",fontSize:11,color:T.ok,marginTop:8}}>Target: <b>{cCustomCountries.length>0?cCustomCountries.join(", "):(COUNTRIES.find(c=>c.code===cCountry)?.flag+" "+COUNTRIES.find(c=>c.code===cCountry)?.name)}</b>{cExcludeRtoStates&&cCountry==="IN"?" (excluding "+cExcludedStates.length+" states)":""}</div>
          </div>

          {/* Pixel */}
          {["sales","conversions","leads"].includes(cObj)&&(
            <div style={{borderTop:"1px solid "+T.bd,paddingTop:14,marginTop:14}}>
              <label style={S.lbl}>Conversion Pixel</label>
              <div style={{display:"flex",gap:6,marginBottom:10}}>{["auto","specific"].map(m=><div key={m} className="hs" style={{padding:"7px 14px",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer",border:cPixelMode===m?"1.5px solid "+T.ac:"1px solid "+T.bd,background:cPixelMode===m?"rgba(45,127,249,.1)":"rgba(255,255,255,.02)",color:cPixelMode===m?T.ac:T.txM,flex:1,textAlign:"center"}} onClick={()=>{setCPixelMode(m);if(m==="auto")setCPixelId("")}}>{m==="auto"?"Auto-detect per account":"Select specific pixel"}</div>)}</div>
              {cPixelMode==="auto"&&<div style={{padding:8,background:"rgba(45,127,249,.05)",borderRadius:7,fontSize:11.5,color:T.txM}}><b style={{color:T.ac}}>Auto mode:</b> Fetches pixel from each account automatically.</div>}
              {cPixelMode==="specific"&&<input style={{...S.inp,fontFamily:MONO}} value={cPixelId} onChange={e=>setCPixelId(e.target.value)} placeholder="Pixel ID (e.g. 817841624449303)"/>}
            </div>
          )}

          {/* Vertical Scaling */}
          <div style={{borderTop:"1px solid "+T.bd,paddingTop:14,marginTop:14}}>
            <label style={S.lbl}>Vertical Scaling (duplicate campaigns per account)</label>
            <div style={{display:"flex",gap:6}}>{[1,2,3,5,10].map(n=><div key={n} className="hs" style={{padding:"8px 16px",borderRadius:7,fontSize:13,fontWeight:700,cursor:"pointer",border:cVerticalScale===n?"1.5px solid "+T.ac:"1px solid "+T.bd,background:cVerticalScale===n?"rgba(45,127,249,.1)":"rgba(255,255,255,.02)",color:cVerticalScale===n?T.ac:T.txM,textAlign:"center",minWidth:44}} onClick={()=>setCVerticalScale(n)}>{n}x</div>)}</div>
            {cVerticalScale>1&&<div style={{marginTop:6,padding:7,background:"rgba(155,89,245,.06)",borderRadius:6,fontSize:11,color:T.ac2}}>{cVerticalScale} identical campaigns will be created on each selected account</div>}
          </div>
        </div>
      ),
      // Step 1: Creatives
      () => (
        <div style={S.card}>
          <div style={S.cardT}>Upload Creatives</div><div style={S.cardD}>Upload videos/images. Each file becomes 1 ad in every ad set.</div>
          <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,borderRadius:10,border:"2px dashed "+T.bd,cursor:"pointer",background:"rgba(255,255,255,.01)"}}>
            <div style={{fontSize:32,marginBottom:6}}><Ic t="up" sz={32}/></div>
            <div style={{fontWeight:600,fontSize:13}}>Drop files here or click to browse</div>
            <div style={{fontSize:11,color:T.txD,marginTop:3}}>MP4, MOV, JPG, PNG (500MB max)</div>
            <input type="file" multiple accept="video/*,image/*" style={{display:"none"}} onChange={e=>{const f=Array.from(e.target.files);setCreativeFiles(p=>[...p,...f]);setCreatives(p=>[...p,...f.map(x=>({name:x.name,size:x.size,type:x.type}))]);e.target.value=""}}/>
          </label>
          {creatives.length>0&&<div style={{marginTop:12}}>{creatives.map((c,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:6,background:"rgba(255,255,255,.02)",border:"1px solid "+T.bd,marginBottom:4}}><div style={{fontSize:14}}>{c.type?.startsWith("video")?"video":"img"}</div><div style={{flex:1,fontSize:12,fontWeight:500}}>{c.name}</div><div style={{fontSize:11,color:T.txD}}>{(c.size/1024/1024).toFixed(1)}MB</div><span style={{cursor:"pointer",color:T.err,fontSize:14}} onClick={()=>{setCreatives(p=>p.filter((_,j)=>j!==i));setCreativeFiles(p=>p.filter((_,j)=>j!==i))}}>x</span></div>)}</div>}
        </div>
      ),
      // Step 2: Ad Copy
      () => (
        <div style={S.card}>
          <div style={S.cardT}>Ad Copy</div><div style={S.cardD}>Same copy for all ads. Each uploaded video becomes a separate ad.</div>
          <div style={{marginBottom:12}}><label style={S.lbl}>Primary Text</label><textarea style={S.ta} value={adCopy.primaryText} onChange={e=>setAdCopy(p=>({...p,primaryText:e.target.value}))} placeholder="Ad copy text..."/></div>
          <div style={{...S.row,marginBottom:12}}><div style={S.col()}><label style={S.lbl}>Headline</label><input style={S.inp} value={adCopy.headline} onChange={e=>setAdCopy(p=>({...p,headline:e.target.value}))} placeholder="Headline"/></div><div style={S.col()}><label style={S.lbl}>Description</label><input style={S.inp} value={adCopy.description} onChange={e=>setAdCopy(p=>({...p,description:e.target.value}))} placeholder="Description"/></div></div>
          <div style={S.row}><div style={S.col()}><label style={S.lbl}>CTA</label><select style={S.sel} value={adCopy.cta} onChange={e=>setAdCopy(p=>({...p,cta:e.target.value}))}>{CTA_OPTIONS.map(c=><option key={c}>{c}</option>)}</select></div><div style={S.col()}><label style={S.lbl}>Website URL *</label><input style={S.inp} value={adCopy.url} onChange={e=>setAdCopy(p=>({...p,url:e.target.value}))} placeholder="https://yoursite.com"/></div></div>
        </div>
      ),
      // Step 3: Ad Sets
      () => (
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
            <div style={S.cardT}>Ad Sets <span style={S.badge(T.ac)}>{adSets.length}</span></div>
            <button style={S.btn("ghost")} onClick={addAdSet}><Ic t="plus" sz={12}/> Add Ad Set</button>
          </div>
          <div style={S.cardD}>Each ad set can have different targeting. All {creatives.length} videos go into every ad set.</div>
          {cBudgetMode==="CBO"&&<div style={{padding:8,background:"rgba(28,200,138,.06)",borderRadius:7,fontSize:11.5,color:T.ok,marginBottom:12}}>CBO: ${cBudget}/day campaign budget distributed across all ad sets by Facebook.</div>}
          <div style={{display:"flex",gap:2,borderBottom:"1px solid "+T.bd,marginBottom:14,flexWrap:"wrap"}}>{adSets.map((as,i)=><div key={as.id} style={{padding:"7px 14px",borderRadius:"7px 7px 0 0",fontSize:12,fontWeight:600,cursor:"pointer",background:activeAdSet===as.id?T.sf:"transparent",color:activeAdSet===as.id?T.tx:T.txM,border:activeAdSet===as.id?"1px solid "+T.bd:"1px solid transparent",borderBottom:activeAdSet===as.id?"1px solid "+T.sf:"none",marginBottom:-1,display:"flex",alignItems:"center",gap:6}} onClick={()=>setActiveAdSet(as.id)}>{as.name||"Set "+(i+1)}{adSets.length>1&&<span style={{cursor:"pointer",color:T.txD,fontSize:14}} onClick={e=>{e.stopPropagation();removeAdSet(as.id)}}>x</span>}</div>)}</div>
          <div style={{...S.row,marginBottom:12}}>
            <div style={S.col(2)}><label style={S.lbl}>Ad Set Name</label><input style={S.inp} value={curAdSet.name} onChange={e=>updateAdSet("name",e.target.value)} placeholder="e.g. Broad, Interest"/></div>
            {cBudgetMode==="ABO"&&<div style={S.col()}><label style={S.lbl}>Ad Set Budget ($)</label><input style={S.inp} type="number" value={curAdSet.budget} onChange={e=>updateAdSet("budget",e.target.value)}/></div>}
          </div>
          <label style={S.lbl}>Audience Type</label>
          <div style={{display:"flex",gap:8,marginBottom:14}}>{[{id:"broad",l:"Broad (Advantage+)"},{id:"detailed",l:"Detailed (Interests)"}].map(t=><div key={t.id} className="hs" style={{...S.objCard(curAdSet.audienceType===t.id),flex:1,padding:"10px 8px"}} onClick={()=>updateAdSet("audienceType",t.id)}><div style={{fontSize:12,fontWeight:700}}>{t.l}</div></div>)}</div>
          {curAdSet.audienceType==="detailed"&&(
            <div>
              <div style={{...S.row,marginBottom:12}}>
                <div style={S.col()}><label style={S.lbl}>Age</label><div style={{display:"flex",gap:5,alignItems:"center"}}><select style={S.sel} value={curAdSet.ageMin} onChange={e=>updateAdSet("ageMin",+e.target.value)}>{Array.from({length:48},(_,i)=>i+18).map(a=><option key={a}>{a}</option>)}</select><span style={{color:T.txD}}>-</span><select style={S.sel} value={curAdSet.ageMax} onChange={e=>updateAdSet("ageMax",+e.target.value)}>{Array.from({length:48},(_,i)=>i+18).filter(a=>a>=curAdSet.ageMin).map(a=><option key={a}>{a}</option>)}</select></div></div>
                <div style={S.col()}><label style={S.lbl}>Gender</label><select style={S.sel} value={curAdSet.gender} onChange={e=>updateAdSet("gender",e.target.value)}><option value="all">All</option><option value="male">Male</option><option value="female">Female</option></select></div>
              </div>
              <div style={{marginBottom:12}}>
                <label style={S.lbl}>Search Interests</label>
                <input style={S.inp} value={interestQuery} onChange={e=>{setInterestQuery(e.target.value);searchInterests(e.target.value)}} placeholder="Type to search..."/>
                {interestResults.length>0&&<div style={{marginTop:6,padding:8,background:"rgba(255,255,255,.02)",borderRadius:6,border:"1px solid "+T.bd,maxHeight:140,overflowY:"auto"}}>{interestResults.map(i=><div key={i.id} className="hr" style={{padding:"5px 8px",borderRadius:4,cursor:"pointer",fontSize:12}} onClick={()=>{updateAdSet("interests",[...(curAdSet.interests||[]),i]);setInterestResults([]);setInterestQuery("")}}>{i.name}</div>)}</div>}
                {curAdSet.interests&&curAdSet.interests.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>{curAdSet.interests.map((i,idx)=><span key={idx} style={S.chip(true)} onClick={()=>updateAdSet("interests",curAdSet.interests.filter((_,j)=>j!==idx))}>{i.name} x</span>)}</div>}
              </div>
            </div>
          )}
          <div style={{padding:10,background:"rgba(28,200,138,.06)",borderRadius:8,border:"1px solid rgba(28,200,138,.15)"}}><div style={{fontSize:12,fontWeight:600,color:T.ok}}>Advantage+ Placements (Auto)</div><div style={{fontSize:11,color:T.txM}}>All ad sets use auto-placement.</div></div>
          <div style={{marginTop:12,padding:10,background:"rgba(155,89,245,.06)",borderRadius:8,fontSize:12,color:T.ac2}}><b>Preview:</b> 1 Campaign x {cVerticalScale}x = {adSets.length} Ad Sets x {creatives.length} Ads = <b>{adSets.length * creatives.length * cVerticalScale} total ads per account</b></div>
        </div>
      ),
      // Step 4: Accounts
      () => (
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:3}}>
            <div><div style={S.cardT}>Select Ad Accounts</div><div style={S.cardD}>{apiConnected?accounts.length+" accounts":"Connect API first"}</div></div>
            <div style={{display:"flex",gap:5,alignItems:"center"}}><span style={S.badge(T.ac)}>{selAccounts.length} selected</span><button style={S.btn("ghost")} onClick={selectAllFilteredAccs}>{filteredAccs.every(a=>selAccounts.includes(a.id))?"Deselect":"Select"} All</button></div>
          </div>
          {savedGroups.length>0&&<div style={{marginBottom:10}}><label style={S.lbl}>Saved Groups</label><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{savedGroups.map((g,i)=><button key={i} style={{...S.btn("ghost"),padding:"4px 9px",fontSize:11}} onClick={()=>{setSelAccounts(g.accountIds||[]);flash("Loaded "+g.name)}}>{g.name} ({(g.accountIds||[]).length})</button>)}{!showNewGrp?<button style={{...S.btn("ghost"),padding:"4px 9px",fontSize:11,color:T.ac}} onClick={()=>setShowNewGrp(true)}>+ Save</button>:<div style={{display:"flex",gap:4}}><input style={{...S.inp,width:120,padding:"4px 7px",fontSize:11}} value={newGrpName} onChange={e=>setNewGrpName(e.target.value)} placeholder="Name" onKeyDown={e=>e.key==="Enter"&&saveGroup()}/><button style={{...S.btn("primary"),padding:"4px 8px",fontSize:11}} onClick={saveGroup}>Save</button></div>}</div></div>}
          <div style={{...S.row,marginBottom:8}}>
            <div style={{...S.col(2),position:"relative"}}><input style={{...S.inp,paddingLeft:28}} placeholder="Search..." value={accSearch} onChange={e=>setAccSearch(e.target.value)}/></div>
            <div style={S.col()}><select style={S.sel} value={accGroupFilter} onChange={e=>setAccGroupFilter(e.target.value)}><option value="all">All Groups</option>{accGroups.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"24px 1fr 80px 60px 60px",gap:7,padding:"4px 12px",fontSize:10,textTransform:"uppercase",letterSpacing:".5px",color:T.txD,fontWeight:600}}><div/><div>Account</div><div>Group</div><div>Spend</div><div>Status</div></div>
          <div style={{maxHeight:300,overflowY:"auto"}}>{filteredAccs.map((a,i)=>(
            <div key={a.id} className="hr" style={{...S.accRow(selAccounts.includes(a.id)),animation:"fi .12s ease "+(i*.012)+"s both"}} onClick={()=>toggleAcc(a.id)}>
              <div style={S.accChk(selAccounts.includes(a.id))}>{selAccounts.includes(a.id)&&<Ic t="check" sz={8}/>}</div>
              <div><div style={{fontSize:12,fontWeight:600}}>{a.name}</div><div style={{fontSize:10,color:T.txD,fontFamily:MONO}}>{a.id}</div></div>
              <div style={{fontSize:11,color:T.txM}}>{a.business_name||"-"}</div>
              <div style={{fontSize:11,fontFamily:MONO,color:T.txM}}>${parseFloat(a.amount_spent||0).toLocaleString()}</div>
              <div><span style={S.dot(a.status)}/><span style={{fontSize:11,color:T.txM}}>{a.status}</span></div>
            </div>
          ))}</div>
        </div>
      ),
      // Step 5: Review & Publish
      () => {
        if (publishing || pubDone) {
          const res = pubResults;
          const okC = res?.summary?.successful || 0;
          const failC = res?.summary?.failed || 0;
          return (
            <div style={S.card}>
              <div style={{textAlign:"center",marginBottom:16}}>{pubDone?<><div style={{fontSize:42,marginBottom:4}}>Done!</div><div style={{fontSize:17,fontWeight:800}}>Published!</div><div style={{color:T.txM,fontSize:12}}>{okC} success{failC>0?" / "+failC+" failed":""}</div></>:<><div style={{fontSize:17,fontWeight:800}}>Publishing to Facebook...</div><div style={{color:T.txM,fontSize:12}}>Creating campaigns via Graph API</div></>}</div>
              <div style={{...S.pbar,marginBottom:12}}><div style={S.pfill(pubProgress)}/></div>
              <div style={{maxHeight:240,overflowY:"auto"}}>{(res?.results||[]).map((r,i)=>{const acc=accounts.find(a=>a.id===r.accountId);const ok=r.success;return(<div key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 10px",borderRadius:4,marginBottom:2,background:ok?"rgba(28,200,138,.03)":"rgba(231,74,59,.03)"}}><div style={{width:16,height:16,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,background:ok?"rgba(28,200,138,.12)":"rgba(231,74,59,.12)",color:ok?T.ok:T.err}}>{ok?"Y":"X"}</div><div style={{flex:1,fontSize:12,fontWeight:500}}>{acc?.name||r.accountId}{r.scaleRound>1?" #"+r.scaleRound:""}</div>{ok&&<div style={{fontSize:10,color:T.ok}}>{r.data?.ad_sets||1} sets / {r.data?.total_ads||1} ads</div>}{!ok&&<div style={{fontSize:10,color:T.err}}>{r.error||"Failed"}</div>}</div>)})}</div>
              {pubDone&&<div style={{display:"flex",gap:7,justifyContent:"center",marginTop:14}}><button style={S.btn("primary")} onClick={()=>{resetCampaign();setPg("dashboard")}}>Dashboard</button><button style={S.btn("ghost")} onClick={resetCampaign}>New Campaign</button></div>}
            </div>
          );
        }
        const obj = OBJECTIVES.find(o=>o.id===cObj);
        const totalAds = adSets.length * creatives.length * cVerticalScale;
        return (
          <div style={S.card}>
            <div style={S.cardT}>Review & Launch</div><div style={S.cardD}>Publishing to {selAccounts.length} accounts x {cVerticalScale}x scale</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12,marginBottom:16}}>
              {[{l:"Campaign",v:cName},{l:"Objective",v:obj?.icon+" "+obj?.label},{l:"Budget",v:"$"+cBudget+" "+cBudgetType+" ("+cBudgetMode+")"},{l:"Page",v:fbPages.find(p=>p.id===cPageId)?.name||"-"},{l:"Videos",v:creatives.length},{l:"Ad Sets",v:adSets.map(a=>a.name).join(", ")},{l:"Scale",v:cVerticalScale+"x"},{l:"Location",v:cCustomCountries.length>0?cCustomCountries.join(","):(COUNTRIES.find(c=>c.code===cCountry)?.name||cCountry)},{l:"Ads/Account",v:totalAds/cVerticalScale+"x"+cVerticalScale},{l:"Total Ads",v:totalAds*selAccounts.length}].map((it,i)=><div key={i}><div style={{fontSize:10,fontWeight:600,color:T.txD,textTransform:"uppercase",letterSpacing:".5px",marginBottom:2}}>{it.l}</div><div style={{fontSize:12.5,fontWeight:600}}>{it.v}</div></div>)}
            </div>
            <div style={{padding:16,background:T.gradS,borderRadius:10,border:"1px solid rgba(45,127,249,.12)",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
              <div><div style={{fontSize:34,fontWeight:900,letterSpacing:"-2px",background:T.grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{selAccounts.length}</div><div style={{fontSize:10,color:T.txM}}>Accounts</div></div>
              <div style={{width:1,height:32,background:T.bd}}/>
              <div><div style={{fontSize:20,fontWeight:800,color:T.ac}}>{totalAds*selAccounts.length}</div><div style={{fontSize:10,color:T.txM}}>Total Ads</div></div>
              <div style={{width:1,height:32,background:T.bd}}/>
              <div><div style={{fontSize:20,fontWeight:800,color:T.ac2}}>${totalDaily.toLocaleString()}/day</div><div style={{fontSize:10,color:T.txM}}>Est. Spend</div></div>
              <button style={{...S.btn("primary"),marginLeft:"auto",padding:"11px 26px",fontSize:13.5}} onClick={handlePublish}>Publish to Facebook</button>
            </div>
            <div style={{fontSize:11,color:T.warn,marginTop:8}}>Campaigns created as PAUSED. Activate in Ads Manager.</div>
          </div>
        );
      },
    ];

    return (
      <div style={S.ct}>
        <div style={{...S.stepper,marginBottom:14}}>{steps.map((s,i)=><button key={i} style={S.stepBtn(step===i,i<step)} onClick={()=>{if(i<step)setStep(i)}}>{s}</button>)}</div>
        {stepContent[step]()}
        <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
          <button style={S.btn("ghost")} onClick={()=>step>0?setStep(step-1):setPg("dashboard")}>{step>0?"Back":"Back"}</button>
          {step<steps.length-1&&<button style={S.btn("primary",!canNext())} onClick={()=>canNext()&&setStep(step+1)} disabled={!canNext()}>Continue</button>}
        </div>
      </div>
    );
  };

  /* ── Campaigns History ── */
  const renderCampaigns = () => (
    <div style={S.ct}>
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div style={S.cardT}>Campaign History</div><button style={S.btn("ghost")} onClick={loadCampaigns}><Ic t="refresh" sz={13}/> Refresh</button></div>
        {campaigns.length===0?<div style={{textAlign:"center",padding:32,color:T.txD}}>No campaigns yet. Create your first one!</div>:campaigns.map((c,i)=>(
          <div key={c.id||i} className="hr" style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:6,marginBottom:2}}>
            <div style={{flex:1}}><div style={{fontSize:12.5,fontWeight:600}}>{c.name}</div><div style={{fontSize:10,color:T.txD}}>{c.objective} / ${c.budget} {c.budgetType}</div></div>
            <span style={S.badge(c.status==="published"?T.ok:T.warn)}>{c.status}</span>
            <div style={{fontSize:10,color:T.txD}}>{c.successCount||0}/{c.accountCount||0} accounts</div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── Accounts Page ── */
  const renderAccounts = () => (
    <div style={S.ct}>
      {!apiConnected&&<div style={{padding:12,borderRadius:8,background:"rgba(246,194,62,.05)",border:"1px solid rgba(246,194,62,.2)",marginBottom:12,fontSize:12}}>Connect Facebook API in Settings first.</div>}
      {apiConnected&&(
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div style={S.cardT}>Ad Accounts ({accounts.length})</div><button style={S.btn("ghost")} onClick={fetchAccounts}><Ic t="refresh" sz={13}/> Refresh</button></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:14}}>
            {[{l:"Total",v:accounts.length,c:T.ac},{l:"Active",v:accounts.filter(a=>a.status==="active").length,c:T.ok},{l:"Disabled",v:accounts.filter(a=>a.status==="disabled").length,c:T.err},{l:"Last Sync",v:lastSync||"-",c:T.warn}].map((s,i)=><div key={i} style={{background:"rgba(255,255,255,.02)",borderRadius:8,border:"1px solid "+T.bd,padding:13}}><div style={{fontSize:10,color:T.txM,textTransform:"uppercase",letterSpacing:".5px",marginBottom:4}}>{s.l}</div><div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div></div>)}
          </div>
          <div style={{maxHeight:400,overflowY:"auto"}}>{accounts.map((a,i)=><div key={a.id} className="hr" style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:4,marginBottom:1}}><span style={S.dot(a.status)}/><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{a.name}</div><div style={{fontSize:10,color:T.txD,fontFamily:MONO}}>{a.id}</div></div><div style={{fontSize:11,color:T.txM}}>{a.business_name||"-"}</div><div style={{fontSize:11,fontFamily:MONO,color:T.txM}}>{a.currency} ${parseFloat(a.amount_spent||0).toLocaleString()}</div></div>)}</div>
        </div>
      )}
    </div>
  );

  /* ── Settings Page ── */
  const renderSettings = () => (
    <div style={S.ct}>
      <div style={S.card}>
        <div style={S.cardT}>Facebook API Settings</div><div style={S.cardD}>Connect your Business Manager</div>
        <div style={{padding:12,background:"rgba(45,127,249,.05)",borderRadius:8,border:"1px solid rgba(45,127,249,.12)",marginBottom:16,fontSize:11.5,color:T.txM,lineHeight:1.7}}>
          <div style={{fontWeight:700,color:T.ac,marginBottom:4}}>Setup Steps:</div>
          <div>1. Go to business.facebook.com - Settings - System Users</div>
          <div>2. Create System User (Admin) - Generate Token with ads_management, ads_read</div>
          <div>3. Copy Business ID from Business Settings</div>
          <div>4. Assign all ad accounts to the System User</div>
        </div>
        <div style={{...S.row,marginBottom:12}}>
          <div style={S.col()}><label style={S.lbl}>Business ID *</label><input style={{...S.inp,fontFamily:MONO}} value={fbBizId} onChange={e=>setFbBizId(e.target.value)} placeholder="1234567890" disabled={apiConnected}/></div>
          <div style={S.col()}><label style={S.lbl}>App ID (optional)</label><input style={{...S.inp,fontFamily:MONO}} value={fbAppId} onChange={e=>setFbAppId(e.target.value)} placeholder="9876543210" disabled={apiConnected}/></div>
        </div>
        <div style={{marginBottom:12}}><label style={S.lbl}>System User Access Token *</label><div style={{position:"relative"}}><input type={showToken?"text":"password"} style={{...S.inp,fontFamily:MONO,paddingRight:36}} value={fbToken} onChange={e=>setFbToken(e.target.value)} placeholder="EAAxxxxxxx..." disabled={apiConnected}/><button style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:T.txM,cursor:"pointer"}} onClick={()=>setShowToken(!showToken)}><Ic t={showToken?"eyeOff":"eye"} sz={14}/></button></div></div>
        <div style={{marginBottom:12}}><label style={S.lbl}>App Secret (optional)</label><div style={{position:"relative"}}><input type={showSecret?"text":"password"} style={{...S.inp,fontFamily:MONO,paddingRight:36}} value={fbAppSecret} onChange={e=>setFbAppSecret(e.target.value)} placeholder="Secret..." disabled={apiConnected}/><button style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:T.txM,cursor:"pointer"}} onClick={()=>setShowSecret(!showSecret)}><Ic t={showSecret?"eyeOff":"eye"} sz={14}/></button></div></div>
        {apiError&&<div style={{padding:8,borderRadius:6,background:"rgba(231,74,59,.07)",border:"1px solid rgba(231,74,59,.2)",color:T.err,fontSize:12,marginBottom:12}}>{apiError}</div>}
        <div style={{display:"flex",gap:8}}>
          {!apiConnected?<button style={S.btn("fb")} onClick={connectApi} disabled={apiLoading}>{apiLoading?"Connecting...":"Connect Facebook API"}</button>:<><button style={S.btn("ghost")} onClick={fetchAccounts}><Ic t="refresh" sz={13}/> Refresh</button><button style={S.btn("danger")} onClick={disconnectApi}>Disconnect</button></>}
        </div>
      </div>
    </div>
  );

  const renderLogs = () => (
    <div style={S.ct}>
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
          <div style={S.cardT}>System Logs ({logs.length})</div>
          <div style={{display:"flex",gap:6}}>
            <button style={S.btn("ghost")} onClick={()=>setLogs(p=>p.filter(l=>l.type==="error"))}>Errors Only</button>
            <button style={S.btn("danger")} onClick={()=>setLogs([])}>Clear</button>
          </div>
        </div>
        {logs.length===0?<div style={{textAlign:"center",padding:32,color:T.txD}}>No logs yet. Logs appear when you connect API or publish campaigns.</div>:
        <div style={{maxHeight:500,overflowY:"auto"}}>{logs.map((l,i)=>(
          <div key={i} style={{display:"flex",gap:10,padding:"8px 12px",borderRadius:5,marginBottom:2,background:l.type==="error"?"rgba(231,74,59,.04)":l.type==="success"?"rgba(28,200,138,.04)":"rgba(45,127,249,.04)",borderLeft:l.type==="error"?"3px solid "+T.err:l.type==="success"?"3px solid "+T.ok:"3px solid "+T.ac,fontSize:12}}>
            <div style={{color:T.txD,fontFamily:"'JetBrains Mono',monospace",fontSize:10,minWidth:70,paddingTop:2}}>{l.ts}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,color:l.type==="error"?T.err:l.type==="success"?T.ok:T.ac}}>{l.msg}</div>
              {l.detail&&<div style={{color:T.txM,fontSize:11,marginTop:2,fontFamily:"'JetBrains Mono',monospace",wordBreak:"break-all"}}>{l.detail}</div>}
            </div>
          </div>
        ))}</div>}
      </div>
    </div>
  );

  const pages = { dashboard:renderDashboard, create:renderCreate, campaigns:renderCampaigns, accounts:renderAccounts, logs:renderLogs, settings:renderSettings };

  return (
    <div style={S.layout}>
      <style>{CSS}</style>
      {notif&&<div style={S.notif(notif.t)}>{notif.m}</div>}
      <div style={S.sb}>
        <div style={S.sbHead}><div style={S.logo}>B</div>{sbOpen&&<div style={{fontWeight:800,fontSize:14,letterSpacing:"-.3px"}}>BulkAds Pro</div>}</div>
        <div style={S.nav}>{navItems.map(n=><button key={n.id} style={S.ni(pg===n.id)} onClick={()=>setPg(n.id)}><Ic t={n.icon} sz={15}/>{sbOpen&&n.label}</button>)}</div>
      </div>
      <div style={S.main}>
        <div style={S.top}><div style={{fontWeight:700,fontSize:14}}>{titles[pg]||"BulkAds Pro"}</div><div style={{display:"flex",alignItems:"center",gap:10}}>{wsConnected&&<span style={{fontSize:11,color:T.ok,fontWeight:600}}><Ic t="ws" sz={13}/> Live</span>}{apiConnected&&<span style={{fontSize:11,color:T.ok}}>{accounts.length} accounts</span>}</div></div>
        {(pages[pg]||renderDashboard)()}
      </div>
    </div>
  );
}
