// ─── FocusForge — Web App Script ─────────────────────────────────────────────
import { firebaseConfig, USERS, APP_NAME, REWARD_ICONS } from "./config.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  collection,
  getDocs,
  onSnapshot,
  runTransaction,
  addDoc,
  deleteDoc,
  writeBatch,
  updateDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── Init ─────────────────────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ─── Runtime State ────────────────────────────────────────────────────────────
const userData      = {};          // { User1: {...}, User2: {...} }
let   allTransactions = [];
let   historyFilter   = "all";
let   storeUser       = USERS[0].id;
let   currentItems    = [];
let   parsedItems     = [];

// ─── Page title ───────────────────────────────────────────────────────────────
document.title = APP_NAME + " — Points & Rewards";
document.querySelectorAll(".logo-text").forEach(el => el.textContent = APP_NAME);

// ═════════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ═════════════════════════════════════════════════════════════════════════════
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("page-" + btn.dataset.page).classList.add("active");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD — build user cards dynamically from config USERS array
// ═════════════════════════════════════════════════════════════════════════════
function buildDashboard() {
  const grid = document.getElementById("cards-grid");
  grid.innerHTML = USERS.map(u => `
    <div class="user-card" id="card-${u.id}" style="border-top:3px solid ${u.color}">
      <div class="user-avatar" style="background:${u.color}22;color:${u.color}">${u.avatar}</div>
      <div class="user-info">
        <div class="user-name">${u.name}</div>
        <div class="user-pts-label">TOTAL POINTS</div>
        <div class="user-pts" id="${u.id}-points" style="color:${u.color}">—</div>
        <div class="user-meta">
          <span>Claims today: <strong id="${u.id}-daily">—</strong></span>
          <span>Last: <strong id="${u.id}-last">—</strong></span>
        </div>
      </div>
      <div class="card-glow" style="background:${u.color}"></div>
    </div>`).join("");

  // Store user selector buttons
  const bar = document.getElementById("store-user-bar");
  bar.innerHTML = USERS.map((u, i) => `
    <button class="user-sel ${i === 0 ? 'active' : ''}" data-user="${u.id}">${u.name}</button>
  `).join("");
  bar.querySelectorAll(".user-sel").forEach(btn => {
    btn.addEventListener("click", () => {
      bar.querySelectorAll(".user-sel").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      storeUser = btn.dataset.user;
      updateStoreBalance();
    });
  });
}
buildDashboard();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTs(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
}
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function getUserColor(id) { return USERS.find(u => u.id === id)?.color ?? "var(--accent)"; }

function showToast(msg, type = "ok") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast " + type + " show";
  setTimeout(() => t.classList.remove("show"), 3000);
}

function updateStoreBalance() {
  const pts = userData[storeUser]?.points ?? "—";
  document.getElementById("store-balance").textContent = pts;
}

// ═════════════════════════════════════════════════════════════════════════════
// REALTIME LISTENERS
// ═════════════════════════════════════════════════════════════════════════════

// ── User data ─────────────────────────────────────────────────────────────────
USERS.forEach(u => {
  onSnapshot(doc(db, "users", u.id), snap => {
    if (!snap.exists()) return;
    userData[u.id] = snap.data();

    const d = userData[u.id];
    document.getElementById(u.id + "-points").textContent = d.points  ?? 0;
    document.getElementById(u.id + "-daily").textContent  = d.dailyClaims ?? 0;
    const last = d.lastClaim;
    document.getElementById(u.id + "-last").textContent =
      last ? (last.toDate ? last.toDate().toLocaleTimeString("en-IN") : last) : "Never";

    updateStoreBalance();
    renderLeaderboard();
  });
});

// ── Transactions ──────────────────────────────────────────────────────────────
const txQuery = query(collection(db, "transactions"), orderBy("timestamp", "desc"), limit(50));
onSnapshot(txQuery, snap => {
  allTransactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderHistory();
  renderLiveFeed();
});

