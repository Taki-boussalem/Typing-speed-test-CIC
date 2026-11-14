# CIC in Wonderland: The Mad Typing Duel

A real-time, head-to-head multiplayer typing challenge built with Node.js WebSockets and a zero-dependency web frontend. Designed specifically for **Computer and Information Club (CIC)** events, workshops, and tournaments, this application pairs two participants in a synchronized typing sprint through the fantastical world of Lewis Carroll's *Alice in Wonderland*.

Both adventurers receive the same randomized prompt sequence across progressive difficulty tiers. Keystrokes are verified in real time, driving animated avatars across a competitive dual-lane track: **Alice** sprinting toward the Golden Keyhole (`🗝️`) and the **White Rabbit** clutching his pocket watch on his way down the Rabbit Hole (`🕳️`).

---

## Table of Contents

- [Overview](#overview)
- [Challenge Intensity Modes](#challenge-intensity-modes)
- [Key Features](#key-features)
- [Gameplay Mechanics](#gameplay-mechanics)
  - [Live Dual-Lane Arena](#live-dual-lane-arena)
  - [Input Validation and Anti-Cheat Engine](#input-validation-and-anti-cheat-engine)
  - [Real-Time Metrics](#real-time-metrics)
- [Level Progression](#level-progression)
- [System Architecture & Protocol](#system-architecture--protocol)
  - [Message Flow](#message-flow)
  - [Client-to-Server Messages](#client-to-server-messages)
  - [Server-to-Client Messages](#server-to-client-messages)
- [Repository Structure](#repository-structure)
- [Installation and Setup](#installation-and-setup)
- [Running the Application](#running-the-application)
  - [Local Testing (Single Device)](#local-testing-single-device)
  - [Local Area Network (LAN Event Setup)](#local-area-network-lan-event-setup)
  - [Public Tunnels & Reverse Proxies](#public-tunnels--reverse-proxies)
- [Configuration and Customization](#configuration-and-customization)
  - [Adding or Modifying Texts and Levels](#adding-or-modifying-texts-and-levels)
  - [Changing Port and Environment Variables](#changing-port-and-environment-variables)
  - [Customizing the UI Theme](#customizing-the-ui-theme)
- [Tournament & Event Hosting Guidelines](#tournament--event-hosting-guidelines)
- [License](#license)

---

## Overview

CIC in Wonderland transforms traditional typing speed tests into a whimsical, fast-paced 1v1 spectator duel:

- **Roles**: Connected players are automatically paired into private duel rooms and assigned either **Alice** or the **White Rabbit**.
- **The Chase**:
  - **Alice**: Must finish all levels and reach the Golden Keyhole before the White Rabbit escapes down the rabbit hole!
  - **The White Rabbit**: "I'm late, I'm late for a very important date!" Must finish all levels and dive into the rabbit hole before Alice catches up!
- **Role Inversion**: Roles automatically swap between players on each successive round to ensure competitive fairness.

---

## Challenge Intensity Modes

The game supports two selectable intensity levels tailored for different event formats:

1. **Tea Party Sprint (3 Stages)**:
   - Designed for rapid exhibition booth demos, crowd rotations, and fast qualifying heats.
   - Includes **Warm-up**, **Sentences**, and the **Boss Level**.
   - Average match duration: 45–90 seconds.

2. **Full Wonderland (7 Stages)**:
   - The complete championship format covering all keyboard domains.
   - Includes all 7 levels: **Warm-up**, **Sentences**, **Punctuation**, **Numbers**, **Shell & Commands**, **Code & Logic**, and **Boss Level**.
   - Average match duration: 2.5–4 minutes.

### Ways to Choose the Intensity
- **Interactive Header Switch**: Toggle between `3 Stages` and `7 Stages` at any time from the top navigation bar.
- **Lobby Overlay**: Choose the preferred mode on the waiting screen before matching.
- **Post-Match Rematch**: Select either an instant rematch in the current mode or switch modes with a single click.
- **URL Parameter**: Launch directly into either mode using query strings:
  - `http://localhost:3000/?stages=3` (or `?mode=quick`)
  - `http://localhost:3000/?stages=7` (or `?mode=original`)

---

## Key Features

- **Wonderland Aesthetics**: Custom "CIC in Wonderland" keyhole branding, deep twilight palette, Cheshire lavender accents, and glowing lime highlights.
- **Automated Matchmaking**: Instant 1v1 queue pairing via lightweight WebSockets.
- **Deterministic Prompts**: Both players receive identical, randomly sampled prompt sequences per round.
- **Seven Progressive Tiers**: Spans simple lowercase vocabulary, character dialogue, complex punctuation, numeric data, terminal commands, and functional source code.
- **Zero-Build Architecture**: Pure vanilla HTML5, CSS3, and ES6 JavaScript. No bundling, compilation, or external UI frameworks required.
- **Strict Keystroke Validation**: Character-by-character validation requiring `Backspace` error correction; clipboard pasting and cursor manipulation are disabled.
- **Server-Side Verification**: Verifies completed strings on the server prior to advancing stages to prevent race manipulation.
- **Live Statistics Engine**: Real-time calculation of Words Per Minute (WPM), percentage accuracy, round duration, and cumulative series score.
- **Tunnel & Proxy Resilience**: 25-second WebSocket ping/pong keepalive prevents idle timeouts across ngrok, Cloudflare tunnels, and venue Wi-Fi routers.

---

## Gameplay Mechanics

### Live Dual-Lane Arena
- The arena renders two themed sprint lanes:
  - **The Looking Glass Corridor**: Alice's lane leading to the Golden Keyhole (`🗝️`).
  - **The Rabbit Hole Run**: The White Rabbit's lane leading to the Rabbit Hole (`🕳️`).
- Typing completion dynamically updates each runner's track position:
  $$\text{Progress} = \frac{\text{Completed Characters} + \text{Current Stage Correct Characters}}{\text{Total Match Characters}}$$
- Opponent progress updates are relayed in real time over WebSockets with hopping animations.
- Finish-line celebrations trigger custom Wonderland visual effects:
  - **Alice victory**: Alice catches the White Rabbit at the keyhole with keys (`🗝️`), teacups (`🫖`), roses (`🌹`), and celebration sparkles.
  - **White Rabbit victory**: The White Rabbit dives into the rabbit hole with pocket watches (`⏰`), smoke (`💨`), and playing cards (`♠️`, `♥️`, `♦️`, `♣️`).

### Input Validation and Anti-Cheat Engine
- **Prefix Comparison**: Keystrokes are verified character-by-character. Matching characters glow Wonderland lime; mistyped characters turn Queen's rose red.
- **Correction Required**: Input cannot proceed past an error until the player corrects it using `Backspace`.
- **Anti-Cheat Lockouts**:
  - Clipboard pasting (`paste` event) is intercepted and canceled.
  - Drag-and-drop actions (`drop` event) are blocked.
  - Navigation keys (`Tab`, `Enter`, arrows, `Home`, `End`) are blocked to prevent cursor jumping.
  - Input auto-focus ensures keystrokes register directly to the hidden input buffer even if users click elsewhere.
- **Server Verification**: The client submits the typed string on stage completion. The server validates `msg.typed === match.texts[stage]` before granting the stage win.

### Real-Time Metrics
- **Words Per Minute (WPM)**: Computed every 200 ms using the standard metric:
  $$\text{WPM} = \frac{\text{Correct Characters} / 5}{\text{Elapsed Minutes}}$$
- **Accuracy**: Calculated continuously:
  $$\text{Accuracy} = 100 \times \left(1 - \frac{\text{Errors}}{\text{Total Keystrokes}}\right)$$
- **Series Scoreboard**: Tracks cumulative head-to-head match wins across sequential rounds (`You – Opponent`).

---

## Level Progression

All seven challenge levels are defined in `server.js` and themed after the world of Wonderland:

| Level | Name | In 3-Stage Mode | Content Focus | Target Competency |
| :---: | :--- | :---: | :--- | :--- |
| **1** | **Warm-up** | Yes | Short lowercase vocabulary (tea, cake, grass, bottle) | Baseline finger movement and rhythm |
| **2** | **Sentences** | Yes | Carroll dialogue, capitals, and standard punctuation | Shift-key coordination and sentence cadence |
| **3** | **Punctuation** | No | Quotes, semicolons, parentheses, hyphens | Symbol keys and conversational dialogue speed |
| **4** | **Numbers** | No | Dates, times, shrink measurements, currency (`$`) | Top-row number entry without typo pauses |
| **5** | **Shell & Commands** | No | Terminal commands (`ssh`, `git`, `curl`), pipes, flags | Command-line fluency and path syntax |
| **6** | **Code & Logic** | No | Conditionals, arrow functions, brackets (`{}`, `[]`) | Programming syntax and developer-specific symbols |
| **7** | **Boss Level** | Yes | High-density paragraphs combining Carroll riddles and RSA crypto | Precision endurance under competitive pressure |

---

## System Architecture & Protocol

The backend uses Node.js's native `http` module paired with the `ws` WebSocket library.

### Message Flow

```
Client A (Alice)              Node.js Server              Client B (White Rabbit)
      |                             |                             |
      |------- connection --------->|                             |
      |<------ {type: 'waiting'} ---|                             |
      |                             |<------- connection ---------|
      |<------ {type: 'matched'} ---|------- {type: 'matched'} -->|
      |        (3s countdown)       |        (3s countdown)       |
      |<------ {type: 'go'} --------|------- {type: 'go'} ------->|
      |                             |                             |
      |--- {type: 'progress'} ----->|--- {type: 'opponent'} ----->|
      |                             |<-- {type: 'progress'} ------|
      |<-- {type: 'opponent'} ------|                             |
      |                             |                             |
      |--- {type: 'stageDone'} ---->| (Server validates text)     |
      |--- [All stages complete] -->|                             |
      |<------ {type: 'end'} -------|------- {type: 'end'} ------>|
```

### Client-to-Server Messages

| Type | Payload Structure | Purpose |
| :--- | :--- | :--- |
| `setMode` | `{"type": "setMode", "mode": 3}` | Toggles active challenge intensity (`3` or `7` stages). |
| `progress` | `{"type": "progress", "progress": 0.45}` | Transmits normalized race progress (`0.0` to `1.0`). |
| `stageDone` | `{"type": "stageDone", "typed": "..."}` | Submits stage content for server validation. |
| `reset` | `{"type": "reset", "mode": 7}` | Requests round restart/rematch with specified intensity; swaps roles. |

### Server-to-Client Messages

| Type | Payload Structure | Purpose |
| :--- | :--- | :--- |
| `waiting` | `{"type": "waiting", "prefMode": 7}` | Confirms player is in queue with preferred mode. |
| `matched` | `{"type": "matched", "role": "alice", "mode": 7, "texts": [...], "names": [...], "round": 1, "wins": {"you": 0, "opp": 0}}` | Initializes match parameters and synchronizes level texts. |
| `go` | `{"type": "go"}` | Unlocks player inputs following the 3-second countdown. |
| `opponent` | `{"type": "opponent", "progress": 0.32, "stage": 2}` | Relays the opponent's track position and stage counter. |
| `end` | `{"type": "end", "won": true, "winnerRole": "alice", "wins": {"you": 1, "opp": 0}, "mode": 7}` | Finalizes the round and displays outcome summary. |
| `prefModeUpdated` | `{"type": "prefModeUpdated", "mode": 3}` | Confirms preferred intensity update while in queue. |
| `left` | `{"type": "left"}` | Notifies player if opponent disconnected; returns player to queue. |

---

## Repository Structure

```
.
├── assets/
│   ├── logo.png        # Color CIC in Wonderland logo (lavender & lime keyhole)
│   └── logo-green.png  # Lime green CIC in Wonderland logo
├── index.html          # Client UI, CSS styling, typing logic, and WebSocket client
├── server.js           # HTTP file server, static asset server, and WebSocket logic
├── package.json        # Project metadata and dependencies
├── package-lock.json   # Exact dependency resolution
├── .gitignore          # Version control ignore definitions
└── README.md           # Repository documentation
```

---

## Installation and Setup

### Prerequisites
- **Node.js** (v16.0.0 or higher recommended)
- **npm** (bundled with Node.js)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Taki-boussalem/Typing-speed-test-CIC.git
   cd Typing-speed-test-CIC
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

---

## Running the Application

### Local Testing (Single Device)
1. Launch the server:
   ```bash
   npm start
   ```
   *(Defaults to `http://localhost:3000`)*

2. Open two separate browser tabs to:
   ```
   http://localhost:3000
   ```
3. The server will immediately pair the two tabs into a live Wonderland duel!

---

### Local Area Network (LAN Event Setup)
For in-person competitions where players use their own laptops:

1. Connect the host computer and competitor devices to the same local network (Wi-Fi or Ethernet switch).
2. Retrieve the host computer's local IP address:
   - **Linux / macOS**: Run `ip a` or `ifconfig` (look for `192.168.x.x` or `10.x.x.x`).
   - **Windows**: Run `ipconfig` (check the IPv4 address).
3. Start the application on the host machine:
   ```bash
   PORT=3000 npm start
   ```
4. Have contestants open their browsers and navigate to:
   ```
   http://<HOST_IP_ADDRESS>:3000
   ```
   *(Example: `http://192.168.1.50:3000`)*

---

### Public Tunnels & Reverse Proxies
To host competitions across remote networks without manual port forwarding:

- **ngrok**:
  ```bash
  ngrok http 3000
  ```
  Distribute the generated HTTPS URL. The frontend dynamically establishes secure WebSocket connections (`wss://`).
- **Cloudflare Tunnel**:
  ```bash
  cloudflared tunnel --url http://localhost:3000
  ```

---

## Configuration and Customization

### Adding or Modifying Texts and Levels
Levels and mode configurations are defined in [server.js](file:///home/taki/Projects/typing_speed_test_cic/server.js):

```javascript
const LEVELS = [
  {
    name: 'Warm-up',
    texts: [
      `down the rabbit hole we fall into a strange land with tea and cake`,
      // Add candidate texts...
    ],
  },
  // ...
];

const MODES = {
  3: { name: 'Tea Party Sprint', stages: 3, indices: [0, 1, 6] },
  7: { name: 'Full Wonderland', stages: 7, indices: [0, 1, 2, 3, 4, 5, 6] },
};
```

### Changing Port and Environment Variables
By default, the server listens on port `3000`. You can override this using the `PORT` environment variable:

```bash
PORT=8080 npm start
```

### Customizing the UI Theme
Design tokens, color palettes, and fonts can be configured via CSS custom properties in [index.html](file:///home/taki/Projects/typing_speed_test_cic/index.html):

```css
:root {
  --bg: #0d0818;        /* Twilight background */
  --panel: #160f26;     /* Velvet purple panels */
  --line: #352554;      /* Border line styling */
  --text: #ece5f8;      /* Primary text */
  --ok: #bfe062;        /* Wonderland Keyhole Lime */
  --bad: #f36b8e;       /* Queen's Rose Red */
  --accent: #bfe062;    /* Primary Lime Accent */
  --lavender: #caa9e8;  /* Cheshire Lavender */
  --alice: #7ec8e3;     /* Alice Blue */
  --rabbit: #f6e27f;    /* White Rabbit Gold */
}
```

---

## Tournament & Event Hosting Guidelines

1. **Choosing the Right Mode**:
   - Use **Tea Party Sprint (3 Stages)** for open-floor exhibition booths, crowd participation, or high-volume qualifiers.
   - Use **Full Wonderland (7 Stages)** for tournament quarter-finals, semi-finals, and championship matches.
2. **Match Series Format**: Matches are best conducted as Best-of-3 or Best-of-5 rounds. The in-game `↻ Reset round` button preserves cumulative series scores while inverting roles each round.
3. **Spectator Projection**: Connect an external monitor or projector displaying one of the participant screens (or an auxiliary browser tab) so audiences can track the live race progression.
4. **Hardware & Layout Equity**: Ensure both participants use identical keyboard layouts (e.g., standard ANSI/QWERTY) prior to starting, particularly for Level 4 (Numbers) and Level 5/6 (Shell & Code) where special character mappings diverge.

---

## License

This project is licensed under the [MIT License](LICENSE).
