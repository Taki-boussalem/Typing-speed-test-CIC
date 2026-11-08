# Wolf & Sheep: Typing Duel

A real-time, head-to-head multiplayer typing challenge built with Node.js WebSockets and a zero-dependency vanilla web frontend. Originally developed for the **Computer and Information Club (CIC)** events, workshops, and competitions, this application pairs two participants in a synchronized typing sprint.

Both players receive the same randomized prompt sequence across progressive difficulty tiers. Keystrokes are verified in real time, driving animated avatars across a competitive dual-lane track.

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

Wolf & Sheep transforms standard typing tests into an interactive 1v1 spectator duel:

- **Roles**: Connected players are automatically paired and assigned either the **Wolf** or **Sheep** role.
- **Rounds**: Players race simultaneously through synchronized tiers of text difficulty.
- **Outcomes**:
  - If the Wolf reaches 100% completion first, the Wolf catches the Sheep.
  - If the Sheep reaches 100% completion first, the Sheep reaches the barn safely.
- **Role Reversals**: Roles automatically swap between players on each successive round to ensure fairness.

---

## Challenge Intensity Modes

The game supports two selectable intensity levels tailored for different event formats:

1. **Quick Duel (3 Stages)**:
   - Designed for rapid booth demos, high-turnover casual challenges, and quick elimination rounds.
   - Includes **Warm-up**, **Sentences**, and the **Boss Level**.
   - Average match duration: 45–90 seconds.

2. **Original Duel (7 Stages)**:
   - The full competition format covering all keyboard domains.
   - Includes all 7 levels: **Warm-up**, **Sentences**, **Punctuation**, **Numbers**, **Shell & Commands**, **Code & Logic**, and **Boss Level**.
   - Average match duration: 2.5–4 minutes.

### Ways to Choose the Intensity
- **Header Toggle**: Switch between `3 Stages` and `7 Stages` at any time using the mode selector in the top navigation bar.
- **Lobby Overlay**: Select preferred intensity before connecting with an opponent.
- **Post-Match Dialog**: Choose between immediate rematch in the same mode or switching modes with a single click.
- **URL Parameter**: Pre-configure tournament client links using URL query parameters:
  - `http://localhost:3000/?stages=3` (or `?mode=quick`)
  - `http://localhost:3000/?stages=7` (or `?mode=original`)

---

## Key Features

- **Automated Queue-Based Matchmaking**: Players who open the web application are immediately placed in queue and paired into private match instances.
- **Configurable Challenge Intensity**: Seamlessly toggle between 3-stage sprint and 7-stage full tournament modes.
- **Deterministic Prompts**: Both players receive identical, randomly sampled prompt sequences per round.
- **Progressive Difficulty**: Seven distinct tiers testing baseline vocabulary, capitalization, complex punctuation, numeric data, shell commands, and source code syntax.
- **Zero-Build Architecture**: Vanilla HTML5, modern CSS, and ES6 JavaScript. No bundling, compilation, or frontend framework overhead.
- **Strict Keystroke Validation**: Enforces exact character sequence matching with backspace correction; blocks clipboard pasting, drag-and-drop, and cursor navigation.
- **Server-Side Verification**: Prevents client-side state spoofing by validating final string submissions on the server prior to stage completion.
- **Live Statistics Engine**: Real-time calculation of Words Per Minute (WPM), percentage accuracy, round duration, and cumulative series score.
- **Network Resilience**: 25-second WebSocket ping/pong heartbeat keepalive prevents timeouts across proxies and tunneling services.

---

## Gameplay Mechanics

### Live Dual-Lane Arena
- The arena renders two dedicated sprint lanes (Wolf and Sheep).
- Typing completion updates the player's position along their lane in real time:
  $$\text{Progress} = \frac{\text{Completed Characters} + \text{Current Stage Correct Characters}}{\text{Total Match Characters}}$$
- Opponent progress updates are broadcast over WebSockets, updating the opposing track with hop animations.
- Finish-line animations visually indicate round conclusion and trigger post-match performance summaries.

