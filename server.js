const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

/* ------------------------------------------------------------------ *
 *  LEVELS: Progressive difficulty set in the world of Wonderland!
 *  Texts blend Lewis Carroll's whimsical tales, coding challenges,
 *  and typing dexterity tests for the CIC in Wonderland competition.
 * ------------------------------------------------------------------ */
const LEVELS = [
  {
    name: 'Warm-up', // short lowercase words
    texts: [
      `down the rabbit hole we fall into a strange land with tea and cake`,
      `the white rabbit has a gold watch and runs fast across the green grass`,
      `curious and curious said the girl as she drank from the small glass bottle`,
    ],
  },
  {
    name: 'Sentences', // capitals + basic punctuation
    texts: [
      `Alice tumbled down the deep rabbit hole, wondering if she would fall right through the earth.`,
      `"I'm late, I'm late, for a very important date!" shouted the White Rabbit, checking his pocket watch.`,
      `The Cheshire Cat smiled slowly in the dark tree, leaving only his wide grin behind.`,
    ],
  },
  {
    name: 'Punctuation', // quotes, parentheses, semicolons, hyphens
    texts: [
      `"Why, sometimes I've believed as many as six impossible things before breakfast," laughed the Queen (she was quite mad).`,
      `"Have some wine," the March Hare offered; Alice looked all around the table, but there was nothing on it but tea - "I don't see any wine!"`,
      `"We're all mad here; I'm mad, you're mad," said the Cat; "How do you know I'm mad?" asked Alice - "You must be, or you wouldn't have come here."`,
    ],
  },
  {
    name: 'Numbers', // digits, dates, currency, math
    texts: [
      `At 05:42 on 4 May 1865, Alice shrank to 10 inches, grew to 9 feet, and drank 250ml of shrinking potion for $3.99.`,
      `Flock of 52 playing cards painted 7 white roses red; the Queen demanded 100 tarts and counted 42 soldiers at 16:30 sharp.`,
      `Tea party #6 began at 18:00 with 3 guests, 365 unbirthdays, and exactly 1,729 sugar cubes costing $12.50 per kilo.`,
    ],
  },
  {
    name: 'Shell & Commands', // terminal commands, pipes, flags
    texts: [
      `$ ssh -p 2222 rabbit@wonderland.cic && grep -rn 'keyhole' ./garden/*.log | sort -u > golden_door.txt # 0xCAFE & 0xFF`,
      `$ git checkout -b tea-party && git commit -am "cheshire grin: 404 body not found" && git push -u origin looking-glass`,
      `$ curl -sSL https://cic.wonderland/api/v1/shrink-potion | jq '.bottle[] | select(.size_factor < 0.1)' > pocket_watch.json`,
    ],
  },
  {
    name: 'Code & Logic', // programming syntax, expressions, functions
    texts: [
      `if (alice.eats(cake) && size < 10) { grow("9ft"); } // phi = (1 + sqrt(5))/2, unbirthday = (day != birthday)`,
      `def follow_rabbit(s): return [c.upper() for c in s if c in {'K', 'E', 'Y'} or ord(c) % 7 == 0] # {'wonderland': True}`,
      `const madTea = (tea, guests) => (guests.length > 2 && tea.cups > 0) ? "clean_cup_move_down" : "twinkle_twinkle_bat";`,
    ],
  },
  {
    name: 'Boss Level', // long mixed paragraph, Carroll riddles + crypto
    texts: [
      `"Begin at the beginning," the King said gravely, "and go on till you come to the end: then stop." One typo = off with your head; zero typos = victory! Keep your fingers steady, breathe deep, and type [every] {single} <symbol> through the looking glass.`,
      `"Why is a raven like a writing-desk?" asked the Hatter: encrypt with c = m^e mod n, decrypt with m = c^d mod n. "I have no idea!" said Alice. Never paint white roses red, never lose your watch, and never roll your own crypto in Wonderland!`,
      `while (rabbit.distance > 0) { alice.chase(); if (alice.reachedKeyhole()) { escapeWonderland(); break; } else { drinkPotion(0.5); } } // Curiouser & curiouser!`,
    ],
  },
];

/* ------------------------------------------------------------------ *
 *  INTENSITY MODES:
 *  - 3 stages: Tea Party Sprint (Warm-up, Sentences, Boss Level)
 *  - 7 stages: Full Wonderland (All 7 levels)
 * ------------------------------------------------------------------ */
const MODES = {
  3: {
    name: 'Tea Party Sprint',
    stages: 3,
    indices: [0, 1, 6], // Warm-up, Sentences, Boss Level
  },
  7: {
    name: 'Full Wonderland',
    stages: 7,
    indices: [0, 1, 2, 3, 4, 5, 6], // All 7 levels
  },
};

function getLevelsForMode(mode) {
  const m = Number(mode) === 3 ? 3 : 7;
  return MODES[m].indices.map((i) => LEVELS[i]);
}

function pickRound(mode) {
  const levels = getLevelsForMode(mode);
  return {
    names: levels.map((l) => l.name),
    texts: levels.map((l) => l.texts[Math.floor(Math.random() * l.texts.length)]),
  };
}

