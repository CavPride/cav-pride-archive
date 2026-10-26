# Cav Pride 2030 Archive

PROTECT THE SHIELD. A free, static website that organizes football game film hosted on YouTube.

Start here:

1. `guides/PUBLISHING.md`: put the site online for $0.
2. `guides/ADMIN-GUIDE.md`: add games (YouTube upload, then one small edit).
3. `guides/PRIVACY.md`: read before you upload any video of minors.

## What is in this folder

| File or folder | What it does |
| --- | --- |
| `index.html` | The one page the whole site runs from |
| `css/styles.css` | All colors, type and layout |
| `js/app.js` | Pages, game library, player, favorites, admin helper |
| `data/games.json` | **Your game catalog.** Ships empty on purpose |
| `data/site.json` | Season names and years (edit the years here) |
| `assets/` | Shield logo, icons, fonts, field artwork |
| `manifest.webmanifest`, `sw.js` | Lets phones add the site to the home screen |
| `noindex` tag (and `robots.txt`) | Ask search engines not to list the site |

No build step, no installs, no paid services, no outside libraries.

## Previewing on your own computer (optional)

Do not double-click `index.html`. YouTube's player refuses to load from a file on disk. In this folder run:

    python3 -m http.server 8000

then open http://localhost:8000 in your browser.