// ── Rewards ───────────────────────────────────────────────────────────────────
onSnapshot(collection(db, "rewards"), snap => {
  currentItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderRewards(currentItems);
  renderAdminItems(currentItems);
  const lbl = document.getElementById("item-count-label");
  if (lbl) lbl.textContent = currentItems.length + " item" + (currentItems.length !== 1 ? "s" : "") + " in store";
});

// ═════════════════════════════════════════════════════════════════════════════
// STORE
// ═════════════════════════════════════════════════════════════════════════════
function renderRewards(rewards) {
  const grid = document.getElementById("rewards-grid");
  if (!rewards.length) {
    grid.innerHTML = `<div class="loading-ph">No rewards yet — add some in Manage!</div>`;
    return;
  }
  grid.innerHTML = rewards.map((r, i) => {
    const noStock = r.stock <= 0;
    return `
      <div class="reward-card ${noStock ? 'no-stock' : ''}">
        <div class="reward-icon">${REWARD_ICONS[i % REWARD_ICONS.length]}</div>
        <div class="reward-name">${r.name}</div>
        <div class="reward-cost">⚡ ${r.cost} pts</div>
        <div class="reward-stock">${noStock ? 'Out of stock' : r.stock + ' remaining'}</div>
        <button class="redeem-btn" data-id="${r.id}" data-cost="${r.cost}" data-name="${r.name}"
          ${noStock ? 'disabled' : ''}>${noStock ? 'Unavailable' : 'Redeem'}</button>
      </div>`;
  }).join("");

  grid.querySelectorAll(".redeem-btn:not(:disabled)").forEach(btn => {
    btn.addEventListener("click", () =>
      redeemReward(btn.dataset.id, parseInt(btn.dataset.cost), btn.dataset.name));
  });
}

async function redeemReward(rewardId, cost, rewardName) {
  const userPts = userData[storeUser]?.points ?? 0;
  if (userPts < cost) {
    showToast(`Need ${cost} pts — you have ${userPts}`, "err"); return;
  }
  try {
    await runTransaction(db, async tx => {
      const uSnap = await tx.get(doc(db, "users", storeUser));
      const rSnap = await tx.get(doc(db, "rewards", rewardId));
      if (!uSnap.exists() || !rSnap.exists()) throw new Error("Data missing");
      if (uSnap.data().points < cost)  throw new Error("Insufficient points");
      if (rSnap.data().stock  <= 0)    throw new Error("Out of stock");
      tx.update(doc(db, "users",   storeUser), { points: uSnap.data().points - cost });
      tx.update(doc(db, "rewards", rewardId),  { stock:  rSnap.data().stock  - 1    });
    });
    await addDoc(collection(db, "transactions"), {
      user: storeUser, type: "spend", points: cost,
      reward: rewardName, timestamp: serverTimestamp()
    });
    showToast(`🎉 Redeemed "${rewardName}" for ${cost} pts!`, "ok");
  } catch (err) {
    showToast("Failed: " + err.message, "err");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// LEADERBOARD
// ═════════════════════════════════════════════════════════════════════════════
function renderLeaderboard() {
  const sorted = [...USERS]
    .map(u => ({ ...u, points: userData[u.id]?.points ?? 0, claims: userData[u.id]?.dailyClaims ?? 0 }))
    .sort((a, b) => b.points - a.points);

  const maxPts = Math.max(...sorted.map(u => u.points), 1);

  document.getElementById("lb-container").innerHTML = sorted.map((u, i) => `
    <div class="lb-card ${i === 0 ? 'rank-1' : ''}" style="${i === 0 ? 'border-color:' + u.color : ''}">
      <div class="lb-rank" style="${i === 0 ? 'color:' + u.color : ''}">${i + 1}</div>
      <div class="lb-avatar" style="background:${u.color}22;color:${u.color}">${u.avatar}</div>
      <div>
        <div class="lb-name">${u.name}</div>
        <div class="lb-sub">${u.claims} claims today</div>
      </div>
      <div class="lb-pts" style="color:${i === 0 ? u.color : 'var(--text)'}">${u.points}</div>
      <div class="lb-bar-track">
        <div class="lb-bar-fill" style="width:${Math.round(u.points / maxPts * 100)}%;background:${u.color}"></div>
      </div>
    </div>`).join("");
}

// ═════════════════════════════════════════════════════════════════════════════
// HISTORY
// ═════════════════════════════════════════════════════════════════════════════
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    historyFilter = btn.dataset.filter;
    renderHistory();
  });
});

