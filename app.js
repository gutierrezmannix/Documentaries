import { SITE_TITLE, SITE_SUBTITLE, REACTIONS, SITE_THEME } from "./firebase-config.js?v=3";
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
import { getStore, DEMO, thumb, niceDate, timeAgo } from "./data.js?v=3";

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

function renderList() {
  const ul = $("list");
  ul.innerHTML = "";
  videos.forEach(v => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = "item";
    a.href = "?v=" + encodeURIComponent(v.id);
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
    ul.appendChild(li);
  });
}

function render() {
  if (!videos.length) {
    $("layout").hidden = true;
    $("empty").hidden = false;
    return;
  }
  $("empty").hidden = true;
  $("layout").hidden = false;
  const v = videos.find(x => x.id === currentId) || videos[0];
  const isLatest = v.id === videos[0].id;

  if (v.id !== shownId) {
    shownId = v.id;
    renderPlayer(v);
    if (stopReactions) stopReactions();
    latestReactions = [];
    stopReactions = store.watchReactions(v.id, list => {
      latestReactions = list;
      renderButtons();
      renderFeed();
    }, err => console.error(err));
  }
  $("label").textContent = isLatest ? "Latest documentary" : "From the archive";
  $("title").textContent = v.title;
  $("date").textContent = "Posted " + niceDate(v.postedAt);
  $("note").textContent = v.note || "";
  renderButtons();
  renderFeed();
  renderList();
}

window.addEventListener("popstate", () => {
  currentId = new URLSearchParams(location.search).get("v");
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
