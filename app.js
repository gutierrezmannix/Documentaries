import { SITE_TITLE, SITE_SUBTITLE, REACTIONS, SITE_THEME, CATEGORIES } from "./firebase-config.js?v=7";
document.body.dataset.theme = new URLSearchParams(location.search).get("theme") || SITE_THEME || document.body.dataset.theme;

// Dark / light switch (remembered on each student's device)
const modeBtn = document.getElementById("modeToggle");
function paintMode() {
  const dark = document.body.dataset.mode !== "light";
  modeBtn.textContent = dark ? "\u2600 Light mode" : "\u263E Dark mode";
}
modeBtn.addEventListener("click", () => {
  document.body.dataset.mode = document.body.dataset.mode === "light" ? "dark" : "light";
  try { localStorage.setItem("mode", document.body.dataset.mode); } catch {}
  paintMode();
});
paintMode();
import { getStore, DEMO, thumb, niceDate, timeAgo } from "./data.js?v=7";

const $ = id => document.getElementById(id);
const byId = Object.fromEntries(REACTIONS.map(r => [r.id, r]));

$("siteTitle").textContent = SITE_TITLE;
$("siteSub").textContent = SITE_SUBTITLE;
document.title = SITE_TITLE;
if (DEMO) $("demo").hidden = false;

// Remember which reactions this device already gave (per video).
function given(videoId) {
  try { return JSON.parse(localStorage.getItem("rx:" + videoId) || "[]"); } catch { return []; }
}
function remember(videoId, type) {
  try { localStorage.setItem("rx:" + videoId, JSON.stringify([...given(videoId), type])); } catch {}
}

const store = await getStore();
let videos = [];
let currentId = new URLSearchParams(location.search).get("v");
let shownId = null;
let stopReactions = null;
let latestReactions = [];

function reactionText(r) {
  return (r.icon ? r.icon + " " : "") + r.label;
}

function renderPlayer(v) {
  const p = $("player");
  p.innerHTML = "";
  if (v.youtubeId) {
    const f = document.createElement("iframe");
    f.src = `https://www.youtube-nocookie.com/embed/${v.youtubeId}?rel=0`;
    f.title = v.title;
    f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    f.allowFullscreen = true;
    f.referrerPolicy = "strict-origin-when-cross-origin";
    p.appendChild(f);
  } else {
    const d = document.createElement("div");
    d.className = "placeholder";
    d.textContent = "The YouTube player will appear here.";
    p.appendChild(d);
  }
}

function renderButtons() {
  const mine = given(shownId);
  const counts = {};
  latestReactions.forEach(r => { counts[r.type] = (counts[r.type] || 0) + 1; });
  const box = $("buttons");
  box.innerHTML = "";
  for (const r of REACTIONS) {
    const b = document.createElement("button");
    b.type = "button";
    const done = mine.includes(r.id);
    b.disabled = done;
    b.setAttribute("aria-pressed", done ? "true" : "false");
    const t = document.createElement("span");
    t.textContent = reactionText(r);
    b.append(t);
    if (counts[r.id]) {
      const c = document.createElement("span");
      c.className = "count";
      c.textContent = counts[r.id];
      c.setAttribute("aria-label", counts[r.id] + " reactions");
      b.append(c);
    }
    b.addEventListener("click", async () => {
      b.disabled = true;
      try {
        await store.addReaction(shownId, r.id);
        remember(shownId, r.id);
      } catch (e) {
        console.error(e);
        b.disabled = false;
        alert("Sorry, that reaction did not go through. Please try again.");
      }
      renderButtons();
    });
    box.appendChild(b);
  }
}

function renderFeed() {
  const ul = $("feed");
  ul.innerHTML = "";
  const recent = latestReactions.filter(r => byId[r.type]).slice(0, 15);
  if (!recent.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No reactions yet. Be the first.";
    ul.appendChild(li);
    return;
  }
  for (const r of recent) {
    const li = document.createElement("li");
    const a = document.createElement("span");
    a.textContent = "A classmate said: " + reactionText(byId[r.type]);
    const w = document.createElement("span");
    w.className = "when";
    w.textContent = timeAgo(r.createdAt);
    li.append(a, w);
    ul.appendChild(li);
  }
}

const CAT_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]));
let currentCat = new URLSearchParams(location.search).get("cat") || "all";

function catOf(v) { return CAT_LABEL[v.category] ? v.category : "other"; }
function inCat(v) { return currentCat === "all" || catOf(v) === currentCat; }

