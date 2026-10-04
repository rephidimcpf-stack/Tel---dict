# Telugu Nighantuvu — తెలుగు–తెలుగు నిఘంటువు

An installable, offline-capable **Telugu → Telugu dictionary** web app (PWA) for mobile.

## What's inside
- **1,06,894 Telugu words** in the dictionary.
- **47,695 entries have a Telugu meaning (అర్థం)**; 42,703 also carry an optional English hint; 58,538 carry a part of speech.
- Content adapted from the open **Wiktionary Telugu (te–te)** dictionary (via the indic-dict StarDict set) merged with an open **54,197-word Telugu head-word list**.
- You can **add, edit and delete** any word — your changes are stored on the device.

## Features
| Feature | Where |
|---|---|
| Fast search over all words (Telugu / transliteration / English / meaning) | Search tab |
| Add / edit / delete words | ＋ button or *Edit* on any entry |
| Favourites | ☆ on an entry, Favourites tab |
| Theme: **Light / Dark / System** + 6 accent colours | Settings → Appearance |
| **Backup & Restore** to a file **whose location you choose** | Settings → Backup & Restore |
| Install to home screen (offline) | Install button / Settings → Install |

### Backup & restore
- **Export** writes a JSON file. On browsers that support the File System Access API (Chrome/Edge on Android & desktop) a **save-location picker** opens so you choose exactly where to save. On other browsers it falls back to a normal download.
- **Restore** opens a **file picker** (or a file dialog) to choose a backup, then lets you **Merge** (keep current + add backup) or **Replace** (use the backup as-is).

## Running the app
A PWA must be served over **http(s)**, not opened as a local `file://`. Any of these work:

**Quick local test**
```bash
cd <this folder>
python3 -m http.server 8080
# then open http://localhost:8080 in your browser
```

**Host it for your phone** — put this folder on any static host, e.g.
- GitHub Pages, Netlify, Vercel, Cloudflare Pages, or
- any web server you control.

It must be **https://** (or localhost) for install + offline to work.

## Installing on a phone
- **Android (Chrome/Edge):** open the site → tap **Install** in the app, or browser menu → *Install app / Add to Home screen*.
- **iPhone/iPad (Safari):** open the site → Share → **Add to Home Screen**.
- **Desktop (Chrome/Edge):** install icon in the address bar.

Once installed it opens full-screen and works **offline** (the dictionary data and fonts are cached by the service worker).

## Files
```
index.html            app shell
styles.css            styles + themes + bundled Telugu font
app.js                all app logic
manifest.webmanifest  PWA manifest (name, icons, colours)
service-worker.js     offline cache
logo.svg              vector logo (editable source)
data/words.json.gz    dictionary data (preferred, ~3.7 MB)
data/words.json       dictionary data (plain fallback, ~18 MB)
icons/                home-screen icons + logo.png
fonts/                Noto Sans Telugu (bundled so text renders everywhere)
```

## Notes
- Your words/edits/favourites/settings live in the browser's local storage for this site. **Back up regularly** — clearing site data removes them.
- The base dictionary itself is read-only and is not affected by "Delete my words & edits".
- To ship as a native **Android APK** later, point [PWABuilder](https://www.pwabuilder.com/) or Bubblewrap at the hosted URL.
- Telugu content is adapted from Wiktionary (CC BY-SA) and an open word list; verify important entries.
