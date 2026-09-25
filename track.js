// Anonymous traffic counter shared by the home page and the Recommendations page.
// Each record is only { kind, page, video?, at }: no names, IP addresses or device details.
// Counted once per browser session, so refreshing a page does not inflate the numbers.
// Writes go straight to Firestore's REST API, so pages don't need the Firebase SDK.
import { firebaseConfig } from "./firebase-config.js?v=7";

const ENABLED = firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("PASTE");
const DOCS = `projects/${firebaseConfig.projectId}/databases/(default)/documents`;

function randomId() {
  const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(20)), b => abc[b % abc.length]).join("");
}

function once(key) {
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
  } catch { /* private mode: count anyway */ }
  return true;
}

function send(kind, page, video) {
  if (!ENABLED) return;
  if (!once(`t:${kind}:${page}:${video || ""}`)) return;
  const fields = { kind: { stringValue: kind }, page: { stringValue: page } };
  if (video) fields.video = { stringValue: video };
  fetch(`https://firestore.googleapis.com/v1/${DOCS}:commit?key=${firebaseConfig.apiKey}`, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      writes: [{
        update: { name: `${DOCS}/visits/${randomId()}`, fields },
        updateTransforms: [{ fieldPath: "at", setToServerValue: "REQUEST_TIME" }],
        currentDocument: { exists: false }
      }]
    })
  }).catch(() => { /* never break the page over a counter */ });
}

// A visit to a page or section, e.g. "home", "pubs", "recommendations".
export function trackView(page) { send("view", page); }

// A video that actually started playing on the Recommendations page.
export function trackWatch(videoId) { send("watch", "recommendations", videoId); }

// Home page: count each section (by element id) once it has stayed in the middle of the
// screen for a second (so scrolling past it doesn't count), or when its menu link is
// clicked. Works even if the page redraws itself.
export function trackSections(ids) {
  const seen = new WeakSet();
  const timers = new Map();
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      clearTimeout(timers.get(e.target.id));
      if (e.isIntersecting) timers.set(e.target.id, setTimeout(() => trackView(e.target.id), 1000));
    }
  }, { rootMargin: "-45% 0px -45% 0px" });
  const scan = () => {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && !seen.has(el)) { seen.add(el); io.observe(el); }
    }
  };
  new MutationObserver(scan).observe(document, { childList: true, subtree: true });
  scan();
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest("a[href^='#']");
    const id = a && a.getAttribute("href").slice(1);
    if (ids.includes(id)) trackView(id);
  }, true);
  const fromHash = () => { const id = location.hash.slice(1); if (ids.includes(id)) trackView(id); };
  window.addEventListener("hashchange", fromHash);
  fromHash();
}