/* ------------------------------------------------------------------ *
 *  DASHBOARD: best run per player name (persisted to dashboard.json)
 * ------------------------------------------------------------------ */
const DASHBOARD_FILE = path.join(__dirname, 'dashboard.json');
const bestRuns = new Map(); // name -> { name, wpm, acc, mode, intensity, at }

function sanitizeName(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
}

function clampInt(n, min, max, fallback) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function loadDashboard() {
  try {
    const data = JSON.parse(fs.readFileSync(DASHBOARD_FILE, 'utf8'));
    const runs = Array.isArray(data && data.runs) ? data.runs : [];
    for (const r of runs) {
      if (!r || typeof r.name !== 'string') continue;
      const name = sanitizeName(r.name);
      if (!name) continue;
      const wpm = clampInt(r.wpm, 0, 500, -1);
      if (wpm < 0) continue;
      const entry = {
        name,
        wpm,
        acc: clampInt(r.acc, 0, 100, 0),
        mode: r.mode === 'solo' ? 'solo' : 'duo',
        intensity: Number(r.intensity) === 3 ? 3 : 7,
        at: Number.isFinite(Number(r.at)) ? Number(r.at) : 0,
      };
      const prev = bestRuns.get(name);
      if (!prev || entry.wpm > prev.wpm) bestRuns.set(name, entry);
    }
  } catch {
    /* first run / missing / corrupt file */
  }
}

function sortedRuns() {
  return [...bestRuns.values()]
    .sort((a, b) => b.wpm - a.wpm || a.name.localeCompare(b.name))
    .slice(0, 50);
}

function saveDashboard() {
  fs.writeFile(DASHBOARD_FILE, JSON.stringify({ runs: sortedRuns() }, null, 2), (err) => {
    if (err) console.error('Could not save dashboard.json:', err.message);
  });
}

function broadcastDashboard() {
  const runs = sortedRuns();
  wss.clients.forEach((c) => send(c, { type: 'dashboard', runs }));
}

function submitRun(msg) {
  const name = sanitizeName(msg.name) || 'Anonymous';
  const wpm = clampInt(msg.wpm, 0, 500, -1);
  if (wpm < 0) return;
  const entry = {
    name,
    wpm,
    acc: clampInt(msg.acc, 0, 100, 0),
    mode: msg.mode === 'solo' ? 'solo' : 'duo',
    intensity: Number(msg.intensity) === 3 ? 3 : 7,
    at: Date.now(),
  };
  const prev = bestRuns.get(name);
  if (prev && prev.wpm >= entry.wpm) return; // keep the best run only
  bestRuns.set(name, entry);
  saveDashboard();
  broadcastDashboard();
}

/* ------------------------------------------------------------------ *
 *  HTTP: serve static assets (/assets/...) & the single-page app
 * ------------------------------------------------------------------ */
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // Serve static assets from the /assets/ folder
  if (pathname.startsWith('/assets/')) {
    const filePath = path.join(__dirname, pathname);
    const assetsDir = path.join(__dirname, 'assets');
    if (filePath.startsWith(assetsDir)) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
      };
      fs.readFile(filePath, (err, data) => {
        if (!err) {
          res.writeHead(200, {
            'Content-Type': mimeTypes[ext] || 'application/octet-stream',
            'Cache-Control': 'public, max-age=86400',
          });
          return res.end(data);
        }
        res.writeHead(404);
        return res.end('Asset not found');
      });
      return;
    }
  }

  // Default: serve index.html
  fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
    if (err) {
      res.writeHead(500);
      return res.end('Could not load index.html');
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(data);
  });
});

/* ------------------------------------------------------------------ *
 *  WebSocket game logic & Matchmaking
 * ------------------------------------------------------------------ */
const wss = new WebSocketServer({ server });
let waiting = null; // one player waiting for an opponent

const send = (ws, msg) => {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
};

function enqueue(ws, prefMode) {
  ws.match = null;
  ws.stage = 0;
  ws.prefMode = prefMode || ws.prefMode || 7;

  if (waiting && waiting !== ws && waiting.readyState === 1) {
    const other = waiting;
    waiting = null;

    // If either player explicitly preferred 3 stages, default to 3; otherwise 7
    const mode = (other.prefMode === 3 || ws.prefMode === 3) ? (other.prefMode === 3 ? 3 : ws.prefMode) : 7;

    const match = {
      players: [other, ws],
      roles: Math.random() < 0.5 ? ['alice', 'rabbit'] : ['rabbit', 'alice'],
      wins: [0, 0],
      round: 0,
      mode: mode,
      texts: [],
      names: [],
      playerNames: [other.name || 'Player 1', ws.name || 'Player 2'],
      running: false,
      over: false,
      token: 0, // invalidates old countdown timers after a reset
    };
    other.match = ws.match = match;
    startRound(match, null);
  } else {
    waiting = ws;
    send(ws, { type: 'waiting', prefMode: ws.prefMode });
  }
}

function createSolo(ws, mode) {
  const match = {
    players: [ws],
    roles: ['solo'],
    wins: [0],
    round: 0,
    mode: mode,
    texts: [],
    names: [],
    playerNames: [ws.name],
    running: false,
    over: false,
    token: 0,
  };
  ws.match = match;
  startRound(match, null);
}