function renderHistory() {
  const filtered = historyFilter === "all"
    ? allTransactions
    : allTransactions.filter(t => t.type === historyFilter);

  const list = document.getElementById("history-list");
  if (!filtered.length) {
    list.innerHTML = `<div class="loading-ph">No transactions yet.</div>`; return;
  }
  list.innerHTML = filtered.map(tx => {
    const color  = getUserColor(tx.user);
    const sign   = tx.type === "earn" ? "+" : "−";
    const detail = tx.reward ? " · " + tx.reward : "";
    return `
      <div class="tx-item tx-${tx.type}">
        <div class="tx-type-badge ${tx.type}">${tx.type === "earn" ? "EARNED" : "SPENT"}</div>
        <div>
          <div class="tx-user" style="color:${color}">${capitalize(tx.user ?? "")}</div>
          <div class="tx-ts">${fmtTs(tx.timestamp)}${detail}</div>
        </div>
        <div class="tx-pts" style="color:${tx.type === 'earn' ? 'var(--accent)' : 'var(--accent3)'}">
          ${sign}${tx.points}
        </div>
      </div>`;
  }).join("");
}

function renderLiveFeed() {
  const list   = document.getElementById("live-feed-list");
  const recent = allTransactions.slice(0, 8);
  if (!recent.length) {
    list.innerHTML = `<div class="feed-empty">No activity yet...</div>`; return;
  }
  list.innerHTML = recent.map(tx => `
    <div class="feed-item">
      <span class="feed-badge ${tx.type}">${tx.type === "earn" ? "EARN" : "SPEND"}</span>
      <span class="feed-user">${capitalize(tx.user ?? "")}${tx.reward ? " · " + tx.reward : ""}</span>
      <span class="feed-pts">${tx.type === "earn" ? "+" : "−"}${tx.points} pts</span>
    </div>`).join("");
}

// ═════════════════════════════════════════════════════════════════════════════
// MANAGE PAGE
// ═════════════════════════════════════════════════════════════════════════════

// ── Collapsible bulk panel ────────────────────────────────────────────────────
document.getElementById("bulk-toggle").addEventListener("click", () => {
  const body = document.getElementById("bulk-body");
  const btn  = document.getElementById("bulk-toggle");
  body.classList.toggle("collapsed");
  btn.textContent = body.classList.contains("collapsed") ? "Expand ▾" : "Collapse ▴";
});

// ── Format tabs ───────────────────────────────────────────────────────────────
document.querySelectorAll(".fmt-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".fmt-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const fmt = tab.dataset.fmt;
    document.getElementById("hint-json").classList.toggle("hidden", fmt !== "json");
    document.getElementById("hint-csv").classList.toggle("hidden",  fmt !== "csv");
  });
});

// ── Drop zone ─────────────────────────────────────────────────────────────────
const dropZone  = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover",  e => { e.preventDefault(); dropZone.classList.add("dragover"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener("change", e => { if (e.target.files[0]) readFile(e.target.files[0]); });

function readFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById("paste-area").value = e.target.result;
    dropZone.querySelector(".drop-text").textContent = "✓ " + file.name;
    if (file.name.endsWith(".csv")) {
      document.querySelectorAll(".fmt-tab").forEach(t => t.classList.toggle("active", t.dataset.fmt === "csv"));
      document.getElementById("hint-json").classList.add("hidden");
      document.getElementById("hint-csv").classList.remove("hidden");
    }
  };
  reader.readAsText(file);
}

