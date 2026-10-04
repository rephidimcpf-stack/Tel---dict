/* Telugu Nighantuvu — Telugu–Telugu dictionary PWA */
"use strict";

const LS = {
  user: "tkk.user",
  deleted: "tkk.deleted",
  fav: "tkk.fav",
  settings: "tkk.settings",
};
const ACCENTS = ["#7C3AED", "#4F46E5", "#0D9488", "#E11D48", "#D97706", "#16A34A"];
const MAX_RESULTS = 200;

const state = {
  entries: [],      // base entries
  baseIndex: new Map(),
  user: {},         // word -> entry (added or edited)
  deleted: new Set(),
  fav: new Set(),
  settings: { theme: "system", accent: ACCENTS[0] },
  searchList: [],
  currentWord: null,
  editingWord: null,
  restorePayload: null,
  loaded: false,
};

/* ---------- storage ---------- */
function loadLocal() {
  try { state.user = JSON.parse(localStorage.getItem(LS.user) || "{}") || {}; } catch (e) { state.user = {}; }
  try { state.deleted = new Set(JSON.parse(localStorage.getItem(LS.deleted) || "[]")); } catch (e) { state.deleted = new Set(); }
  try { state.fav = new Set(JSON.parse(localStorage.getItem(LS.fav) || "[]")); } catch (e) { state.fav = new Set(); }
  try {
    const s = JSON.parse(localStorage.getItem(LS.settings) || "{}");
    if (s && typeof s === "object") state.settings = Object.assign(state.settings, s);
  } catch (e) {}
}
function saveUser() { localStorage.setItem(LS.user, JSON.stringify(state.user)); }
function saveDeleted() { localStorage.setItem(LS.deleted, JSON.stringify([...state.deleted])); }
function saveFav() { localStorage.setItem(LS.fav, JSON.stringify([...state.fav])); }
function saveSettings() { localStorage.setItem(LS.settings, JSON.stringify(state.settings)); }

/* ---------- theme ---------- */
function applyTheme() {
  const t = state.settings.theme;
  const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.setProperty("--accent", state.settings.accent);
}
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (state.settings.theme === "system") applyTheme();
});

/* ---------- data load ---------- */
async function loadData() {
  const statusEl = document.getElementById("status");
  let arr = null;
  try {
    const resp = await fetch("data/words.json.gz");
    if (resp.ok && "DecompressionStream" in window) {
      const stream = resp.body.pipeThrough(new DecompressionStream("gzip"));
      arr = JSON.parse(await new Response(stream).text());
    }
  } catch (e) { arr = null; }
  if (!arr) {
    try {
      const resp2 = await fetch("data/words.json");
      arr = await resp2.json();
    } catch (e) {
      statusEl.textContent = "Could not load dictionary data. Open the app from its web address (https://…), not directly as a file.";
      return;
    }
  }
  state.entries = arr;
  state.baseIndex = new Map(arr.map((e) => [e.w, e]));
  state.loaded = true;
  rebuild();
  statusEl.textContent = "";
  updateStats();
  renderResults();
}

function rebuild() {
  const list = [];
  for (const e of state.entries) {
    if (state.deleted.has(e.w)) continue;
    const o = state.user[e.w];
    list.push(o ? o : e);
  }
  for (const w in state.user) {
    if (!state.baseIndex.has(w) && !state.deleted.has(w)) list.push(state.user[w]);
  }
  list.sort((a, b) => (a.w < b.w ? -1 : a.w > b.w ? 1 : 0));
  state.searchList = list;
}

/* ---------- helpers ---------- */
function getEntry(w) {
  if (state.deleted.has(w)) return null;
  return state.user[w] || state.baseIndex.get(w) || null;
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* ---------- search ---------- */
let searchTimer = null;
function onSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderResults, 110);
}

function scoreEntry(e, raw) {
  const q = raw.toLowerCase();
  let s = 0;
  if (e.w === raw) s = 100;
  else if (e.w.startsWith(raw)) s = 88;
  else if (e.w.includes(raw)) s = 62;
  if (e.t) {
    const t = e.t.toLowerCase();
    if (t === q) s = Math.max(s, 92);
    else if (t.startsWith(q)) s = Math.max(s, 50);
    else if (t.includes(q)) s = Math.max(s, 38);
  }
  if (e.e && e.e.toLowerCase().includes(q)) s = Math.max(s, 20);
  if (e.m && e.m.includes(raw)) s = Math.max(s, 12);
  if (e.s && e.s.includes(raw)) s = Math.max(s, 8);
  return s;
}

