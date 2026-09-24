// ------------------------------------------------------------
// SETTINGS FOR YOUR DOCUMENTARY FEED
// This is the only file you need to edit.
// ------------------------------------------------------------

// 1. Paste the config from Firebase:
//    Firebase console > Project settings > General > Your apps > Web app > Config
//    Until you do this, the site runs in DEMO MODE with sample data.
export const firebaseConfig = {
  apiKey: "AIzaSyADrPTzPq-Za-jko1ChP_2ppRlYB3sx108",
  authDomain: "documentaryfeed-c9b1b.firebaseapp.com",
  projectId: "documentaryfeed-c9b1b",
  storageBucket: "documentaryfeed-c9b1b.firebasestorage.app",
  messagingSenderId: "347097454536",
  appId: "1:347097454536:web:f9908639c0f409b58792fd"
};

// 2. The Google account allowed to post videos (must match firestore.rules).
export const ADMIN_EMAIL = "carlosgutierrezmannix@gmail.com";

// 3. Text shown at the top of the page.
export const SITE_TITLE = "Documentary Feed";
// Look of the site: "clean", "vaquero" (UTRGV orange and gray), or "cinema" (dark).
export const SITE_THEME = "cinema";

export const SITE_SUBTITLE = "Documentaries recommended by Dr. Gutierrez-Mannix";

// The lists students can browse. You pick one when you post a video.
export const CATEGORIES = [
  { id: "politics-culture", label: "Politics and Culture" },
  { id: "american-state",   label: "American and State Government" }
];

// 4. The preset reactions students can leave. The "id" values must match
//    the list in firestore.rules. You can change the labels anytime.
export const REACTIONS = [
  { id: "heart",      icon: "❤️", label: "Love it" },
  { id: "like",       icon: "👍", label: "Like" },
  { id: "great",      icon: "",   label: "Great" },
  { id: "amazing",    icon: "",   label: "Amazing" },
  { id: "supergood",  icon: "",   label: "Super good" },
  { id: "learned",    icon: "",   label: "Learned a lot" },
  { id: "discuss",    icon: "",   label: "Let's discuss in class" },
  { id: "boring",     icon: "",   label: "Boring" },
  { id: "moreaction", icon: "",   label: "More action needed" }
];
