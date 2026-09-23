// Data layer: talks to Firebase, or to a small in-memory sample set in demo mode.
import { firebaseConfig } from "./firebase-config.js";

const FB = "https://www.gstatic.com/firebasejs/10.12.2";

export const DEMO = !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("PASTE");

// ---------- helpers ----------
export function youtubeId(url) {
  if (!url) return null;
  url = url.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtube(?:-nocookie)?\.com\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function thumb(id) {
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}

export function toDate(ts) {
  if (!ts) return new Date();
  if (ts instanceof Date) return ts;
  if (typeof ts.toDate === "function") return ts.toDate();
  return new Date(ts);
}

export function niceDate(ts) {
  return toDate(ts).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function timeAgo(ts) {
  const s = Math.max(1, Math.round((Date.now() - toDate(ts).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

// ---------- demo store ----------
function demoStore() {
  const day = 86400000;
  const now = Date.now();
  const videos = [
    { id: "d3", youtubeId: "", title: "Sample: Border Towns and the Water Question",
      note: "This is sample data. Once Firebase is connected, your real posts appear here. Watch the first 30 minutes before Thursday.",
      postedAt: new Date(now - 1 * day) },
    { id: "d2", youtubeId: "", title: "Sample: How a Bill Moves Through the Texas Legislature",
      note: "Good background for our unit on state legislatures.", postedAt: new Date(now - 8 * day) },
    { id: "d1", youtubeId: "", title: "Sample: Elections in Mexico, 2000 to Today",
      note: "Pay attention to the role of the INE.", postedAt: new Date(now - 15 * day) }
  ];
  const reactions = {
    d3: ["heart", "amazing", "learned", "like", "heart", "discuss", "moreaction", "great"]
      .map((t, i) => ({ type: t, createdAt: new Date(now - (i + 1) * 3600000) })),
    d2: ["boring", "like", "learned"].map((t, i) => ({ type: t, createdAt: new Date(now - (i + 2) * day) })),
    d1: []
  };
  const vListeners = new Set();
  const rListeners = {};
  let user = null;
  const aListeners = new Set();
  const emitV = () => vListeners.forEach(cb => cb([...videos].sort((a, b) => b.postedAt - a.postedAt)));
  const emitR = id => (rListeners[id] || new Set()).forEach(cb => cb([...(reactions[id] || [])]));
  return {
    watchVideos(cb) { vListeners.add(cb); emitV(); return () => vListeners.delete(cb); },
    watchReactions(id, cb) {
      (rListeners[id] ||= new Set()).add(cb); emitR(id);
      return () => rListeners[id].delete(cb);
    },
    async addReaction(id, type) { (reactions[id] ||= []).unshift({ type, createdAt: new Date() }); emitR(id); },
    onAuth(cb) { aListeners.add(cb); cb(user); },
    async signIn() { user = { email: "demo@example.com", displayName: "Demo admin" }; aListeners.forEach(cb => cb(user)); },
    async signOut() { user = null; aListeners.forEach(cb => cb(user)); },
    async addVideo(v) { videos.push({ ...v, id: "d" + Math.random().toString(36).slice(2), postedAt: new Date() }); emitV(); },
    async updateVideo(id, patch) { Object.assign(videos.find(v => v.id === id), patch); emitV(); },
    async deleteVideo(id) { const i = videos.findIndex(v => v.id === id); if (i > -1) videos.splice(i, 1); emitV(); }
  };
}

// ---------- firebase store ----------
async function firebaseStore() {
  const { initializeApp } = await import(`${FB}/firebase-app.js`);
  const fs = await import(`${FB}/firebase-firestore.js`);
  const au = await import(`${FB}/firebase-auth.js`);
  const app = initializeApp(firebaseConfig);
  const db = fs.getFirestore(app);
  const auth = au.getAuth(app);
  const videosCol = fs.collection(db, "videos");
  return {
    watchVideos(cb, onErr) {
      return fs.onSnapshot(fs.query(videosCol, fs.orderBy("postedAt", "desc")),
        snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onErr);
    },
    watchReactions(id, cb, onErr) {
      const q = fs.query(fs.collection(db, "videos", id, "reactions"), fs.orderBy("createdAt", "desc"), fs.limit(500));
      return fs.onSnapshot(q, snap => cb(snap.docs.map(d => d.data())), onErr);
    },
    addReaction(id, type) {
      return fs.addDoc(fs.collection(db, "videos", id, "reactions"), { type, createdAt: fs.serverTimestamp() });
    },
    onAuth(cb) { au.onAuthStateChanged(auth, cb); },
    signIn() { return au.signInWithPopup(auth, new au.GoogleAuthProvider()); },
    signOut() { return au.signOut(auth); },
    addVideo(v) { return fs.addDoc(videosCol, { ...v, postedAt: fs.serverTimestamp() }); },
    updateVideo(id, patch) { return fs.updateDoc(fs.doc(db, "videos", id), patch); },
    deleteVideo(id) { return fs.deleteDoc(fs.doc(db, "videos", id)); }
  };
}

export async function getStore() {
  return DEMO ? demoStore() : firebaseStore();
}