function renderResults() {
  const q = document.getElementById("q").value.trim();
  const clearBtn = document.getElementById("clearQ");
  clearBtn.classList.toggle("hidden", !q);
  const statusEl = document.getElementById("status");
  const box = document.getElementById("results");
  box.innerHTML = "";
  if (!state.loaded) return;
  if (!q) {
    statusEl.textContent = "Type to search " + state.entries.length.toLocaleString("en-IN") + " Telugu words. Tap + to add your own.";
    return;
  }
  const hits = [];
  for (const e of state.searchList) {
    const s = scoreEntry(e, q);
    if (s > 0) hits.push({ e, s });
  }
  hits.sort((a, b) => b.s - a.s || (a.e.w < b.e.w ? -1 : 1));
  const out = hits.slice(0, MAX_RESULTS).map((h) => h.e);
  statusEl.textContent = hits.length ? hits.length + (hits.length > MAX_RESULTS ? "+" : "") + " result" + (hits.length === 1 ? "" : "s") : "No match found.";
  const frag = document.createDocumentFragment();
  for (const e of out) frag.appendChild(card(e));
  box.appendChild(frag);
}

function card(e) {
  const div = document.createElement("div");
  div.className = "entry-card";
  div.onclick = () => openEntry(e.w);
  const fav = state.fav.has(e.w) ? ' <span class="star">★</span>' : "";
  div.innerHTML =
    '<div class="ec-top"><span class="ec-word">' + esc(e.w) + "</span>" +
    (e.t ? '<span class="ec-translit">' + esc(e.t) + "</span>" : "") +
    (e.p ? '<span class="chip">' + esc(e.p) + "</span>" : "") + fav + "</div>" +
    (e.m ? '<p class="ec-meaning telugu">' + esc(e.m) + "</p>" : "") +
    (!e.m && e.e ? '<p class="ec-meaning">' + esc(e.e) + "</p>" : "") +
    (e.m && e.e ? '<p class="ec-eng">' + esc(e.e) + "</p>" : "");
  return div;
}

/* ---------- views ---------- */
function show(view) {
  for (const id of ["view-search", "view-fav", "view-settings", "view-entry", "view-edit"]) {
    document.getElementById(id).classList.toggle("hidden", id !== view);
  }
  document.getElementById("addFab").classList.toggle("hidden", view !== "search");
  const tabFor = { "view-search": "search", "view-fav": "fav", "view-settings": "settings" }[view];
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === tabFor));
  window.scrollTo({ top: 0 });
}

/* ---------- entry detail ---------- */
function openEntry(word) {
  const e = getEntry(word);
  if (!e) return;
  state.currentWord = word;
  const isUser = !!state.user[word] || !state.baseIndex.has(word);
  const body = document.getElementById("entryBody");
  const syns = (e.s || "").split(/;|,|\n/).map((x) => x.trim()).filter(Boolean).slice(0, 20);
  body.innerHTML =
    '<div class="detail-head"><div style="flex:1"><h2>' + esc(e.w) + "</h2>" +
    (e.t ? '<p class="detail-translit">' + esc(e.t) + "</p>" : "") + "</div></div>" +
    (e.p ? '<div style="margin-top:8px"><span class="chip">' + esc(e.p) + "</span></div>" : "") +
    '<div class="detail-actions">' +
    '<button class="btn primary" id="dEdit">Edit</button>' +
    '<button class="btn" id="dFav">' + (state.fav.has(word) ? "★ Favourited" : "☆ Favourite") + "</button>" +
    "</div>" +
    (e.m ? '<div class="sec"><h4>అర్థం · Meaning</h4><p class="telugu">' + esc(e.m) + "</p></div>" : "") +
    (syns.length ? '<div class="sec"><h4>పదాలు · Related</h4><div class="syn">' + syns.map((s) => "<span>" + esc(s) + "</span>").join("") + "</div></div>" : "") +
    (e.e ? '<div class="sec"><h4>English hint</h4><p>' + esc(e.e) + "</p></div>" : "") +
    (!e.m && !e.e ? '<div class="sec"><p class="muted">No meaning saved yet. Tap Edit to add one.</p></div>' : "") +
    (isUser ? '<p class="muted small" style="margin-top:16px">Your entry</p>' : "");
  document.getElementById("dEdit").onclick = () => openEdit(word);
  document.getElementById("dFav").onclick = () => {
    if (state.fav.has(word)) state.fav.delete(word); else state.fav.add(word);
    saveFav(); openEntry(word); renderFav();
  };
  show("view-entry");
}