function linkFor(id) {
  const q = new URLSearchParams();
  if (currentCat !== "all") q.set("cat", currentCat);
  if (id) q.set("v", id);
  const s = q.toString();
  return s ? "?" + s : "./";
}

function renderTabs() {
  const box = $("catTabs");
  box.innerHTML = "";
  const tabs = [{ id: "all", label: "All documentaries" }, ...CATEGORIES];
  for (const c of tabs) {
    const n = c.id === "all" ? videos.length : videos.filter(v => catOf(v) === c.id).length;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cat-tab";
    b.setAttribute("aria-pressed", c.id === currentCat ? "true" : "false");
    const t = document.createElement("span");
    t.textContent = c.label;
    const k = document.createElement("span");
    k.className = "cat-count";
    k.textContent = n;
    b.append(t, k);
    b.addEventListener("click", () => {
      currentCat = c.id;
      currentId = null;
      history.pushState(null, "", linkFor(null));
      render();
    });
    box.appendChild(b);
  }
}

function listItem(v) {
  const li = document.createElement("li");
  const a = document.createElement("a");
  a.className = "item";
  a.href = linkFor(v.id);
  if (v.id === shownId) a.setAttribute("aria-current", "true");
  const img = document.createElement("img");
  img.className = "thumb";
  img.alt = "";
  img.loading = "lazy";
  if (v.youtubeId) img.src = thumb(v.youtubeId);
  const txt = document.createElement("div");
  if (v.id === shownId) {
    const n = document.createElement("div");
    n.className = "now";
    n.textContent = "Now showing";
    txt.appendChild(n);
  }
  const t = document.createElement("div");
  t.className = "t";
  t.textContent = v.title;
  const d = document.createElement("div");
  d.className = "d";
  d.textContent = niceDate(v.postedAt);
  txt.append(t, d);
  a.append(img, txt);
  a.addEventListener("click", e => {
    e.preventDefault();
    currentId = v.id;
    history.pushState(null, "", a.href);
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  li.appendChild(a);
  return li;
}

function renderList(list) {
  const ul = $("list");
  ul.innerHTML = "";
  if (currentCat !== "all") {
    $("prevHead").textContent = CAT_LABEL[currentCat] || "Other documentaries";
    list.forEach(v => ul.appendChild(listItem(v)));
    return;
  }
  $("prevHead").textContent = "All documentaries";
  const groups = [...CATEGORIES, { id: "other", label: "Other" }];
  for (const g of groups) {
    const items = list.filter(v => catOf(v) === g.id);
    if (!items.length) continue;
    const h = document.createElement("li");
    h.className = "group-head";
    h.textContent = g.label;
    ul.appendChild(h);
    items.forEach(v => ul.appendChild(listItem(v)));
  }
}

function render() {
  renderTabs();
  if (!videos.length) {
    $("layout").hidden = true;
    $("empty").hidden = false;
    return;
  }
  const list = videos.filter(inCat);
  if (!list.length) {
    $("layout").hidden = true;
    $("empty").hidden = false;
    $("empty").textContent = "No documentaries in this list yet. Check back soon.";
    return;
  }
  $("empty").hidden = true;
  $("layout").hidden = false;
  const v = list.find(x => x.id === currentId) || list[0];
  const isLatest = v.id === list[0].id;

  if (v.id !== shownId) {
    shownId = v.id;
    renderPlayer(v);
    if (stopReactions) stopReactions();
    latestReactions = [];
    stopReactions = store.watchReactions(v.id, rx => {
      latestReactions = rx;
      renderButtons();
      renderFeed();
    }, err => console.error(err));
  }
  const where = currentCat === "all" ? "" : " in " + (CAT_LABEL[currentCat] || "this list");
  $("label").textContent = isLatest ? "Latest" + where : "From the archive";
  $("title").textContent = v.title;
  $("date").textContent = "Posted " + niceDate(v.postedAt) + (CAT_LABEL[v.category] ? "  \u00B7  " + CAT_LABEL[v.category] : "");
  $("note").textContent = v.note || "";
  renderButtons();
  renderFeed();
  renderList(list);
}

window.addEventListener("popstate", () => {
  const q = new URLSearchParams(location.search);
  currentId = q.get("v");
  currentCat = q.get("cat") || "all";
  render();
});

store.watchVideos(list => {
  videos = list.filter(v => v.visible !== false);
  render();
}, err => {
  console.error(err);
  $("empty").hidden = false;
  $("empty").textContent = "Could not load videos. Please refresh the page.";
});