### Input Validation and Anti-Cheat Engine
- **Prefix Comparison**: Keystrokes are evaluated character-by-character against the prompt text. Correct characters highlight green; mistyped characters highlight red with an active cursor marker.
- **Hard Correction Requirement**: A player cannot skip ahead or advance until mistyped characters are cleared using the `Backspace` key.
- **Input Lockout**:
  - Clipboard paste actions (`paste` event) are canceled.
  - Text drag-and-drop actions (`drop` event) are canceled.
  - Navigation keys (`Tab`, `Enter`, `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Home`, `End`) are intercepted to prevent cursor repositioning.
  - Auto-focus ensures keystrokes register directly to the hidden input buffer even if the user clicks elsewhere on the canvas.
- **Server Verification**: When a stage is completed, the client transmits the typed string. The server confirms `msg.typed === match.texts[stage]` before advancing the player's stage or signaling a match victory.

### Real-Time Metrics
- **Words Per Minute (WPM)**: Computed every 200 ms using the standard formula:
  $$\text{WPM} = \frac{\text{Correct Characters} / 5}{\text{Elapsed Minutes}}$$
- **Accuracy**: Calculated as:
  $$\text{Accuracy} = 100 \times \left(1 - \frac{\text{Errors}}{\text{Total Keystrokes}}\right)$$
- **Scoreboard**: Tracks cumulative match wins across sequential rounds (`You – Opponent`).

---

## Level Progression

The duel incorporates seven progressive difficulty levels configured in `server.js`:

| Level | Name | In 3-Stage Mode | Content Focus | Target Competency |
| :---: | :--- | :---: | :--- | :--- |
| **1** | **Warm-up** | Yes | Short lowercase vocabulary | Baseline finger movement and cadence |
| **2** | **Sentences** | Yes | Standard punctuation and capitalized words | Shift-key coordination and sentence flow |
| **3** | **Punctuation** | No | Semicolons, quotes, parentheses, hyphens | Symbol keys and non-alphanumeric agility |
| **4** | **Numbers** | No | Dates, timestamps, decimal values, currency (`$`) | Top-row number entry without typo pauses |
| **5** | **Shell & Commands** | No | Terminal commands (`ssh`, `git`, `curl`), flags, pipes | Command-line fluency and path syntax |
| **6** | **Code & Logic** | No | Code statements, arrow functions, brackets (`{}`, `[]`) | Programming syntax and developer-specific symbols |
| **7** | **Boss Level** | Yes | High-density paragraphs combining prose, math, and nested brackets | Precision endurance under competitive pressure |

---

## System Architecture & Protocol

The system uses an event-driven architecture using Node.js's native `http` module paired with the `ws` WebSocket library.

### Message Flow

```
Client A (Wolf)               Node.js Server               Client B (Sheep)
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
| `setMode` | `{"type": "setMode", "mode": 3}` | Changes active intensity mode (`3` or `7` stages). |
| `progress` | `{"type": "progress", "progress": 0.45}` | Transmits normalized race progress (`0.0` to `1.0`). |
| `stageDone` | `{"type": "stageDone", "typed": "..."}` | Submits stage content for server verification. |
| `reset` | `{"type": "reset", "mode": 7}` | Requests round restart/rematch with specified intensity; swaps roles. |

### Server-to-Client Messages

| Type | Payload Structure | Purpose |
| :--- | :--- | :--- |
| `waiting` | `{"type": "waiting", "prefMode": 7}` | Confirms player is queued awaiting an opponent with preferred mode. |
| `matched` | `{"type": "matched", "role": "wolf", "mode": 7, "texts": [...], "names": [...], "round": 1, "wins": {"you": 0, "opp": 0}}` | Initializes match parameters and synchronizes level texts. |
| `go` | `{"type": "go"}` | Unlocks player inputs following the 3-second countdown. |
| `opponent` | `{"type": "opponent", "progress": 0.32, "stage": 2}` | Updates the opponent's track position and stage counter. |
| `end` | `{"type": "end", "won": true, "winnerRole": "wolf", "wins": {"you": 1, "opp": 0}, "mode": 7}` | Finalizes the round and presents match statistics. |
| `prefModeUpdated` | `{"type": "prefModeUpdated", "mode": 3}` | Confirms preferred intensity update while in queue. |
| `left` | `{"type": "left"}` | Notifies active player if opponent disconnected; returns player to queue. |

---

## Repository Structure

```
.
├── index.html          # Client UI, CSS styling, typing logic, and WebSocket client
├── server.js           # HTTP file server, WebSocket matchmaking, intensity modes, and verification
├── package.json        # Project metadata, dependencies, and execution scripts
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

