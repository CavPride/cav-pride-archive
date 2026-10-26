# Admin guide: adding games

You do five things per game. Nothing else.

1. **Extract** the game's ZIP file on your computer.
2. **Upload** the video in YouTube Studio.
3. **Copy** the YouTube link.
4. **Add** the game to `data/games.json`.
5. **Publish** (saving the file on GitHub does this).

## 1. Extract the ZIP

Right-click the ZIP, choose Extract All (Windows) or double-click it (Mac). Inside is the game video file.

## 2. Upload to YouTube Studio

Go to studio.youtube.com, choose Create, then Upload videos.

Settings that matter (details and reasons are in `PRIVACY.md`):

- **Visibility: Unlisted.** Not Private. Private videos cannot play on this website.
- **Allow embedding: on.** In the upload dialog choose Show more, then check "Allow embedding".
- **Comments: off** (Show more, Comments and ratings).
- **Audience:** YouTube asks whether the video is made for kids. Answer for your real audience. That choice is yours to make.
- **Long videos:** YouTube limits accounts that have not been verified to short uploads (15 minutes at the time of writing). Football games run longer, so verify the channel first: Studio, Settings, Channel, Feature eligibility, Intermediate features.
- Upload time for a game can be long. You can queue several at once and let them run.

## 3. Copy the link

When the upload finishes, open the video and copy its address. It looks like `https://youtu.be/abcDEF12345`. The 11 characters at the end are the video ID. You can paste the whole link into the helper below and it finds the ID for you.

## 4. Add the game to the catalog

### Easiest way: the Admin helper

Open your site with `#/admin` on the end, for example `https://YOURNAME.github.io/cav-pride-archive/#/admin`.

1. Paste the YouTube link.
2. Fill in title, season, opponent and date.
3. Press **Test the player** to confirm the video plays on the site. "Video unavailable" means it is Private or embedding is off.
4. Press **Copy entry**.

Then open `data/games.json` on GitHub (open the file, press the pencil icon) and paste the entry between the square brackets `[ ]`.

- The **first** game goes between the brackets with nothing else.
- Every later game needs a **comma** after the previous game's closing `}`.

Example with two games:

    [
      {
        "title": "Game 1 vs. Opponent",
        "season": "9th Grade",
        "year": 2026,
        "opponent": "Opponent Name",
        "date": "2026-08-21",
        "youtubeId": "REPLACE_WITH_VIDEO_ID",
        "thumbnail": "",
        "description": ""
      },
      {
        "title": "Game 2 vs. Another Team",
        "season": "9th Grade",
        "year": 2026,
        "opponent": "Another Team",
        "date": "2026-08-28",
        "youtubeId": "REPLACE_WITH_VIDEO_ID",
        "thumbnail": "",
        "description": ""
      }
    ]

(Those placeholder IDs never show on the site. An entry with a placeholder is skipped.)

### Check your work before saving

Paste the whole file into **Check games.json** on the Admin page. It points out missing commas, bad IDs and unknown seasons in plain language.

## 5. Publish

On GitHub, press **Commit changes**. The site updates in about a minute. If you do not see the change, refresh the page. On a phone's home-screen app, close and reopen it.

## Field reference

| Field | Required | Notes |
| --- | --- | --- |
| `title` | Recommended | Shown on cards. If blank, "vs. Opponent" is used |
| `season` | Yes | Exactly `7th Grade`, `8th Grade` or `9th Grade` |
| `year` | No | Number such as 2026. Falls back to the season year |
| `opponent` | Recommended | Shown under the title |
| `date` | Recommended | Written `YYYY-MM-DD`. Used for the order of games |
| `youtubeId` | Yes | 11 characters, or paste a full YouTube link |
| `thumbnail` | No | Leave `""` to use YouTube's picture automatically |
| `description` | No | Shown under the video |

How things are ordered:

- **Game lists** run oldest to newest by `date`. Games without a date come after dated ones, in file order.
- **Recently Added** shows the games lowest in the file first. Add new games at the **bottom**.

## Changing season years

Years live in `data/site.json`. They start as 2024, 2025 and 2026, assuming a Class of 2030 player in 9th grade this fall. Change them if that is wrong. The Admin page has a Season years box that writes the file text for you.

## Fixing problems

| What you see | Likely cause |
| --- | --- |
| Library says "No games here yet" or an error | `games.json` has a typo. Use **Check games.json** |
| A game is missing | It has a placeholder or bad ID, or a season that is not spelled as above. The checker names it |
| Gray striped thumbnail | Normal while a new video is still processing on YouTube, or if it is Private. Placeholder is intentional |
| Player says "Video unavailable" | Video is Private, or Allow embedding is off |
| Player says "Error 153" | The page was opened from a file on disk, or a browser extension blocks referrers. Use the published address |
| Change not showing | Wait a minute, then refresh. Phone app: close and reopen |

## About the Admin link

The Admin page only prepares text. **It cannot change the site**, and it cannot upload anything to YouTube. The only way to change the live site is to save files in your GitHub account, so your GitHub login is the real lock. The Admin link stays hidden in the menu until you visit `#/admin` once on a device.