// ── Parse ─────────────────────────────────────────────────────────────────────
document.getElementById("parse-btn").addEventListener("click", () => {
  const raw   = document.getElementById("paste-area").value.trim();
  const isCsv = document.querySelector(".fmt-tab.active")?.dataset.fmt === "csv";
  setBulkStatus("", "");
  if (!raw) { setBulkStatus("Nothing to parse — paste content first.", "err"); return; }
  try {
    parsedItems = isCsv ? parseCsv(raw) : parseJson(raw);
  } catch (err) {
    setBulkStatus("Parse error: " + err.message, "err"); return;
  }
  if (!parsedItems.length) { setBulkStatus("No valid items found.", "err"); return; }
  renderPreview(parsedItems);
  document.getElementById("bulk-preview").classList.remove("hidden");
  document.getElementById("preview-count").textContent =
    parsedItems.filter(i => !i._err).length + " valid items ready";
});

function parseJson(raw) {
  const arr = JSON.parse(raw);
  if (!Array.isArray(arr)) throw new Error("Expected a JSON array [ ... ]");
  return arr.map(validateItem);
}

function parseCsv(raw) {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV needs header row + at least 1 data row");
  const h = lines[0].split(",").map(s => s.trim().toLowerCase());
  const [ni, ci, si] = [h.indexOf("name"), h.indexOf("cost"), h.indexOf("stock")];
  if (ni < 0 || ci < 0 || si < 0) throw new Error("CSV must have columns: name, cost, stock");
  return lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.trim());
    return validateItem({ name: cols[ni], cost: cols[ci], stock: cols[si] });
  });
}

function validateItem(raw) {
  const name  = String(raw.name ?? "").trim();
  const cost  = parseInt(raw.cost);
  const stock = parseInt(raw.stock);
  const errs  = [];
  if (!name)                  errs.push("name empty");
  if (isNaN(cost)  || cost  < 1) errs.push("bad cost");
  if (isNaN(stock) || stock < 0) errs.push("bad stock");
  return errs.length ? { name, cost, stock, _err: errs.join(", ") } : { name, cost, stock };
}

function renderPreview(items) {
  const tbody = document.getElementById("preview-tbody");
  tbody.innerHTML = items.map((item, i) => item._err
    ? `<tr class="row-error"><td>${item.name||"—"}</td><td>${item.cost??"—"}</td>
       <td>${item.stock??"—"}</td><td><span class="err-badge">⚠ ${item._err}</span></td></tr>`
    : `<tr><td>${item.name}</td><td>${item.cost}</td><td>${item.stock}</td>
       <td><button class="btn-icon del" data-idx="${i}">✕</button></td></tr>`
  ).join("");

  tbody.querySelectorAll(".btn-icon.del").forEach(btn => {
    btn.addEventListener("click", () => {
      parsedItems.splice(parseInt(btn.dataset.idx), 1);
      renderPreview(parsedItems);
      document.getElementById("preview-count").textContent =
        parsedItems.filter(i => !i._err).length + " valid items ready";
      if (!parsedItems.length) document.getElementById("bulk-preview").classList.add("hidden");
    });
  });
}

document.getElementById("bulk-cancel").addEventListener("click", resetBulk);

function resetBulk() {
  document.getElementById("bulk-preview").classList.add("hidden");
  document.getElementById("paste-area").value = "";
  dropZone.querySelector(".drop-text").textContent = "Drop a .json or .csv file here";
  parsedItems = [];
  setBulkStatus("", "");
}

// ── Confirm upload ────────────────────────────────────────────────────────────
document.getElementById("bulk-confirm").addEventListener("click", async () => {
  const valid   = parsedItems.filter(i => !i._err);
  const replace = document.getElementById("replace-mode").checked;
  const btn     = document.getElementById("bulk-confirm");
  if (!valid.length) { setBulkStatus("No valid items to upload.", "err"); return; }

  btn.disabled = true;
  setBulkStatus("Uploading...", "");

  try {
    if (replace) {
      setBulkStatus("Deleting existing items...", "");
      const snap     = await getDocs(collection(db, "rewards"));
      const delBatch = writeBatch(db);
      snap.docs.forEach(d => delBatch.delete(d.ref));
      await delBatch.commit();
    }

    for (let i = 0; i < valid.length; i += 499) {
      const batch = writeBatch(db);
      valid.slice(i, i + 499).forEach(item => {
        batch.set(doc(collection(db, "rewards")), { name: item.name, cost: item.cost, stock: item.stock });
      });
      await batch.commit();
    }

    setBulkStatus(`✓ Uploaded ${valid.length} item${valid.length > 1 ? "s" : ""} successfully!`, "ok");
    resetBulk();
  } catch (err) {
    setBulkStatus("Upload failed: " + err.message, "err");
  }
  btn.disabled = false;
});

