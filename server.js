const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

/* ------------------------------------------------------------------ *
 *  LEVELS: progressive difficulty. Each level has candidate texts;
 *  one is picked at random per round (same for both players).
 *  Edit freely - add levels, change texts, adapt to your keyboard.
 * ------------------------------------------------------------------ */
const LEVELS = [
  {
    name: 'Warm-up', // short lowercase words
    texts: [
      `the sun is up and the sheep are out in the green field near the old barn`,
      `a big grey wolf ran down the hill to look for a small and tasty snack`,
      `we sit on the red mat and eat a hot bowl of soup with some warm bread`,
    ],
  },
  {
    name: 'Sentences', // capitals + basic punctuation
    texts: [
      `The shepherd counted his flock twice. Every night, one sheep was missing, and nobody knew why.`,
      `Wolves hunt in packs, but a lone wolf is quicker. Sheep, on the other hand, rely on the herd.`,
      `Morning came slowly over the valley. The grass was wet, and the air smelled of rain and smoke.`,
    ],
  },
  {
    name: 'Punctuation', // quotes, parentheses, semicolons
    texts: [
      `"Why are you running?" asked the wolf; the sheep, breathless, replied, "Because you're chasing me!" (He was not wrong.)`,
      `Keep calm, keep typing; mistakes happen (especially under pressure), but accuracy wins races - speed alone does not.`,
      `If the wolf is hungry, he runs faster; if the sheep is scared, she runs faster - who will blink first?`,
    ],
  },
  {
    name: 'Numbers', // digits, dates, currency
    texts: [
      `On 12 March 2025 at 06:45, 38 sheep crossed 7 bridges, ran 1,250 meters and still beat 3 wolves by 0.42 seconds.`,
      `Flock #27 has 143 sheep; the farm pays $5.99 per kilo, so 2,048 kilos earn exactly $12,267.52 in total.`,
      `Room 404, floor 13: call 555-0199 before 18:30, or the 9 sheep will have eaten all 256 carrots by 07:15.`,
    ],
  },
  {
    name: 'Shell & Commands', // terminal commands, pipes, flags
    texts: [
      `$ ssh -p 2222 wolf@10.0.0.7 && grep -rn 'sheep' ./farm/*.log | sort -u > out.txt # mask: 0xDEADBEEF & 0xFF`,
      `$ git checkout -b escape-route && git commit -am "sheep escaped fence #42" && git push -u origin safe-haven`,
      `$ curl -sSL https://farm.local/api/v1/flock | jq '.sheep[] | select(.speed > 40)' > ./fastest_sheep.json`,
    ],
  },
  {
    name: 'Code & Logic', // programming syntax, expressions, functions
    texts: [
      `if (wolf.speed > sheep.speed && !fence[x]) { eat(sheep); } // n = p*q, phi = (p-1)*(q-1), e*d = 1 (mod phi)`,
      `def run(s): return [x**2 % 17 for x in range(1, 10) if x != 3] # {'key': 'a1b2-c3d4', 'mod': 2^16 + 1}`,
      `const sprint = (dist, stamina) => (stamina > 20 && dist < 500) ? "escape_success" : "wolf_closing_in";`,
    ],
  },
  {
    name: 'Boss Level', // long mixed paragraph
    texts: [
      `In the end, the wolf and the sheep both knew the truth: speed matters, but precision matters more. One typo = one delay; zero typos = victory! Keep your fingers steady, breathe, and type [every] {single} <symbol> correctly.`,
      `RSA works because multiplying two primes is easy, but factoring their product (e.g., 3233 = 61 * 53) is hard: encrypt with c = m^e mod n, decrypt with m = c^d mod n. Never reuse nonces, and never roll your own crypto!`,
      `while (wolf.distance > 0) { sheep.run(); if (sheep.reachedBarn()) { celebrate(); break; } else { sheep.dodge(); } } // victory!`,
    ],
  },
];

/* ------------------------------------------------------------------ *
 *  INTENSITY MODES:
 *  - 3 stages: Quick sprint (Warm-up, Sentences, Boss Level)
 *  - 7 stages: Original full duel (All 7 levels)
 * ------------------------------------------------------------------ */
const MODES = {
  3: {
    name: 'Quick',
    stages: 3,
    indices: [0, 1, 6], // Warm-up, Sentences, Boss Level
  },
  7: {
    name: 'Original',
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
 *  HTTP: serve the single-page application
 * ------------------------------------------------------------------ */
const server = http.createServer((req, res) => {
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
      roles: Math.random() < 0.5 ? ['wolf', 'sheep'] : ['sheep', 'wolf'],
      wins: [0, 0],
      round: 0,
      mode: mode,
      texts: [],
      names: [],
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

function startRound(m, resetBy) {
  const token = ++m.token;
  m.running = false;
  m.over = false;
  m.round++;
  if (m.round > 1) m.roles.reverse(); // swap roles every new round

  const { names, texts } = pickRound(m.mode);
  m.names = names;
  m.texts = texts;

  m.players.forEach((p, i) => {
    p.stage = 0;
    send(p, {
      type: 'matched',
      role: m.roles[i],
      mode: m.mode,
      texts: m.texts,
      names: m.names,
      round: m.round,
      wins: { you: m.wins[i], opp: m.wins[1 - i] },
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
      wins: { you: m.wins[i], opp: m.wins[1 - i] },
      mode: m.mode,
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
  ws.on('pong', () => (ws.isAlive = true));
  ws.on('error', () => {});
  enqueue(ws);

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

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

    const m = ws.match;
    if (!m) return;
    const opp = m.players.find((p) => p !== ws);

    switch (msg.type) {
      case 'progress': {
        if (!m.running || m.over) return;
        const p = Number(msg.progress);
        if (!Number.isFinite(p)) return;
        send(opp, { type: 'opponent', progress: Math.min(1, Math.max(0, p)), stage: ws.stage });
        break;
      }
      case 'stageDone': {
        if (!m.running || m.over) return;
        if (msg.typed !== m.texts[ws.stage]) return; // must be exactly right
        ws.stage++;
        send(opp, { type: 'opponent', progress: ws.stage / m.texts.length, stage: ws.stage });
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

// keep idle connections alive behind proxies / tunnels
setInterval(() => {
  wss.clients.forEach((c) => {
    if (c.isAlive === false) return c.terminate();
    c.isAlive = false;
    c.ping();
  });
}, 25000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Wolf & Sheep Duel running on http://localhost:${PORT}`));
