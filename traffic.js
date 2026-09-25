// Site traffic: anonymous visits to each part of the site and plays of each video,
// shown on the admin page after sign-in. Records come from track.js.
import { hbars, drawDaily } from "./stats.js?v=4";
import { toDate } from "./data.js?v=8";

const $ = id => document.getElementById(id);

const SECTIONS = [
  { id: "home",            label: "Home page" },
  { id: "pubs",            label: "Publications" },
  { id: "teaching",        label: "Teaching" },
  { id: "data",            label: "Data" },
  { id: "recommendations", label: "Recommendations" }
];
const RANGES = [{ days: 7, label: "Last 7 days" }, { days: 30, label: "Last 30 days" }, { days: 90, label: "Last 90 days" }];

let visits = [];
let videos = [];
let range = 30;
let mounted = false;

export function mountTraffic(store) {
  if (mounted) return;
  mounted = true;
  renderRanges();
  store.watchVideos(list => { videos = list; render(); }, err => console.error(err));
  store.watchVisits(new Date(Date.now() - 90 * 86400000), list => {
    visits = list.map(v => ({ ...v, at: toDate(v.at) }));
    render();
  }, err => {
    console.error(err);
    $("trafficStatus").textContent = err && err.code === "permission-denied"
      ? "Traffic tracking is not turned on yet. Publish the updated firestore.rules in the Firebase console (see the README)."
      : "Could not load traffic. Please refresh the page.";
  });
}

function renderRanges() {
  const box = $("trafficRange");
  box.innerHTML = "";
  for (const r of RANGES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cat-tab";
    b.textContent = r.label;
    b.setAttribute("aria-pressed", r.days === range ? "true" : "false");
    b.addEventListener("click", () => { range = r.days; renderRanges(); render(); });
    box.append(b);
  }
}

function render() {
  $("trafficStatus").hidden = true;
  $("traffic").hidden = false;
  const since = Date.now() - range * 86400000;
  const inRange = visits.filter(v => v.at.getTime() >= since);
  const views = inRange.filter(v => v.kind === "view");
  const watches = inRange.filter(v => v.kind === "watch");
  const count = id => views.filter(v => v.page === id).length;

  $("tHome").textContent = count("home");
  $("tSections").textContent = count("pubs") + count("teaching") + count("data");
  $("tRecs").textContent = count("recommendations");
  $("tWatches").textContent = watches.length;

  const secRows = SECTIONS.map(s => ({ label: s.label, n: count(s.id) }));
  hbars($("bySection"), secRows, "visit", views.length);

  const titles = Object.fromEntries(videos.map(v => [v.id, v.title]));
  const byVideo = {};
  watches.forEach(w => { byVideo[w.video] = (byVideo[w.video] || 0) + 1; });
  const ids = [...new Set([...videos.map(v => v.id), ...Object.keys(byVideo)])];
  const vidRows = ids.map(id => ({ label: titles[id] || "Deleted video", n: byVideo[id] || 0 }))
    .sort((a, b) => b.n - a.n);
  if (vidRows.length) hbars($("byVideo"), vidRows, "play", watches.length);
  else $("byVideo").textContent = "No videos posted yet.";

  drawDaily($("trafficDaily"), views.filter(v => v.page === "home" || v.page === "recommendations").map(v => v.at), range, "visit");
}