/* ---------- edit / add ---------- */
function openEdit(word) {
  state.editingWord = word || null;
  const e = word ? getEntry(word) || {} : {};
  document.getElementById("editTitle").textContent = word ? "Edit word" : "Add word";
  document.getElementById("fWord").value = e.w || "";
  document.getElementById("fTranslit").value = e.t || "";
  document.getElementById("fPos").value = e.p || "";
  document.getElementById("fMeaning").value = e.m || "";
  document.getElementById("fSyn").value = e.s || "";
  document.getElementById("fEng").value = e.e || "";
  document.getElementById("fWord").readOnly = !!word;
  document.getElementById("editDelete").classList.toggle("hidden", !word);
  show("view-edit");
  if (!word) setTimeout(() => document.getElementById("fWord").focus(), 50);
}

function saveEdit(ev) {
  ev.preventDefault();
  const w = document.getElementById("fWord").value.trim();
  if (!w) return;
  const entry = { w };
  const t = document.getElementById("fTranslit").value.trim();
  const p = document.getElementById("fPos").value.trim();
  const m = document.getElementById("fMeaning").value.trim();
  const s = document.getElementById("fSyn").value.trim();
  const en = document.getElementById("fEng").value.trim();
  if (t) entry.t = t;
  if (p) entry.p = p;
  if (m) entry.m = m;
  if (s) entry.s = s;
  if (en) entry.e = en;
  state.user[w] = entry;
  state.deleted.delete(w);
  saveUser(); saveDeleted(); rebuild(); updateStats();
  openEntry(w);
}

function deleteEntry() {
  const w = state.editingWord;
  if (!w) return;
  if (!confirm('Delete "' + w + '" from your dictionary?')) return;
  delete state.user[w];
  if (state.baseIndex.has(w)) state.deleted.add(w);
  saveUser(); saveDeleted(); rebuild(); updateStats();
  show("view-search");
}

/* ---------- favourites ---------- */
function renderFav() {
  const box = document.getElementById("favList");
  document.getElementById("favCount").textContent = state.fav.size;
  box.innerHTML = "";
  const list = [...state.fav].sort();
  if (!list.length) {
    box.innerHTML = '<p class="muted">No favourites yet. Open a word and tap ☆ Favourite.</p>';
    return;
  }
  const frag = document.createDocumentFragment();
  for (const w of list) {
    const e = getEntry(w);
    if (e) frag.appendChild(card(e));
  }
  box.appendChild(frag);
}

/* ---------- backup / restore ---------- */
function backupObject() {
  return {
    app: "telugu-nighantuvu",
    version: 1,
    exportedAt: new Date().toISOString(),
    user: state.user,
    deleted: [...state.deleted],
    fav: [...state.fav],
    settings: state.settings,
  };
}

async function exportBackup() {
  const msg = document.getElementById("backupMsg");
  const data = JSON.stringify(backupObject(), null, 2);
  const fname = "telugu-nighantuvu-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  try {
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: fname,
        types: [{ description: "JSON backup", accept: { "application/json": [".json"] } }],
      });
      const w = await handle.createWritable();
      await w.write(data);
      await w.close();
      msg.textContent = "Backup saved to your chosen location.";
      return;
    }
  } catch (e) {
    if (e && e.name === "AbortError") { msg.textContent = "Export cancelled."; return; }
  }
  // fallback: download
  const blob = new Blob([data], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fname;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  msg.textContent = "Backup downloaded. (This browser has no file-location picker.)";
}

async function pickBackupFile() {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: "JSON backup", accept: { "application/json": [".json"] } }],
        multiple: false,
      });
      return await handle.getFile();
    } catch (e) { return null; }
  }
  return new Promise((resolve) => {
    const inp = document.getElementById("importFile");
    inp.onchange = () => resolve(inp.files[0] || null);
    inp.click();
  });
}

async function importBackup() {
  const msg = document.getElementById("backupMsg");
  const file = await pickBackupFile();
  if (!file) { msg.textContent = "Restore cancelled."; return; }
  let obj;
  try { obj = JSON.parse(await file.text()); } catch (e) { msg.textContent = "That file is not a valid backup."; return; }
  if (!obj || obj.app !== "telugu-nighantuvu") { msg.textContent = "This file is not a Telugu Nighantuvu backup."; return; }
  state.restorePayload = obj;
  document.getElementById("modal").classList.remove("hidden");
}

