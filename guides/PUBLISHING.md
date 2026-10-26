# Publishing for $0

Nothing here has been done for you. No accounts, repositories or settings exist yet. These steps create them.

## What you need

- A free GitHub account (github.com).
- A free YouTube channel (a Google account).

## Publish on GitHub Pages

1. Sign in at github.com. Choose **New repository**.
2. Name it, for example `cav-pride-archive`.
3. Choose **Public**. This is required: on a free account GitHub Pages only publishes public repositories (private ones need a paid plan). Everything in the repository, including `data/games.json`, is therefore readable by anyone. Read `PRIVACY.md` for what that means.
4. Create the repository, then choose **uploading an existing file**.
5. Drag the **contents** of this folder (index.html, css, js, data, assets and the rest) into the page. Dragging whole folders works in current browsers. Commit.
6. Open **Settings, Pages**. Under Build and deployment choose **Deploy from a branch**, pick the `main` branch and the `/ (root)` folder, then Save.
7. Wait one to two minutes. The address appears at the top of that page, in the form:

       https://YOURNAME.github.io/cav-pride-archive/

8. Open it on a phone and a computer. It should show the homepage with an empty library.

If the page is blank, check that `index.html` sits at the top level of the repository, not inside an extra folder.

## Free alternatives

Cloudflare Pages and Netlify also offer free static hosting. The steps differ and their free limits may have changed, so check their current terms. You do not need them.

## Add it to phone home screens

- **iPhone or iPad (Safari):** Share button, then Add to Home Screen.
- **Android (Chrome):** menu, then Install app or Add to Home screen.

It then opens full screen with the shield icon, like an app.

## Smart TVs and casting

Support varies a lot by TV, browser version and age of the set. I could not test any TV from here.

- **TV browser:** open the published address. The site is built for remote control, with large cards, arrow-key movement and a visible focus outline. Typing a long address with a remote is painful, so bookmark it or use the options below.
- **Cast from a phone:** Chromecast and Google TV can cast from Chrome. On Apple devices, AirPlay can mirror the page to an Apple TV or compatible TV.
- **Most reliable fallback:** every game page has a **Watch on YouTube** button. The YouTube app on most smart TVs plays unlisted videos when you open the link from a phone via cast.
- Some TV browsers do not support full screen from inside an embedded player. If that happens, use the Watch on YouTube button.

## Updating later

Edit files on GitHub (open file, pencil icon, Commit). See `ADMIN-GUIDE.md`.

If you ever change the look or code and want phones to refetch everything, edit `CACHE = 'cav-pride-v1'` near the top of `sw.js` to `v2`.