function setBulkStatus(msg, type) {
  const el = document.getElementById("bulk-status");
  el.textContent = msg;
  el.className   = "bulk-status" + (type ? " " + type : "");
}

// ── Single add ────────────────────────────────────────────────────────────────
document.getElementById("single-add").addEventListener("click", async () => {
  const name  = document.getElementById("single-name").value.trim();
  const cost  = parseInt(document.getElementById("single-cost").value);
  const stock = parseInt(document.getElementById("single-stock").value);
  if (!name)                  { showToast("Enter an item name", "err"); return; }
  if (isNaN(cost)  || cost  < 1) { showToast("Enter a valid cost ≥ 1",  "err"); return; }
  if (isNaN(stock) || stock < 0) { showToast("Enter a valid stock ≥ 0", "err"); return; }
  try {
    await addDoc(collection(db, "rewards"), { name, cost, stock });
    showToast("✓ Added: " + name, "ok");
    ["single-name","single-cost","single-stock"].forEach(id => document.getElementById(id).value = "");
  } catch (err) {
    showToast("Failed: " + err.message, "err");
  }
});

// ── Admin items list ──────────────────────────────────────────────────────────
function renderAdminItems(items) {
  const list = document.getElementById("admin-items-list");
  if (!list) return;
  if (!items.length) {
    list.innerHTML = `<div class="loading-ph">No items yet — add some above!</div>`; return;
  }
  list.innerHTML = items.map(item => `
    <div class="admin-item" data-id="${item.id}">
      <div class="ai-name">${item.name}</div>
      <div class="ai-cost">⚡ ${item.cost} pts</div>
      <div class="ai-stock">
        Stock:&nbsp;<input class="ai-stock-input" type="number" value="${item.stock}" min="0" data-id="${item.id}"/>
      </div>
      <div class="ai-actions">
        <button class="btn-icon save-stock" data-id="${item.id}" title="Save stock">✓</button>
        <button class="btn-icon del delete-item" data-id="${item.id}" title="Delete">🗑</button>
      </div>
    </div>`).join("");

  list.querySelectorAll(".save-stock").forEach(btn => {
    btn.addEventListener("click", async () => {
      const val = parseInt(list.querySelector(`.ai-stock-input[data-id="${btn.dataset.id}"]`).value);
      if (isNaN(val) || val < 0) { showToast("Invalid stock value", "err"); return; }
      try {
        await updateDoc(doc(db, "rewards", btn.dataset.id), { stock: val });
        showToast("Stock updated", "ok");
      } catch (err) { showToast("Failed: " + err.message, "err"); }
    });
  });

  list.querySelectorAll(".delete-item").forEach(btn => {
    btn.addEventListener("click", async () => {
      const item = currentItems.find(i => i.id === btn.dataset.id);
      if (!confirm(`Delete "${item?.name}"?`)) return;
      try {
        await deleteDoc(doc(db, "rewards", btn.dataset.id));
        showToast("Deleted", "ok");
      } catch (err) { showToast("Failed: " + err.message, "err"); }
    });
  });
}

// ── Clear all ─────────────────────────────────────────────────────────────────
document.getElementById("clear-all-btn").addEventListener("click", async () => {
  if (!currentItems.length) { showToast("Store is already empty", "err"); return; }
  if (!confirm(`Delete ALL ${currentItems.length} items? This cannot be undone.`)) return;
  try {
    const batch = writeBatch(db);
    currentItems.forEach(item => batch.delete(doc(db, "rewards", item.id)));
    await batch.commit();
    showToast("Store cleared", "ok");
  } catch (err) { showToast("Failed: " + err.message, "err"); }
});


