import { ADMIN_EMAIL, SITE_THEME, CATEGORIES } from "./firebase-config.js?v=6";
document.body.dataset.theme = SITE_THEME || document.body.dataset.theme;
import { getStore, DEMO, youtubeId, thumb, niceDate } from "./data.js?v=6";
import { mountStats } from "./stats.js?v=2";

const $ = id => document.getElementById(id);
if (DEMO) $("demo").hidden = false;

for (const c of CATEGORIES) {
  const o = document.createElement("option");
  o.value = c.id;
  o.textContent = c.label;
  $("vcat").appendChild(o);
}

const store = await getStore();
let stopVideos = null;

function msg(el, text, kind) {
  el.textContent = text;
  el.className = "msg" + (kind ? " " + kind : "");
}

$("signIn").addEventListener("click", async () => {
  msg($("authMsg"), "");
  try { await store.signIn(); }
  catch (e) { msg($("authMsg"), "Sign in did not work: " + (e.code || e.message), "err"); }
});
$("signOut").addEventListener("click", () => store.signOut());

store.onAuth(user => {
  const ok = user && (DEMO || (user.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase());
  $("signedOut").hidden = !!ok;
  $("signedIn").hidden = !ok;
  if (user && !ok) {
    msg($("authMsg"), `${user.email} is not the instructor account. Sign out and try another account.`, "err");
    store.signOut();
  }
  if (ok) {
    $("who").textContent = user.email;
    if (!stopVideos) stopVideos = store.watchVideos(renderList, e => console.error(e));
    mountStats(store);
  }
});

// Live preview + auto title when a link is pasted.
$("url").addEventListener("input", async () => {
  const id = youtubeId($("url").value);
  const img = $("prev");
  if (!id) { img.style.display = "none"; return; }
  img.src = thumb(id);
  img.style.display = "block";
  if (!$("vtitle").value) {
    try {
      const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent("https://www.youtube.com/watch?v=" + id)}`);
      if (r.ok) {
        const j = await r.json();
        if (!$("vtitle").value && j.title && youtubeId($("url").value) === id) $("vtitle").value = j.title;
      }
    } catch { /* title can be typed by hand */ }
  }
});

$("form").addEventListener("submit", async e => {
  e.preventDefault();
  const id = youtubeId($("url").value);
  if (!id) { msg($("formMsg"), "That does not look like a YouTube link.", "err"); return; }
  const title = $("vtitle").value.trim();
  if (!title) { msg($("formMsg"), "Please add a title.", "err"); return; }
  const category = $("vcat").value;
  if (!category) { msg($("formMsg"), "Please choose a list.", "err"); return; }
  $("post").disabled = true;
  msg($("formMsg"), "Posting...");
  try {
    await store.addVideo({ youtubeId: id, title, category, note: $("vnote").value.trim(), visible: true });
    $("form").reset();
    $("prev").style.display = "none";
    msg($("formMsg"), "Posted. It is now featured on the main page.", "ok");
  } catch (err) {
    console.error(err);
    msg($("formMsg"), "Could not post: " + (err.code || err.message), "err");
  }
  $("post").disabled = false;
});

function renderList(videos) {
  const ul = $("adminList");
  ul.innerHTML = "";
  if (!videos.length) {
    const li = document.createElement("li");
    li.textContent = "Nothing posted yet.";
    ul.appendChild(li);
    return;
  }
  for (const v of videos) {
    const li = document.createElement("li");
    const img = document.createElement("img");
    img.alt = "";
    if (v.youtubeId) img.src = thumb(v.youtubeId);
    const info = document.createElement("div");
    const t = document.createElement("strong");
    t.textContent = v.title;
    const d = document.createElement("div");
    d.className = "hint";
    d.style.margin = "0";
    d.textContent = niceDate(v.postedAt) + (v.visible === false ? " · Hidden" : "");
    info.append(t, d);
    const actions = document.createElement("div");
    actions.className = "row";
    actions.style.marginTop = "0";
    const hide = document.createElement("button");
    hide.type = "button";
    hide.className = "btn secondary small";
    hide.textContent = v.visible === false ? "Show" : "Hide";
    hide.addEventListener("click", () => store.updateVideo(v.id, { visible: v.visible === false }));
    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn secondary small";
    del.textContent = "Delete";
    del.addEventListener("click", () => {
      if (confirm(`Delete "${v.title}"? This cannot be undone.`)) store.deleteVideo(v.id);
    });
    const sel = document.createElement("select");
    sel.className = "cat-select";
    sel.setAttribute("aria-label", "List for " + v.title);
    const none = document.createElement("option");
    none.value = "";
    none.textContent = "No list yet";
    sel.appendChild(none);
    for (const c of CATEGORIES) {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.label;
      sel.appendChild(o);
    }
    sel.value = v.category || "";
    sel.addEventListener("change", () => store.updateVideo(v.id, { category: sel.value }));
    actions.append(sel, hide, del);
    li.append(img, info, actions);
    ul.appendChild(li);
  }
}