function applyRestore(mode) {
  const obj = state.restorePayload;
  document.getElementById("modal").classList.add("hidden");
  if (!obj) return;
  const msg = document.getElementById("backupMsg");
  if (mode === "replace") {
    state.user = obj.user || {};
    state.deleted = new Set(obj.deleted || []);
    state.fav = new Set(obj.fav || []);
    if (obj.settings) state.settings = Object.assign(state.settings, obj.settings);
  } else {
    Object.assign(state.user, obj.user || {});
    (obj.deleted || []).forEach((w) => state.deleted.add(w));
    (obj.fav || []).forEach((w) => state.fav.add(w));
  }
  saveUser(); saveDeleted(); saveFav(); saveSettings();
  applyTheme(); syncSettingsUI(); rebuild(); renderFav(); updateStats();
  msg.textContent = "Restore complete (" + mode + ").";
}

/* ---------- settings UI ---------- */
function syncSettingsUI() {
  document.querySelectorAll("#themeSeg button").forEach((b) =>
    b.classList.toggle("active", b.dataset.theme === state.settings.theme));
  document.querySelectorAll("#swatches .swatch").forEach((s) =>
    s.classList.toggle("active", s.dataset.color === state.settings.accent));
}
function buildSwatches() {
  const box = document.getElementById("swatches");
  box.innerHTML = "";
  ACCENTS.forEach((c) => {
    const b = document.createElement("button");
    b.className = "swatch";
    b.style.background = c;
    b.dataset.color = c;
    b.title = c;
    b.onclick = () => { state.settings.accent = c; saveSettings(); applyTheme(); syncSettingsUI(); };
    box.appendChild(b);
  });
}

function updateStats() {
  const el = document.getElementById("statsLine");
  if (!el) return;
  const mine = Object.keys(state.user).length;
  el.textContent =
    state.entries.length.toLocaleString("en-IN") + " words in the dictionary · " +
    mine + " your word" + (mine === 1 ? "" : "s") + " · " +
    state.fav.size + " favourite" + (state.fav.size === 1 ? "" : "s") + ".";
}

/* ---------- install ---------- */
let deferredPrompt = null;
function wireInstall() {
  const b1 = document.getElementById("installBtn");
  const b2 = document.getElementById("installBtn2");
  const hint = document.getElementById("installHint");
  const doInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      b1.classList.add("hidden");
    } else {
      hint.textContent = "To install: open your browser menu and choose “Add to Home screen” / “Install app”.";
    }
  };
  b1.onclick = doInstall; b2.onclick = doInstall;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); deferredPrompt = e; b1.classList.remove("hidden");
    hint.textContent = "This device supports one-tap install.";
  });
  window.addEventListener("appinstalled", () => { b1.classList.add("hidden"); hint.textContent = "App installed."; });
  if (matchMedia("(display-mode: standalone)").matches) b1.classList.add("hidden");
}

/* ---------- wiring ---------- */
function init() {
  loadLocal();
  applyTheme();
  buildSwatches();
  syncSettingsUI();
  wireInstall();

  document.getElementById("q").addEventListener("input", onSearch);
  document.getElementById("clearQ").onclick = () => {
    document.getElementById("q").value = ""; onSearch(); document.getElementById("q").focus();
  };
  document.getElementById("addFab").onclick = () => openEdit(null);
  document.getElementById("backFromEntry").onclick = () => show("view-search");
  document.getElementById("backFromEdit").onclick = () => show(state.currentWord ? "view-entry" : "view-search");
  document.getElementById("editForm").addEventListener("submit", saveEdit);
  document.getElementById("editDelete").onclick = deleteEntry;
  document.getElementById("exportBtn").onclick = exportBackup;
  document.getElementById("importBtn").onclick = importBackup;
  document.getElementById("mCancel").onclick = () => { document.getElementById("modal").classList.add("hidden"); state.restorePayload = null; };
  document.getElementById("mMerge").onclick = () => applyRestore("merge");
  document.getElementById("mReplace").onclick = () => applyRestore("replace");
  document.getElementById("resetUserBtn").onclick = () => {
    if (!confirm("Delete all your added/edited words and restore the original dictionary? Your favourites and settings are kept.")) return;
    state.user = {}; state.deleted = new Set();
    saveUser(); saveDeleted(); rebuild(); updateStats();
    document.getElementById("backupMsg").textContent = "Your words and edits were removed.";
  };
  document.querySelectorAll("#themeSeg button").forEach((b) =>
    (b.onclick = () => { state.settings.theme = b.dataset.theme; saveSettings(); applyTheme(); syncSettingsUI(); }));
  document.querySelectorAll(".tab").forEach((t) =>
    (t.onclick = () => { show("view-" + t.dataset.view); if (t.dataset.view === "fav") renderFav(); }));

  loadData();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
}
document.addEventListener("DOMContentLoaded", init);
