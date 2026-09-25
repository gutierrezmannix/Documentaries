# Documentary Feed

A simple page where students watch the documentaries I recommend and leave preset reactions.
Hosted free on GitHub Pages, with videos and reactions stored free in Firebase.

- `index.html` is the public page students see.
- `admin.html` is my private page to post videos (Google sign-in, only my account can post).

## One-time setup (about 20 minutes)

### 1. Firebase
You can reuse the Firebase project from the random selector or make a new one at https://console.firebase.google.com.

1. **Build > Firestore Database > Create database.** Pick production mode and a US location.
2. **Firestore > Rules.** Open `firestore.rules` from this folder, change the email to your Google account (all lowercase), paste the whole file in, and click **Publish**.
3. **Build > Authentication > Get started > Sign-in method > Google > Enable.** Save.
4. **Project settings (gear icon) > General > Your apps.** If there is no web app yet, click the `</>` icon and register one. Copy the `firebaseConfig` values.

### 2. The config file
Open `firebase-config.js` and:
- paste the `firebaseConfig` values,
- set `ADMIN_EMAIL` to the same Google account (lowercase),
- change the site title and subtitle if you like.

Until this is filled in, the site runs in demo mode with sample data, so you can preview it safely.

### 3. GitHub Pages
1. Create a new public repository (for example `documentaries`) and upload every file in this folder.
2. **Settings > Pages > Source: Deploy from a branch > main / (root) > Save.**
3. After a minute the site is live at `https://YOUR-USERNAME.github.io/documentaries/`.

### 4. Allow sign-in from GitHub
Firebase console > **Authentication > Settings > Authorized domains > Add domain** and enter `YOUR-USERNAME.github.io`.

## Posting a new documentary
1. Go to `https://gutierrezmannix.github.io/Documentaries/admin.html`.
2. Sign in with Google.
3. Paste the YouTube link, check the title, add a note, and click **Post to feed**.

The newest post becomes the featured video. Older ones move to the side list. You never need to touch GitHub again to post.

## Seeing how students reacted
Sign in to the admin page and scroll to **Class pulse**. It charts every reaction live: totals, the most common reactions, the reaction mix for each documentary, and reactions by day, with a table view.

## Site traffic
The admin page also shows **Site traffic**: anonymous visits to the home page, its Publications, Teaching and Data sections, and the Recommendations page, plus how many times each video started playing. Each person counts once per section per browser session, and nothing identifies who they are. The counter is `track.js`; the home page loads it from `/Documentaries/track.js`.

To turn it on (one time): Firebase console > **Firestore Database > Rules**, paste the whole updated `firestore.rules` file, and click **Publish**. Until then the traffic section says tracking is not on yet, and the site works as usual.

## Notes
- Reactions only accept the preset list. The database rules reject any other text, so nobody can type anything mean.
- Each device can give each reaction once per video. This stops casual spamming but is not a hard limit.
- Some YouTube videos have embedding turned off by the owner. If the player says it cannot play, choose a different upload (PBS usually allows embedding).
- Costs: GitHub Pages and the Firebase free (Spark) plan cover a class easily.
- To change the reaction options, edit `REACTIONS` in `firebase-config.js` and the matching list in `firestore.rules`, then republish the rules.