2. Open two separate browser tabs (or one normal tab and one private/incognito window) to:
   ```
   http://localhost:3000
   ```
3. The server will pair the two clients into a live session automatically.

---

### Local Area Network (LAN Event Setup)
For in-person competitions where players use their own laptops:

1. Connect the host machine and competitor devices to the same local network (Wi-Fi or Ethernet switch).
2. Retrieve the host computer's local IP address:
   - **Linux / macOS**: Run `ip a` or `ifconfig` (look for `192.168.x.x` or `10.x.x.x`).
   - **Windows**: Run `ipconfig` (check the IPv4 address).
3. Start the application on the host machine:
   ```bash
   PORT=3000 npm start
   ```
4. Have both contestants open their web browsers and navigate to:
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
Levels and mode configurations are defined in [server.js](file:///home/taki/Projects/typing_speed_test_cic/server.js#L11-L90):

```javascript
const LEVELS = [
  {
    name: 'Warm-up',
    texts: [
      `the sun is up and the sheep are out in the green field near the old barn`,
      // Add candidate texts...
    ],
  },
  // ...
];

const MODES = {
  3: { name: 'Quick', stages: 3, indices: [0, 1, 6] },
  7: { name: 'Original', stages: 7, indices: [0, 1, 2, 3, 4, 5, 6] },
};
```

The frontend dynamically generates stage indicator pills and progress trackers according to whatever levels are declared in `server.js`.

### Changing Port and Environment Variables
By default, the server listens on port `3000`. You can override this using the `PORT` environment variable:

```bash
PORT=8080 npm start
```

### Customizing the UI Theme
Design tokens, color palettes, and fonts can be configured via CSS custom properties in [index.html](file:///home/taki/Projects/typing_speed_test_cic/index.html#L9-L22):

```css
:root {
  --bg: #11111b;       /* Primary background */
  --panel: #181825;    /* Container background */
  --line: #313244;     /* Borders and delimiters */
  --text: #cdd6f4;     /* Foreground text */
  --ok: #a6e3a1;       /* Matching character indicator */
  --bad: #f38ba8;      /* Mistyped character indicator */
  --accent: #89b4fa;   /* Focus and active highlights */
  --wolf: #f38ba8;     /* Wolf lane styling */
  --sheep: #a6e3a1;    /* Sheep lane styling */
}
```

---

## Tournament & Event Hosting Guidelines

1. **Choosing the Right Mode**:
   - Use **Quick Duel (3 Stages)** for open-floor exhibition booths, crowd participation, or high-volume qualifiers.
   - Use **Original Duel (7 Stages)** for tournament quarter-finals, semi-finals, and championship matches.
2. **Match Series Format**: Matches are best conducted as Best-of-3 or Best-of-5 rounds. The in-game `↻ Reset round` button preserves cumulative series scores while inverting roles each round.
3. **Spectator Projection**: Connect an external monitor or projector displaying one of the participant screens (or an auxiliary browser tab) so audiences can track the live race progression.
4. **Hardware & Layout Equity**: Ensure both participants use identical keyboard layouts (e.g., standard ANSI/QWERTY) prior to starting, particularly for Level 4 (Numbers) and Level 5/6 (Shell & Code) where special character mappings diverge.

---

## License

This project is licensed under the [MIT License](LICENSE).
