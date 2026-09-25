import { REACTIONS, SITE_THEME } from "./firebase-config.js?v=6";
import { getStore, DEMO, toDate, niceDate } from "./data.js?v=6";

document.body.dataset.theme = new URLSearchParams(location.search).get("theme") || SITE_THEME || document.body.dataset.theme;

// Dark / light switch (shared with the main page through localStorage)
const modeBtn = document.getElementById("modeToggle");
function paintMode() {
  modeBtn.textContent = document.body.dataset.mode !== "light" ? "☀ Light mode" : "☾ Dark mode";
}
modeBtn.addEventListener("click", () => {
  document.body.dataset.mode = document.body.dataset.mode === "light" ? "dark" : "light";
  try { localStorage.setItem("mode", document.body.dataset.mode); } catch {}
  paintMode();
});
paintMode();

const $ = id => document.getElementById(id);
if (DEMO) $("demo").hidden = false;

// Reactions grouped by the kind of response they signal.
const GROUPS = [
  { id: "positive", label: "Enjoyed it", color: "var(--s-positive)", types: ["heart", "like", "great", "amazing", "supergood"] },
  { id: "learning", label: "Learned / want to discuss", color: "var(--s-learning)", types: ["learned", "discuss"] },
  { id: "critical", label: "Critical", color: "var(--s-critical)", types: ["boring", "moreaction"] }
];
const groupOf = Object.fromEntries(GROUPS.flatMap(g => g.types.map(t => [t, g.id])));
const byId = Object.fromEntries(REACTIONS.map(r => [r.id, r]));
const rxText = r => (r.icon ? r.icon + " " : "") + r.label;

