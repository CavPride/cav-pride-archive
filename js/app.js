/* Cav Pride 2030 Archive
   One small script, no libraries. Sections:
   1. Helpers   2. Data loading and checking   3. Components   4. Views   5. Router   6. TV remote and startup */
(function () {
  'use strict';

  /* ============================== 1. Helpers ============================== */

  var SEASON_KEYS = ['7th', '8th', '9th'];
  var DEFAULT_SITE = {
    seasons: [
      { key: '7th', grade: '7th Grade', label: '7TH GRADE FOOTBALL', year: '' },
      { key: '8th', grade: '8th Grade', label: '8TH GRADE FOOTBALL', year: '' },
      { key: '9th', grade: '9th Grade', label: '9TH GRADE FOOTBALL', year: '' }
    ]
  };

  var $app = document.getElementById('app');
  var state = { seasons: DEFAULT_SITE.seasons, games: [], loadError: '', skipped: [] };

  // Safe HTML: anything interpolated is escaped unless wrapped with raw() or built by html``.
  function Safe(s) { this.s = s; }
  function raw(s) { return new Safe(s); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function part(v) {
    if (v instanceof Safe) return v.s;
    if (Array.isArray(v)) return v.map(part).join('');
    return esc(v);
  }
  function html(strings) {
    var out = strings[0];
    for (var i = 1; i < arguments.length; i++) out += part(arguments[i]) + strings[i];
    return new Safe(out);
  }

  var ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.8-7.5-10.7A4.3 4.3 0 0 1 8.7 5.5c1.3 0 2.5.7 3.3 1.7a4.3 4.3 0 0 1 3.3-1.7 4.3 4.3 0 0 1 4.2 4.3c0 5.9-7.5 10.7-7.5 10.7z"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3h4v4l-1.6-1.6L4.4 20.4 3 19 18 4zM3 5l5.6 5.6-1.4 1.4L3 7.8zm13.4 9.6L21 19.2V21h-4l1.6-1.6-2.6-2.6z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm1 4v5.2l3.6 2.1-1 1.7L11 13V7z"/></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 4 7.5 12l8 8 1.5-1.5L10.5 12 17 5.5z"/></svg>'
  };

  function store(key, fallback) {
    try { var v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private browsing: ignore */ }
  }

  function getFavs() { return store('cavpride.favs', []); }
  function isFav(id) { return getFavs().indexOf(id) !== -1; }
  function toggleFav(id) {
    var f = getFavs(), i = f.indexOf(id);
    if (i === -1) f.push(id); else f.splice(i, 1);
    save('cavpride.favs', f);
    return i === -1;
  }
  function isAdminMode() { return store('cavpride.admin', false) === true; }

  // Accepts a bare 11-character ID or any common YouTube link. Returns the ID or ''.
  function parseYouTubeId(input) {
    var s = String(input || '').trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    var m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/);
    return m ? m[1] : '';
  }

  function seasonKeyFrom(v) {
    var m = String(v == null ? '' : v).match(/\d+/);
    var key = m ? m[0] + 'th' : '';
    return SEASON_KEYS.indexOf(key) === -1 ? '' : key;
  }
  function seasonByKey(key) {
    for (var i = 0; i < state.seasons.length; i++) if (state.seasons[i].key === key) return state.seasons[i];
    return null;
  }

  function realDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null;
  }
  function fmtDate(s) {
    var d = realDate(s);
    return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  }

  /* ===================== 2. Data loading and checking ===================== */

  // Checks a list of catalog entries. Returns one row per entry with any problems found.
  function checkEntries(list) {
    var seen = {};
    return list.map(function (e, i) {
      var issues = [], fatal = false;
      if (!e || typeof e !== 'object' || Array.isArray(e)) {
        return { index: i, entry: {}, issues: ['This entry is not a { ... } block.'], fatal: true, id: '' };
      }
      var id = parseYouTubeId(e.youtubeId);
      if (!String(e.youtubeId || '').trim()) { issues.push('No YouTube video ID yet.'); fatal = true; }
      else if (/REPLACE/i.test(e.youtubeId)) { issues.push('Still has the placeholder video ID.'); fatal = true; }
      else if (!id) { issues.push('"' + e.youtubeId + '" is not a valid 11-character YouTube ID.'); fatal = true; }
      if (id) { if (seen[id] != null) issues.push('Same video ID as entry ' + (seen[id] + 1) + '.'); else seen[id] = i; }
      if (!seasonKeyFrom(e.season)) { issues.push('Season must be "7th Grade", "8th Grade" or "9th Grade".'); fatal = true; }
      if (!String(e.title || '').trim() && !String(e.opponent || '').trim()) issues.push('Add a title or an opponent.');
      if (e.date && !realDate(e.date)) issues.push('Date should look like 2026-08-21.');
      return { index: i, entry: e, issues: issues, fatal: fatal, id: id };
    });
  }

  function normalize(row) {
    var e = row.entry, key = seasonKeyFrom(e.season), s = seasonByKey(key);
    var opp = String(e.opponent || '').trim();
    return {
      id: row.id,
      index: row.index,
      seasonKey: key,
      grade: s ? s.grade : key,
      year: e.year || (s && s.year) || '',
      title: String(e.title || '').trim() || (opp ? 'vs. ' + opp : 'Game'),
      opponent: opp,
      date: realDate(e.date) ? e.date : '',
      thumbnail: String(e.thumbnail || '').trim(),
      description: String(e.description || '').trim()
    };
  }

  function fetchJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' returned ' + r.status);
      return r.text();
    }).then(function (t) { return JSON.parse(t); });
  }

  function loadData() {
    var siteP = fetchJson('data/site.json').then(function (s) {
      if (s && Array.isArray(s.seasons) && s.seasons.length) {
        state.seasons = s.seasons.map(function (x) {
          var key = seasonKeyFrom(x.key || x.grade);
          return { key: key, grade: x.grade || key + ' Grade', label: x.label || (key.toUpperCase() + ' GRADE FOOTBALL'), year: x.year == null ? '' : String(x.year) };
        }).filter(function (x) { return x.key; });
      }
    }).catch(function () { /* keep defaults */ });

    var gamesP = fetchJson('data/games.json').then(function (list) {
      if (!Array.isArray(list)) throw new Error('games.json must start with [ and end with ].');
      state.rawCatalog = list;
      var rows = checkEntries(list);
      state.games = rows.filter(function (r) { return !r.fatal; }).map(normalize);
      state.skipped = rows.filter(function (r) { return r.fatal; });
    }).catch(function (err) {
      state.loadError = err && err.message ? err.message : String(err);
    });

    return Promise.all([siteP, gamesP]);
  }

  /* Oldest first: by season, then date, then the order games appear in the file. */
  function chronological(list) {
    return list.slice().sort(function (a, b) {
      var sa = SEASON_KEYS.indexOf(a.seasonKey), sb = SEASON_KEYS.indexOf(b.seasonKey);
      if (sa !== sb) return sa - sb;
      if (a.date && b.date && a.date !== b.date) return a.date < b.date ? -1 : 1;
      if (a.date && !b.date) return -1;
      if (!a.date && b.date) return 1;
      return a.index - b.index;
    });
  }
  function gameById(id) { for (var i = 0; i < state.games.length; i++) if (state.games[i].id === id) return state.games[i]; return null; }
  function gamesIn(key) { return chronological(state.games.filter(function (g) { return g.seasonKey === key; })); }

  /* =========================== 3. Components ============================== */

  function thumbUrls(g) {
    var list = [];
    if (g.thumbnail) list.push(encodeURI(g.thumbnail));
    list.push('https://i.ytimg.com/vi/' + g.id + '/hqdefault.jpg');
    return list;
  }

  function thumbImg(g, cls) {
    var urls = thumbUrls(g);
    return html`<img class="${cls || ''}" src="${urls[0]}" data-next="${urls.slice(1).join(' ')}" alt="" loading="lazy" decoding="async">`;
  }

  function gameCard(g) {
    var fav = isFav(g.id);
    return html`<article class="game-card">
      <a class="game-link" href="#/watch/${g.id}">
        <div class="thumb">${thumbImg(g)}<span class="grade-tag">${g.grade}</span><span class="play-badge">${raw(ICON.play)}</span></div>
        <div class="game-info">
          <h3 class="game-title">${g.title}</h3>
          ${g.opponent ? html`<p class="game-opp">vs. ${g.opponent}</p>` : ''}
          ${g.date ? html`<p class="game-date">${fmtDate(g.date)}</p>` : ''}
        </div>
      </a>
      <button class="fav-btn" type="button" tabindex="-1" data-fav="${g.id}" aria-pressed="${fav}" aria-label="${(fav ? 'Remove from favorites: ' : 'Add to favorites: ') + g.title}">${raw(ICON.heart)}</button>
    </article>`;
  }

  function seasonCard(s) {
    var n = gamesIn(s.key).length;
    return html`<a class="season-card" href="#/season/${s.key}">
      <div class="season-num" aria-hidden="true">${s.key.toUpperCase()}</div>
      <div>
        <div class="season-label">${s.label}</div>
        ${s.year ? html`<div class="season-year">${s.year}</div>` : ''}
        <div class="season-count">${n ? n + (n === 1 ? ' game' : ' games') : 'No games yet'}</div>
      </div>
    </a>`;
  }

  function emptyState(title, text, action) {
    return html`<div class="empty">
      <img src="assets/shield.png" alt="" width="80" height="83">
      <h3>${title}</h3><p>${text}</p>${action || ''}
    </div>`;
  }
  function noGamesAtAll() {
    return emptyState('No games here yet', 'New game film is added as it gets uploaded. Check back soon.',
      isAdminMode() ? html`<a class="btn btn-small" href="#/admin">Add a game</a>` : '');
  }

  function sectionHead(title, linkText, href) {
    return html`<div class="section-head"><h2 class="section-title">${title}</h2>${linkText ? html`<a class="section-link" href="${href}">${linkText}</a>` : ''}</div>`;
  }

  function gameGrid(list) { return html`<div class="game-grid">${list.map(gameCard)}</div>`; }

  /* ============================== 4. Views ================================ */

  function viewHome() {
    var recent = state.games.slice().sort(function (a, b) { return b.index - a.index; }).slice(0, 10);
    var last = store('cavpride.last', '');
    var lastGame = last ? gameById(last) : null;
    var latest = state.games.length ? chronological(state.games).slice(-1)[0] : null;
    var favCount = getFavs().filter(gameById).length;

    var quick = [];
    if (lastGame) quick.push(html`<a class="quick" href="#/watch/${lastGame.id}">${raw(ICON.clock)}<span><strong>Continue watching</strong><small>${lastGame.title}</small></span></a>`);
    if (latest) quick.push(html`<a class="quick" href="#/watch/${latest.id}">${raw(ICON.play)}<span><strong>Latest game</strong><small>${latest.title}</small></span></a>`);
    quick.push(html`<a class="quick" href="#/favorites">${raw(ICON.heart)}<span><strong>My favorites</strong><small>${favCount ? favCount + ' saved on this device' : 'Tap the heart on any game'}</small></span></a>`);
    if (state.games.length > 1) quick.push(html`<a class="quick" href="#/random">${raw(ICON.shuffle)}<span><strong>Surprise me</strong><small>Play a random game</small></span></a>`);
    quick.push(html`<a class="quick" href="#/games">${raw(ICON.grid)}<span><strong>All games</strong><small>Browse the full library</small></span></a>`);

    return {
      title: 'Cav Pride 2030 Archive',
      nav: 'home',
      body: html`
      <section class="hero" aria-label="Welcome">
        <div class="hero-inner">
          <div class="hero-copy">
            <h1 class="hero-kicker">CAV PRIDE 2030 ARCHIVE</h1>
            <p class="hero-title"><span>PROTECT</span><span>THE</span><span>SHIELD</span></p>
            <p class="hero-lede">Game film from 7th, 8th and 9th grade football, in one place.</p>
            <a class="btn" href="#/games">${raw(ICON.play)} WATCH GAMES</a>
          </div>
          <div class="hero-shield"><img src="assets/shield.png" alt="Coldwater Cavaliers shield" width="624" height="647" fetchpriority="high"></div>
        </div>
      </section>

      <div class="wrap">
        <section class="section" aria-labelledby="h-seasons">
          <div class="section-head"><h2 class="section-title" id="h-seasons">Seasons</h2></div>
          <div class="season-grid">${state.seasons.map(seasonCard)}</div>
        </section>

        <section class="section" aria-labelledby="h-recent">
          ${sectionHead('Recently Added', state.games.length ? 'See all' : '', '#/games')}
          ${recent.length ? html`<div class="game-row" id="h-recent">${recent.map(gameCard)}</div>` : noGamesAtAll()}
        </section>

        <section class="section" aria-labelledby="h-library">
          ${sectionHead('The Game Library', state.games.length ? 'Open the library' : '', '#/games')}
          <div class="toolbar chips" role="group" aria-label="Show games from">
            ${[html`<button class="chip" type="button" data-tab="" aria-pressed="true">All</button>`].concat(
              state.seasons.map(function (s) { return html`<button class="chip" type="button" data-tab="${s.key}" aria-pressed="false">${s.grade}</button>`; }))}
          </div>
          <div id="libraryGrid">${libraryPreview('')}</div>
        </section>

        <section class="section" aria-labelledby="h-quick">
          ${sectionHead('Quick Access')}
          <div class="quick-grid">${quick}</div>
        </section>
      </div>`
    };
  }

  function libraryPreview(tab) {
    var list = tab ? gamesIn(tab) : chronological(state.games);
    if (!list.length) return state.games.length ? emptyState('No games in this season yet', 'Pick another season or browse all games.') : noGamesAtAll();
    return gameGrid(list.slice(0, 6));
  }

  function viewSeasons() {
    return {
      title: 'Seasons', nav: 'seasons',
      body: html`<div class="wrap">
        <div class="page-head"><h1 class="page-title">Seasons</h1><p class="page-sub">Pick a year to see its games in order.</p></div>
        <div class="season-grid">${state.seasons.map(seasonCard)}</div>
      </div>`
    };
  }

  function viewSeason(key) {
    var s = seasonByKey(key);
    if (!s) return viewNotFound('That season is not in the archive.');
    var list = gamesIn(key);
    var idx = state.seasons.indexOf(s);
    var prev = state.seasons[idx - 1], next = state.seasons[idx + 1];
    return {
      title: s.label, nav: 'seasons',
      body: html`
      <section class="season-head"><div class="wrap">
        <div class="season-num" aria-hidden="true">${s.key.toUpperCase()}</div>
        <div><h1 class="page-title">${s.label}</h1>${s.year ? html`<p class="season-year">${s.year}</p>` : ''}
          <p class="page-sub">${list.length ? list.length + (list.length === 1 ? ' game' : ' games') + ', oldest first' : 'No games yet'}</p></div>
      </div></section>
      <div class="wrap section">
        ${list.length ? gameGrid(list) : emptyState('No ' + s.grade.toLowerCase() + ' games yet', 'Games from this season will show up here as they are added.',
          isAdminMode() ? html`<a class="btn btn-small" href="#/admin">Add a game</a>` : '')}
        <div class="season-nav">
          ${prev ? html`<a class="btn btn-ghost btn-small" href="#/season/${prev.key}">${raw(ICON.back)} ${prev.label}</a>` : html`<span></span>`}
          ${next ? html`<a class="btn btn-ghost btn-small" href="#/season/${next.key}">${next.label}</a>` : ''}
        </div>
      </div>`
    };
  }

  function filterGames(q) {
    var list = chronological(state.games);
    if (q.season) list = list.filter(function (g) { return g.seasonKey === q.season; });
    if (q.q) {
      var needle = q.q.toLowerCase();
      list = list.filter(function (g) { return (g.title + ' ' + g.opponent).toLowerCase().indexOf(needle) !== -1; });
    }
    if (q.sort === 'new') list.reverse();
    return list;
  }

  function gamesGridHtml(q) {
    var list = filterGames(q);
    if (!state.games.length) return noGamesAtAll();
    if (!list.length) return emptyState('No games match', 'Try a different season or clear the search.');
    return gameGrid(list);
  }

  function viewGames(q) {
    q = { season: seasonKeyFrom(q.season), sort: q.sort === 'new' ? 'new' : 'old', q: q.q || '' };
    function href(season) { return '#/games' + (season || q.sort === 'new' ? '?' : '') + [season ? 'season=' + season : '', q.sort === 'new' ? 'sort=new' : ''].filter(Boolean).join('&'); }
    return {
      title: 'All Games', nav: 'games', after: bindGamesToolbar,
      body: html`<div class="wrap">
        <div class="page-head"><h1 class="page-title">All Games</h1><p class="page-sub">Every game in the archive.</p></div>
        <div class="toolbar">
          <div class="chips" role="group" aria-label="Filter by season">
            <a class="chip" href="${href('')}" aria-current="${!q.season}">All</a>
            ${state.seasons.map(function (s) { return html`<a class="chip" href="${href(s.key)}" aria-current="${q.season === s.key}">${s.grade}</a>`; })}
          </div>
          <select class="field" id="sortSel" aria-label="Sort order">
            <option value="old"${raw(q.sort === 'old' ? ' selected' : '')}>Oldest first</option>
            <option value="new"${raw(q.sort === 'new' ? ' selected' : '')}>Newest first</option>
          </select>
          <input class="field field-search" id="searchBox" type="search" placeholder="Search opponent or title" aria-label="Search games" value="${q.q}">
        </div>
        <div id="gamesGrid">${gamesGridHtml(q)}</div>
      </div>`,
      query: q
    };
  }

  function bindGamesToolbar(view) {
    var q = view.query, sel = document.getElementById('sortSel'), box = document.getElementById('searchBox'), grid = document.getElementById('gamesGrid');
    function update() {
      q.sort = sel.value; q.q = box.value.trim();
      grid.innerHTML = gamesGridHtml(q).s;
      var parts = [];
      if (q.season) parts.push('season=' + q.season);
      if (q.sort === 'new') parts.push('sort=new');
      history.replaceState(null, '', '#/games' + (parts.length ? '?' + parts.join('&') : ''));
    }
    sel.addEventListener('change', update);
    box.addEventListener('input', update);
  }

  function viewFavorites() {
    var list = chronological(getFavs().map(gameById).filter(Boolean));
    return {
      title: 'Favorites', nav: 'favorites',
      body: html`<div class="wrap">
        <div class="page-head"><h1 class="page-title">Favorites</h1><p class="page-sub">Saved on this device only.</p></div>
        ${list.length ? gameGrid(list) : emptyState('No favorites yet', 'Tap the heart on any game to keep it here.', html`<a class="btn btn-small" href="#/games">Browse games</a>`)}
      </div>`
    };
  }

  function viewWatch(id) {
    var g = gameById(id);
    if (!g) return viewNotFound('That game is not in the archive.');
    save('cavpride.last', g.id);
    var list = gamesIn(g.seasonKey), i = list.indexOf(g);
    var prev = list[i - 1], next = list[i + 1];
    var embed = 'https://www.youtube-nocookie.com/embed/' + g.id + '?rel=0&playsinline=1';
    var fav = isFav(g.id);
    return {
      title: g.title, nav: 'games',
      body: html`<div class="wrap watch">
        <div class="watch-top">
          <a class="btn btn-ghost btn-small" href="#/games${g.seasonKey ? '?season=' + g.seasonKey : ''}" id="backBtn">${raw(ICON.back)} Back to Games</a>
        </div>
        <div class="player">
          <iframe src="${embed}" title="${g.title}" loading="eager" referrerpolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>
        </div>
        <div class="watch-meta">
          <div>
            <h1 class="watch-title">${g.title}</h1>
            <div class="watch-facts">
              ${g.opponent ? html`<span><b>Opponent</b>${g.opponent}</span>` : ''}
              <span><b>Season</b>${g.grade}${g.year ? ' (' + g.year + ')' : ''}</span>
              ${g.date ? html`<span><b>Date</b>${fmtDate(g.date)}</span>` : ''}
            </div>
            ${g.description ? html`<p class="watch-desc">${g.description}</p>` : ''}
          </div>
          <div class="watch-actions">
            <button class="btn btn-ghost btn-small" type="button" id="watchFav" data-fav="${g.id}" aria-pressed="${fav}">${fav ? 'Saved to favorites' : 'Save to favorites'}</button>
            <a class="btn btn-ghost btn-small" href="https://www.youtube.com/watch?v=${g.id}" target="_blank" rel="noopener noreferrer">Watch on YouTube</a>
          </div>
        </div>
        <nav class="pager" aria-label="Games in this season">
          ${prev ? html`<a href="#/watch/${prev.id}"><small>Previous Game</small><strong>${prev.title}</strong></a>` : html`<a href="#/watch/${g.id}" aria-disabled="true" tabindex="-1"><small>Previous Game</small><strong>This is the first one</strong></a>`}
          ${next ? html`<a class="next" href="#/watch/${next.id}"><small>Next Game</small><strong>${next.title}</strong></a>` : html`<a class="next" href="#/watch/${g.id}" aria-disabled="true" tabindex="-1"><small>Next Game</small><strong>This is the last one</strong></a>`}
        </nav>
        <details class="help"><summary>Video won't play?</summary><div><ul>
          <li>Press <b>Watch on YouTube</b> above. It always works if you can open YouTube.</li>
          <li>"Video unavailable" usually means the video is set to <b>Private</b> on YouTube. Private videos cannot play on this site. It needs to be <b>Unlisted</b> with embedding allowed.</li>
          <li>If this page was opened straight from a file on a computer, the player will refuse to load. Open the published web address instead.</li>
        </ul></div></details>
      </div>`
    };
  }

  function viewNotFound(msg) {
    return {
      title: 'Not found', nav: '',
      body: html`<div class="wrap section">${emptyState('Nothing here', msg || 'That page does not exist.', html`<a class="btn btn-small" href="#/games">Back to Games</a>`)}</div>`
    };
  }

  /* ---- Admin helper: prepares text to paste into the data files. It cannot change the site. ---- */

  function viewAdmin() {
    save('cavpride.admin', true);
    showAdminLink();
    var rows = state.rawCatalog ? checkEntries(state.rawCatalog) : [];
    var seasonOpts = state.seasons.map(function (s) { return html`<option value="${s.grade}">${s.grade}</option>`; });
    return {
      title: 'Admin', nav: 'admin', after: bindAdmin,
      body: html`<div class="wrap">
        <div class="page-head"><h1 class="page-title">Admin helper</h1>
          <p class="page-sub">This page writes the text you paste into <code>data/games.json</code> and <code>data/site.json</code>. It cannot change the live site by itself. Changes go live only when you save those files on GitHub.</p></div>

        ${state.loadError ? html`<p class="status bad" role="alert">The catalog has a problem: ${state.loadError}. Fix the file on GitHub, or paste it into the checker below to find the spot.</p>` : ''}

        <div class="admin-grid">
          <section class="panel" aria-labelledby="ad-add">
            <h2 id="ad-add">Add a game</h2>
            <div class="form-row"><label for="ad-url">YouTube link or video ID</label>
              <input class="field" id="ad-url" placeholder="https://youtu.be/abcDEF12345" autocomplete="off">
              <small>Paste the whole link. The ID is pulled out for you.</small></div>
            <div class="form-row"><label for="ad-title">Title</label><input class="field" id="ad-title" placeholder="Game 1 vs. Opponent"></div>
            <div class="two">
              <div class="form-row"><label for="ad-season">Season</label><select class="field" id="ad-season">${seasonOpts}</select></div>
              <div class="form-row"><label for="ad-year">Year</label><input class="field" id="ad-year" inputmode="numeric" placeholder="2026"></div>
            </div>
            <div class="two">
              <div class="form-row"><label for="ad-opp">Opponent</label><input class="field" id="ad-opp"></div>
              <div class="form-row"><label for="ad-date">Date</label><input class="field" id="ad-date" type="date"></div>
            </div>
            <div class="form-row"><label for="ad-desc">Description (optional)</label><input class="field" id="ad-desc"></div>
            <div class="form-row"><label for="ad-thumb">Custom thumbnail address (optional)</label><input class="field" id="ad-thumb" placeholder="Leave empty to use YouTube's picture"></div>
            <p class="status" id="ad-status" role="status"></p>
            <h3>Copy this into data/games.json</h3>
            <pre class="code" id="ad-out"></pre>
            <p class="muted" style="margin-top:.6rem">Put it between the square brackets. If another game comes before it, add a comma after that game's closing curly bracket.</p>
            <p style="margin-top:1rem;display:flex;gap:.75rem;flex-wrap:wrap">
              <button class="btn btn-small" type="button" id="ad-copy">Copy entry</button>
              <button class="btn btn-ghost btn-small" type="button" id="ad-test">Test the player</button></p>
            <div id="ad-preview" style="margin-top:1rem"></div>
          </section>

          <div>
            <section class="panel" aria-labelledby="ad-check">
              <h2 id="ad-check">Check games.json</h2>
              <p class="muted">Paste the whole file before you publish. This finds missing commas, bad IDs and unknown seasons.</p>
              <div class="form-row" style="margin-top:.8rem"><label for="ad-paste" class="muted">Contents of games.json</label><textarea class="field" id="ad-paste" spellcheck="false"></textarea></div>
              <button class="btn btn-small" type="button" id="ad-run">Check it</button>
              <div id="ad-report" style="margin-top:1rem" role="status"></div>
            </section>

            <section class="panel" style="margin-top:2rem" aria-labelledby="ad-live">
              <h2 id="ad-live">Games on the live site</h2>
              ${rows.length ? reportTable(rows, true) : html`<p class="muted">No games in <code>data/games.json</code> yet.</p>`}
            </section>

            <section class="panel" style="margin-top:2rem" aria-labelledby="ad-years">
              <h2 id="ad-years">Season years</h2>
              <p class="muted">Change a year, then copy the result into <code>data/site.json</code>.</p>
              <div class="two" style="margin-top:.8rem">${state.seasons.map(function (s) {
                return html`<div class="form-row"><label for="yr-${s.key}">${s.grade}</label><input class="field year-in" id="yr-${s.key}" data-key="${s.key}" value="${s.year}" inputmode="numeric"></div>`;
              })}</div>
              <pre class="code" id="yr-out"></pre>
              <p style="margin-top:1rem"><button class="btn btn-small" type="button" id="yr-copy">Copy season file</button></p>
            </section>

            <p style="margin-top:2rem"><button class="btn btn-ghost btn-small" type="button" id="ad-hide">Hide the Admin link on this device</button></p>
          </div>
        </div>
      </div>`
    };
  }

  function reportTable(rows, withThumbs) {
    var bad = rows.filter(function (r) { return r.issues.length; }).length;
    return html`<p class="status ${bad ? 'warn' : 'ok'}">${rows.length} ${rows.length === 1 ? 'entry' : 'entries'} found${bad ? ', ' + bad + ' need attention.' : ', all look good.'}</p>
      <div style="overflow-x:auto"><table class="report"><thead><tr>${withThumbs ? html`<th></th>` : ''}<th>#</th><th>Game</th><th>Result</th></tr></thead><tbody>
      ${rows.map(function (r) {
        var e = r.entry;
        return html`<tr>${withThumbs ? html`<td>${r.id ? html`<img class="mini-thumb" src="https://i.ytimg.com/vi/${r.id}/mqdefault.jpg" alt="" loading="lazy" data-next="">` : ''}</td>` : ''}
          <td>${r.index + 1}</td><td>${e.title || e.opponent || '(untitled)'}<br><span class="muted">${e.season || ''} ${e.date || ''}</span></td>
          <td>${r.issues.length ? html`<span class="${r.fatal ? 'status bad' : 'status warn'}">${r.issues.join(' ')}${r.fatal ? ' Hidden from the site.' : ''}</span>` : html`<span class="status ok">OK</span>`}</td></tr>`;
      })}</tbody></table></div>`;
  }

  function bindAdmin() {
    var $ = function (id) { return document.getElementById(id); };
    var seasonSel = $('ad-season');

    function syncYear() { var s = seasonByKey(seasonKeyFrom(seasonSel.value)); if (s && s.year && !$('ad-year').dataset.touched) $('ad-year').value = s.year; }
    $('ad-year').addEventListener('input', function () { this.dataset.touched = '1'; });

    function build() {
      var id = parseYouTubeId($('ad-url').value);
      var yr = parseInt($('ad-year').value, 10);
      var entry = {
        title: $('ad-title').value.trim(), season: seasonSel.value, year: isNaN(yr) ? '' : yr,
        opponent: $('ad-opp').value.trim(), date: $('ad-date').value, youtubeId: id || 'REPLACE_WITH_VIDEO_ID',
        thumbnail: $('ad-thumb').value.trim(), description: $('ad-desc').value.trim()
      };
      $('ad-out').textContent = JSON.stringify(entry, null, 2);
      var st = $('ad-status');
      if (!$('ad-url').value.trim()) { st.textContent = ''; st.className = 'status'; }
      else if (!id) { st.textContent = 'That does not look like a YouTube link or ID.'; st.className = 'status bad'; }
      else { st.textContent = 'Video ID found: ' + id; st.className = 'status ok'; }
      return id;
    }
    ['ad-url', 'ad-title', 'ad-year', 'ad-opp', 'ad-date', 'ad-desc', 'ad-thumb'].forEach(function (i) { $(i).addEventListener('input', build); });
    seasonSel.addEventListener('change', function () { syncYear(); build(); });
    syncYear(); build();

    $('ad-copy').addEventListener('click', function () { copyText($('ad-out').textContent, this); });
    $('ad-test').addEventListener('click', function () {
      var id = build(), box = $('ad-preview');
      if (!id) { box.innerHTML = '<p class="status bad">Add a valid YouTube link first.</p>'; return; }
      box.innerHTML = '<div class="player"><iframe src="https://www.youtube-nocookie.com/embed/' + id + '?rel=0" title="Player test" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>' +
        '<p class="muted" style="margin-top:.5rem">If this says "Video unavailable", set the video to Unlisted and turn on Allow embedding in YouTube Studio.</p>';
    });

    $('ad-run').addEventListener('click', function () {
      var out = $('ad-report'), text = $('ad-paste').value.trim();
      if (!text) { out.innerHTML = '<p class="status warn">Paste the contents of games.json first.</p>'; return; }
      var data;
      try { data = JSON.parse(text); }
      catch (e) { out.innerHTML = html`<p class="status bad">The file is not valid JSON: ${e.message}. This is usually a missing or extra comma, or a missing quotation mark, near that spot.</p>`.s; return; }
      if (!Array.isArray(data)) { out.innerHTML = '<p class="status bad">The file must start with [ and end with ].</p>'; return; }
      out.innerHTML = data.length ? reportTable(checkEntries(data), false).s : '<p class="status ok">The file is valid and has no games yet.</p>';
    });

    function years() {
      var o = { seasons: state.seasons.map(function (s) {
        var inp = document.getElementById('yr-' + s.key);
        return { key: s.key, grade: s.grade, label: s.label, year: inp ? inp.value.trim() : s.year };
      }) };
      $('yr-out').textContent = JSON.stringify(o, null, 2);
    }
    Array.prototype.forEach.call(document.querySelectorAll('.year-in'), function (el) { el.addEventListener('input', years); });
    years();
    $('yr-copy').addEventListener('click', function () { copyText($('yr-out').textContent, this); });

    $('ad-hide').addEventListener('click', function () { save('cavpride.admin', false); location.hash = '#/'; document.getElementById('adminLink').hidden = true; });
  }

  function copyText(text, btn) {
    var label = btn.textContent;
    function done(ok) { btn.textContent = ok ? 'Copied' : 'Select the text and copy it'; setTimeout(function () { btn.textContent = label; }, 1800); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    else done(false);
  }

  /* ============================== 5. Router =============================== */

  function parseHash() {
    var h = location.hash.replace(/^#\/?/, ''), qs = {}, qi = h.indexOf('?');
    if (qi !== -1) {
      h.slice(qi + 1).split('&').forEach(function (p) { var kv = p.split('='); if (kv[0]) qs[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); });
      h = h.slice(0, qi);
    }
    return { parts: h.split('/').filter(Boolean), query: qs };
  }

  function route() {
    var r = parseHash(), p = r.parts, view;
    if (!p.length) view = viewHome();
    else if (p[0] === 'seasons') view = viewSeasons();
    else if (p[0] === 'season') view = viewSeason(seasonKeyFrom(p[1]));
    else if (p[0] === 'games') view = viewGames(r.query);
    else if (p[0] === 'favorites') view = viewFavorites();
    else if (p[0] === 'watch') view = viewWatch(parseYouTubeId(p[1]));
    else if (p[0] === 'random') {
      if (state.games.length) { var g = state.games[Math.floor(Math.random() * state.games.length)]; location.replace('#/watch/' + g.id); return; }
      view = viewGames({});
    }
    else if (p[0] === 'admin') view = viewAdmin();
    else view = viewNotFound();

    document.title = (view.title === 'Cav Pride 2030 Archive' ? '' : view.title + ' | ') + 'Cav Pride 2030 Archive';
    $app.innerHTML = view.body.s;
    Array.prototype.forEach.call(document.querySelectorAll('.main-nav a'), function (a) {
      if (a.getAttribute('data-nav') === view.nav) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
    try { $app.focus({ preventScroll: true }); } catch (e) { /* old browsers */ }
    if (view.after) view.after(view);
  }

  function showAdminLink() { document.getElementById('adminLink').hidden = !isAdminMode(); }

  /* ====================== 6. Events, TV remote, startup ==================== */

  // Thumbnails: try the next address, then fall back to the orange placeholder behind the image.
  function thumbFailed(img) {
    var next = (img.getAttribute('data-next') || '').split(' ').filter(Boolean);
    if (next.length) { img.setAttribute('data-next', next.slice(1).join(' ')); img.src = next[0]; }
    else img.hidden = true;
  }
  document.addEventListener('error', function (e) {
    if (e.target && e.target.tagName === 'IMG' && e.target.hasAttribute('data-next')) thumbFailed(e.target);
  }, true);
  document.addEventListener('load', function (e) {
    // YouTube answers a missing thumbnail with a tiny gray picture. Treat it as a miss.
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.hasAttribute('data-next') && /ytimg\.com/.test(t.src) && t.naturalWidth <= 120) thumbFailed(t);
  }, true);

  document.addEventListener('click', function (e) {
    var fav = e.target.closest('[data-fav]');
    if (fav) {
      e.preventDefault();
      var id = fav.getAttribute('data-fav'), on = toggleFav(id);
      Array.prototype.forEach.call(document.querySelectorAll('[data-fav="' + id + '"]'), function (b) {
        b.setAttribute('aria-pressed', on);
        if (b.id === 'watchFav') b.textContent = on ? 'Saved to favorites' : 'Save to favorites';
      });
      if (parseHash().parts[0] === 'favorites') route();
      return;
    }
    var tab = e.target.closest('[data-tab]');
    if (tab) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-tab]'), function (b) { b.setAttribute('aria-pressed', b === tab); });
      document.getElementById('libraryGrid').innerHTML = libraryPreview(tab.getAttribute('data-tab')).s;
    }
  });

  /* Arrow-key navigation for TV remotes and keyboards: jump to the nearest item in the pressed direction. */
  var FOCUSABLE = 'a[href]:not([aria-disabled="true"]), button:not([disabled]):not([tabindex="-1"]), input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
  document.addEventListener('keydown', function (e) {
    var dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    var back = e.key === 'Escape' || e.keyCode === 461 || e.keyCode === 10009 || e.key === 'BrowserBack' || e.key === 'XF86Back';
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    var typing = /INPUT|TEXTAREA|SELECT/.test(tag);

    if (back && !typing && parseHash().parts[0] === 'watch') { e.preventDefault(); history.length > 1 ? history.back() : (location.hash = '#/games'); return; }
    if (!dirs[e.key] || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (typing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || tag === 'SELECT' || tag === 'TEXTAREA')) return;
    if (tag === 'IFRAME') return;

    var items = Array.prototype.filter.call(document.querySelectorAll(FOCUSABLE), function (el) {
      var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[hidden]');
    });
    if (!items.length) return;
    var cur = document.activeElement;
    if (!cur || cur === document.body || cur === $app || items.indexOf(cur) === -1) { e.preventDefault(); items[0].focus(); return; }

    var d = dirs[e.key], a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2, best = null, bestScore = Infinity;
    items.forEach(function (el) {
      if (el === cur) return;
      var r = el.getBoundingClientRect(), dx = (r.left + r.width / 2) - ax, dy = (r.top + r.height / 2) - ay;
      var along = d[0] ? dx * d[0] : dy * d[1], across = d[0] ? Math.abs(dy) : Math.abs(dx);
      if (along <= 4) return;
      var score = along + across * 2.5;
      if (score < bestScore) { bestScore = score; best = el; }
    });
    if (best) { e.preventDefault(); best.focus(); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  });

  window.addEventListener('hashchange', route);

  showAdminLink();
  loadData().then(function () {
    route();
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* app still works without it */ });
    }
  });
})();
