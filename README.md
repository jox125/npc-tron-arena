# Light Cycle Arena

Light Cycle Arena is a server-authoritative Tron-style web game with real-time
multiplayer and a single-player mode against computer-controlled bot opponents.
Players steer constantly moving light cycles, leave solid trails behind them,
collect power-ups, and try to be the last rider alive.

The project uses Express, Socket.IO, DOM/CSS rendering, and Node's built-in test
runner. The server is the source of truth for movement, collisions, power-ups,
round results, and bot decisions.

## Live Demo

The game is publicly playable on Render:

```text
https://npc-tron-arena.onrender.com/
```

## Authors

- Original web-game multiplayer: Rain Liivamägi, Rain Vahesalu, and Joel Lepp.
- NPC / single-player implementation: Joel Lepp.

## Features

- **Real-time multiplayer:** 2–4 human players can play through the browser.
- **Single-player mode:** the lead player can play against 1–3 virtual opponents.
- **Server-authoritative gameplay:** clients send inputs; the server validates
  actions and broadcasts the authoritative game state.
- **Bot opponents:** bots use the same physics, collision, trails, power-ups,
  scoring, and round lifecycle as human players.
- **Bot customization:** each bot can be configured by difficulty and
  personality before the match starts.
- **Power-ups:** Ghost, Freeze, Trail Eraser, and Trail Breaker change the
  tactical situation during a round.
- **DOM rendering:** cycles, trails, power-ups, overlays, and scoreboard are
  rendered with HTML/CSS rather than Canvas.
- **Automated tests:** movement, game modes, bot config, bot sensing, match
  rules, and lifecycle behavior are covered with `node:test`.

## Requirements

- Node.js 20 or newer is recommended.
- npm.
- A modern browser.

The project was developed and tested with Node.js 24.x.

## Installation

```bash
npm install
```

## Running the Game

```bash
npm start
```

Open:

```text
http://localhost:3000
```

The server binds to `0.0.0.0`, so it can also be reached from other machines if
the host exposes the port. For internet multiplayer, expose port `3000` through
your preferred tunnelling or hosting setup.

For development with auto-restart:

```bash
npm run dev
```

## Testing

Run all automated tests:

```bash
npm test
```

Run the JavaScript syntax check:

```bash
npm run check
```

Useful manual review flow:

1. Run `npm install`.
2. Run `npm start`.
3. Open one browser tab and join as the lead player.
4. Test multiplayer by opening another browser tab or browser profile.
5. Test single-player by selecting Single-player, choosing 1–3 bot opponents,
   and starting the match.

## Controls

- `W` / `ArrowUp`: turn up.
- `A` / `ArrowLeft`: turn left.
- `S` / `ArrowDown`: turn down.
- `D` / `ArrowRight`: turn right.
- `Esc`: open the pause menu during an active match.

The server rejects direct reverse turns. For example, a player moving up cannot
turn directly down.

## Game Modes

### Multiplayer

- Requires at least 2 human players.
- Supports up to 4 total human players.
- Bots are not allowed in multiplayer mode.
- The lead player starts the match and controls lobby settings.

### Single-player

- The lead player plays against 1, 2, or 3 bots.
- Incoming lobby joins are refused while single-player mode is active.
- Single-player still runs through the same server, physics engine, and browser
  UI as multiplayer.
- If the human player dies, the round ends immediately so the player does not
  have to watch bots finish the round alone.
- If bots remain alive after the human dies, the bot with the best deterministic
  survival score wins the round. Ties use the lower player number.

## Bot Opponents

Bots are normal player objects with `isBot: true` and no Socket.IO connection.
They cannot pause, resume, quit, restart, change lobby settings, or become the
room host.

Bot AI runs on the server before each physics tick. It evaluates candidate
directions using:

- distance to trail danger;
- distance to nearby players;
- distance to collectible power-ups;
- current power-up state, including Ghost and Trail Breaker;
- difficulty settings;
- personality weights;
- small random noise for less robotic behavior.

### Personalities

- **Survivor:** prefers safe space and tends to live longer, but pressures
  opponents less.
- **Hunter:** prefers directions that move toward opponents and can create more
  aggressive pressure.
- **Collector:** prefers safe routes toward power-ups, but can be baited by
  tempting items.

### Difficulties

Difficulty changes both strategy quality and implementation reliability.

| Parameter | Easy | Medium | Hard |
|---|---:|---:|---:|
| Strategic decision interval | ~950 ms | ~420 ms | ~180 ms |
| Minimum turn interval | ~700 ms | ~360 ms | ~160 ms |
| Look-ahead distance | ~65 px | ~170 px | ~360 px |
| Chance of applying the best safe choice | ~55% | ~92% | ~99% |
| Random score noise | Very high | Medium | Very low |

In practice:

- **Easy** reacts late, sees less of the arena, and often chooses a safe but
  non-optimal direction.
- **Medium** is balanced.
- **Hard** sees danger earlier, reacts faster, and almost always implements the
  best available safe plan.

## Power-ups

- **Ghost:** temporarily ignores trail collisions.
- **Freeze:** slows all other living players.
- **Trail Eraser:** removes the user's older trail segments while keeping the
  current active segment.
- **Trail Breaker:** works like a one-hit shield against a trail collision and
  removes the collided trail segment.

Bots can collect and benefit from the same power-ups as humans. Their danger
sensing also accounts for relevant active effects: Ghost ignores trails, and
Trail Breaker allows one simulated trail break while planning.

## Round and Match Flow

1. Players join the lobby.
2. The lead player chooses multiplayer or single-player.
3. In single-player, the lead player chooses the number of bots and each bot's
   difficulty/personality.
4. The lead player starts the match.
5. Each round begins with a countdown.
6. The server advances movement at 30 ticks per second.
7. The round ends when the rules determine a winner or draw.
8. The match winner is the first player to reach the selected wins required.

## Project Structure

```text
server.js                  Express, Socket.IO, and the authoritative tick loop
src/gameEngine.js          gameState, movement, scoring, and round helpers
src/botConfig.js           bot names, validation, and bot creation
src/botController.js       bot sensing, scoring, and turn decisions
src/server/                lobby, match, player, and session handlers
public/index.html          browser UI structure
public/js/                 client controls, rendering, UI, and audio modules
public/css/                modular CSS for lobby, game, overlays, and results
test/                      automated node:test coverage
docs/Architecture.md       code structure and data-flow notes
```

See [`docs/Architecture.md`](docs/Architecture.md) for a more detailed code map.

## Known Limitations

- There is no built-in public matchmaking lobby discovery. Players need to open
  the same local or hosted game URL to join the same server.
- Single-player is implemented as a local/server-authoritative mode, not as a
  separate fully client-only offline build.
- Bot behavior is heuristic rather than pathfinding over the full arena graph.
  This keeps the implementation explainable and fast, but bots can still make
  imperfect human-like decisions.

## Bonus / Extra Functionality

- Configurable bot personalities.
- Configurable Easy / Medium / Hard bot difficulty.
- Bot help overlay explaining difficulty and personality choices.
- Server-side validation that virtual opponents cannot use game menus.
- Audio cues for game state and power-up events.