// ---------- tooltip ----------
const tip = $("tip");
function hover(el, html) {
  el.addEventListener("mousemove", e => {
    tip.innerHTML = html();
    tip.hidden = false;
    const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    tip.style.left = x + "px";
    tip.style.top = (e.clientY + 14) + "px";
  });
  el.addEventListener("mouseleave", () => { tip.hidden = true; });
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

// ---------- data ----------
const store = await getStore();
let videos = [];
const rx = {};          // videoId -> reactions[]
const stops = {};

store.watchVideos(list => {
  videos = list.filter(v => v.visible !== false);
  for (const v of videos) {
    if (stops[v.id]) continue;
    stops[v.id] = store.watchReactions(v.id, r => { rx[v.id] = r; render(); }, err => console.error(err));
  }
  render();
}, err => {
  console.error(err);
  $("status").textContent = "Could not load data. Please refresh the page.";
});

// ---------- render ----------
function render() {
  if (!videos.length) {
    $("status").hidden = false;
    $("status").textContent = "No documentaries posted yet.";
    $("dash").hidden = true;
    return;
  }
  $("status").hidden = true;
  $("dash").hidden = false;

  const all = videos.flatMap(v => (rx[v.id] || []).filter(r => byId[r.type]));
  const counts = Object.fromEntries(REACTIONS.map(r => [r.id, 0]));
  all.forEach(r => counts[r.type]++);
  const ranked = REACTIONS.map(r => ({ ...r, n: counts[r.id] })).sort((a, b) => b.n - a.n);

  // KPIs
  $("kDocs").textContent = videos.length;
  $("kRx").textContent = all.length;
  $("kAvg").textContent = (all.length / videos.length).toFixed(1);
  const top = ranked.filter(r => r.n === ranked[0].n && r.n > 0);
  $("kTop").textContent = top.length ? top.map(rxText).join(", ") : "None yet";

  renderByType(ranked, all.length);
  renderMix();
  renderDaily(all);
  renderTable();
}

function renderByType(ranked, total) {
  const box = $("byType");
  box.innerHTML = "";
  const max = Math.max(1, ...ranked.map(r => r.n));
  for (const r of ranked) {
    const l = document.createElement("div");
    l.className = "hb-label";
    l.textContent = rxText(r);
    const t = document.createElement("div");
    t.className = "hb-track";
    const f = document.createElement("div");
    f.className = "hb-fill" + (r.n ? "" : " zero");
    f.style.width = `calc(${(r.n / max) * 100}% - 40px)`;
    const n = document.createElement("span");
    n.className = "hb-num";
    n.textContent = r.n;
    t.append(f, n);
    const pct = total ? Math.round((r.n / total) * 100) : 0;
    hover(t, () => `<strong>${esc(rxText(r))}</strong>${plural(r.n, "reaction")} · ${pct}% of all`);
    box.append(l, t);
  }
}

function renderMix() {
  const lg = $("legend");
  lg.innerHTML = GROUPS.map(g => {
    const names = g.types.map(t => byId[t]).filter(Boolean).map(r => r.label).join(", ");
    return `<span title="${esc(names)}"><i style="background:${g.color}"></i>${esc(g.label)}</span>`;
  }).join("");

  const box = $("mix");
  box.innerHTML = "";
  for (const v of videos) {
    const list = (rx[v.id] || []).filter(r => byId[r.type]);
    const gc = Object.fromEntries(GROUPS.map(g => [g.id, 0]));
    list.forEach(r => gc[groupOf[r.type]]++);

    const row = document.createElement("div");
    row.className = "mix-row";
    const title = document.createElement("div");
    title.className = "mix-title";
    const a = document.createElement("a");
    a.href = "./?v=" + encodeURIComponent(v.id);
    a.textContent = v.title;
    const n = document.createElement("span");
    n.className = "n";
    n.textContent = plural(list.length, "reaction");
    title.append(a, n);
    row.append(title);

    if (!list.length) {
      const e = document.createElement("div");
      e.className = "mix-empty";
      e.textContent = "No reactions yet";
      row.append(e);
    } else {
      const bar = document.createElement("div");
      bar.className = "mix-bar";
      for (const g of GROUPS) {
        if (!gc[g.id]) continue;
        const s = document.createElement("div");
        s.className = "mix-seg";
        s.style.flex = gc[g.id];
        s.style.background = g.color;
        const detail = g.types.filter(t => byId[t])
          .map(t => [t, list.filter(r => r.type === t).length])
          .filter(([, c]) => c)
          .map(([t, c]) => `${esc(rxText(byId[t]))}: ${c}`).join("<br>");
        hover(s, () => `<strong>${esc(g.label)} · ${gc[g.id]} of ${list.length} (${Math.round(gc[g.id] / list.length * 100)}%)</strong>${detail}`);
        bar.append(s);
      }
      row.append(bar);
    }
    const d = document.createElement("div");
    d.className = "hint";
    d.style.margin = "4px 0 0";
    d.textContent = "Posted " + niceDate(v.postedAt);
    row.append(d);
    box.append(row);
  }
}

function dayKey(d) { return d.toISOString().slice(0, 10); }

function renderDaily(all) {
  const box = $("daily");
  box.innerHTML = "";
  const days = 30;
  const end = new Date(); end.setHours(0, 0, 0, 0);
  const keys = [];
  for (let i = days - 1; i >= 0; i--) keys.push(new Date(end.getTime() - i * 86400000));
  const c = {};
  all.forEach(r => {
    const d = toDate(r.createdAt); d.setHours(0, 0, 0, 0);
    c[dayKey(d)] = (c[dayKey(d)] || 0) + 1;
  });
  const max = Math.max(1, ...keys.map(k => c[dayKey(k)] || 0));
  for (const k of keys) {
    const n = c[dayKey(k)] || 0;
    const col = document.createElement("div");
    col.className = "day";
    const b = document.createElement("b");
    b.style.height = n ? Math.max(4, (n / max) * 100) + "%" : "0";
    col.append(b);
    const label = k.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    hover(col, () => `<strong>${esc(label)}</strong>${plural(n, "reaction")}`);
    box.append(col);
  }
  const fmt = d => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  let axis = box.nextElementSibling;
  if (!axis || !axis.classList.contains("daily-axis")) {
    axis = document.createElement("div");
    axis.className = "daily-axis";
    box.after(axis);
  }
  axis.innerHTML = `<span>${fmt(keys[0])}</span><span>peak ${max} / day</span><span>Today</span>`;
}

function renderTable() {
  const t = $("table");
  const head = `<thead><tr><th>Documentary</th>${REACTIONS.map(r => `<th>${esc(r.label)}</th>`).join("")}<th>Total</th></tr></thead>`;
  const rows = videos.map(v => {
    const list = rx[v.id] || [];
    const cells = REACTIONS.map(r => `<td>${list.filter(x => x.type === r.id).length}</td>`).join("");
    return `<tr><td>${esc(v.title)}</td>${cells}<td><strong>${list.filter(x => byId[x.type]).length}</strong></td></tr>`;
  }).join("");
  t.innerHTML = head + `<tbody>${rows}</tbody>`;
}