function startRound(m, resetBy) {
  const token = ++m.token;
  m.running = false;
  m.over = false;
  m.round++;
  if (m.round > 1 && m.players.length > 1) m.roles.reverse(); // swap roles every new round

  const { names, texts } = pickRound(m.mode);
  m.names = names;
  m.texts = texts;

  m.players.forEach((p, i) => {
    p.stage = 0;
    send(p, {
      type: 'matched',
      role: m.roles[i],
      gameMode: m.players.length === 1 ? 'solo' : 'duo',
      mode: m.mode,
      texts: m.texts,
      names: m.names,
      playerNames: m.playerNames,
      youIndex: i,
      round: m.round,
      wins: { you: m.wins[i], opp: m.players.length > 1 ? m.wins[1 - i] : 0 },
      by: resetBy ? (resetBy === p ? 'you' : 'opponent') : null,
    });
  });

  setTimeout(() => {
    if (m.token !== token || m.over) return;
    m.running = true;
    m.players.forEach((p) => send(p, { type: 'go' }));
  }, 3000);
}

function finish(m, winner) {
  m.over = true;
  m.running = false;
  const wi = m.players.indexOf(winner);
  m.wins[wi]++;
  m.players.forEach((p, i) => {
    send(p, {
      type: 'end',
      won: p === winner,
      winnerRole: m.roles[wi],
      wins: { you: m.wins[i], opp: m.players.length > 1 ? m.wins[1 - i] : 0 },
      mode: m.mode,
      gameMode: m.players.length === 1 ? 'solo' : 'duo',
    });
  });
}

function leave(ws) {
  if (waiting === ws) waiting = null;
  const m = ws.match;
  if (!m) return;
  m.token++;
  m.over = true;
  const opp = m.players.find((p) => p !== ws);
  const prevMode = m.mode;
  ws.match = null;
  if (opp) {
    opp.match = null;
    if (opp.readyState === 1) {
      send(opp, { type: 'left' });
      enqueue(opp, opp.prefMode || prevMode); // return opponent to queue with preference
    }
  }
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.prefMode = 7;
  ws.name = null;
  ws.match = null;
  ws.stage = 0;
  ws.gameMode = null;
  ws.on('pong', () => (ws.isAlive = true));
  ws.on('error', () => {});

  // Send the current leaderboard so a fresh page load can render it immediately
  send(ws, { type: 'dashboard', runs: sortedRuns() });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object') return;

    // Allow setting intensity preference even when queued / waiting
    if (msg.type === 'setMode') {
      const mode = Number(msg.mode) === 3 ? 3 : 7;
      ws.prefMode = mode;
      if (ws.match) {
        const m = ws.match;
        m.mode = mode;
        startRound(m, ws);
      } else {
        send(ws, { type: 'prefModeUpdated', mode });
      }
      return;
    }

    // Choose game mode + name before matchmaking begins
    if (msg.type === 'join') {
      if (ws.match || waiting === ws) return; // already playing or queued
      const gameMode = msg.gameMode === 'solo' ? 'solo' : 'duo';
      const name = sanitizeName(msg.name) || 'Anonymous';
      if (msg.intensity) ws.prefMode = Number(msg.intensity) === 3 ? 3 : 7;
      ws.name = name;
      ws.gameMode = gameMode;
      if (gameMode === 'solo') {
        if (waiting === ws) waiting = null;
        createSolo(ws, ws.prefMode);
      } else {
        enqueue(ws, ws.prefMode);
      }
      return;
    }

    // Leaderboard submission (client-reported stats, validated for shape)
    if (msg.type === 'submitRun') {
      submitRun(msg);
      return;
    }

    const m = ws.match;
    if (!m) return;
    const opp = m.players.find((p) => p !== ws);

    switch (msg.type) {
      case 'progress': {
        if (!m.running || m.over) return;
        const p = Number(msg.progress);
        if (!Number.isFinite(p)) return;
        if (opp) send(opp, { type: 'opponent', progress: Math.min(1, Math.max(0, p)), stage: ws.stage });
        break;
      }
      case 'stageDone': {
        if (!m.running || m.over) return;
        if (msg.typed !== m.texts[ws.stage]) return; // must be exactly right
        ws.stage++;
        if (opp) send(opp, { type: 'opponent', progress: ws.stage / m.texts.length, stage: ws.stage });
        if (ws.stage >= m.texts.length) finish(m, ws);
        break;
      }
      case 'reset': {
        if (msg.mode) {
          m.mode = Number(msg.mode) === 3 ? 3 : 7;
        }
        startRound(m, ws); // either player can reset - applies to both
        break;
      }
    }
  });

  ws.on('close', () => leave(ws));
});

loadDashboard();

// keep idle connections alive behind proxies / tunnels
setInterval(() => {
  wss.clients.forEach((c) => {
    if (c.isAlive === false) return c.terminate();
    c.isAlive = false;
    c.ping();
  });
}, 25000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`CIC in Wonderland Duel running on http://localhost:${PORT}`));
