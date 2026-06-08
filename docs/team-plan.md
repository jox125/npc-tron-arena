## 📅 Phase 1: Core Networking & Basic Canvas-Free Viewport

**Objective:** Establish the communication pipeline and get moving player objects synced across different computers at 60 FPS.

### Teammate 1: Backend Architecture

* Initialize the Node.js project, `package.json`, and setup the Express/Socket.io servers.
* Create the master `gameState` object managing player slots (2–4 players), positions, and directional vectors.
* Write the standard 30 FPS server update tick loop using `setInterval`.
* Implement the network listeners for `JOIN_LOBBY` (ensuring unique names) and incoming `PLAYER_INPUT` vector changes.


### Teammate 2: UI Layout & State Handlers

* Build the structural HTML layout using clean semantic markup and global container boxes scaled to exactly $800 \times 800\text{px}$.
* Design the interactive Lobby landing screen containing the unique player name entry fields.
* Create the real-time scoreboard layout using CSS Flexbox/Grid to mirror upcoming data packets smoothly.


### Teammate 3: Client-Side Engine & Game Loop

* Implement the client-side `requestAnimationFrame` render loop running natively at 60 FPS.
* Set up the connection listeners to receive `GAME_STATE_UPDATE` packets from the server.
* Code the initial rendering module: read player coordinates from the payload and move player vehicle `<div>` elements using hardware-accelerated CSS `transform: translate3d(x, y, 0)`.


---

## 📅 Phase 2: Input Controls, Vector Turns, & Continuous Trails

**Objective:** Lock down responsive keyboard steering, prevent input errors, and generate optimized trails without a canvas.

### Teammate 1: Backend Architecture

* Code the vector change validation math: if a player is moving `UP`, explicitly ignore a `DOWN` input request to prevent self-inversion suicide.
* Implement continuous trail logic: track the active path of each player as a mathematical bounding box rectangle in the server array.
* When a player turns, "lock" that trail segment and push a new active line segment coordinate to their array tracker.

### Teammate 2: UI Integration & Lobby Logic

* Bind the **ESC** key listener globally. When pressed during gameplay, emit `PAUSE_GAME`; the pause menu emits `RESUME_GAME` and `QUIT_MATCH`.
* Create full-screen UI overlays for the 3-second pre-round countdown, the "Game Paused by [Player Name]" menu, and the final round results summary.
* Broadcast pause, resume, and quit notices containing the player who triggered the state change.


### Teammate 3: Responsive Key Binding & Trail Rendering

* Write the clean keyboard input manager (`input.js`) to capture immediate WASD/Arrow key strokes without long-press OS delays.
* Update the client renderer: when a new trail ID appears in the server payload, use `document.createElement('div')` to spawn it dynamically.
* Map the continuous coordinates of the server's trail bounding boxes directly to the width, height, and position styles of those `<div>` blocks.

---

## 📅 Phase 3: Screen Wrapping & Server-Authoritative Collisions

**Objective:** Implement the core gameplay math loops, handle border warping, and execute accurate hit-detection.

### Teammate 1: Backend Architecture

* **Screen Wrapping Math:** If a player’s $x$ or $y$ variable crosses a boundary line ($0$ or $800$), reset it to the absolute opposite edge and force an immediate trail split in the master array.
* **Collision Detection Engine:** Write a 2D bounding-box intersection loop that checks the player's cycle vehicle hitbox against all solid rectangles in the `trails` array.
* Exclude the current active trail segment from a player's own collision calculations to prevent instant self-elimination.
* Implement a shared collision check for head-on crashes: if two vehicles occupy the exact same coordinate box on the same tick, eliminate both simultaneously.

### Teammate 2: Audio Framework Engineering

* Set up **Howler.js** to handle audio asset loading and pre-loading without bottlenecking the rendering pipeline.
* Map sound triggers to specific state notifications: play distinct audio cues for round start, player elimination, and match victory.
* Keep public elimination and victory audio hooks ready for the collision and multi-round state managers.


### Teammate 3: Map Boundary UI & Polish

* Optimize layout styles so that trailing components split cleanly and instantly across borders during a screen wrap without causing visual tearing.
* Create subtle CSS border glows or ghost indicators on the edges so players can spot opponents approaching through a wrap zone.

---

## 📅 Phase 4: Power-Up Systems & Multi-Round Rules

**Objective:** Add strategic depth through randomly spawning arena power-ups and structure the multi-round match settings.

### Teammate 1: Backend Architecture

* Write a random spawn interval loop that drops power-up items across unallocated continuous coordinate zones on the map.
* Program the distinct functional physics overrides for each of your 4 balanced power-ups:
1. **Ghost:** Temporarily toggle the player's collision check to `false` for 4 seconds.
2. **Freeze:** Cut velocity modifiers (`dx`, `dy`) in half for all other active connection IDs for 5 seconds.
3. **Trail Eraser:** Clear out the player's historical trail coordinates from the master array.
4. **Trail Breaker:** Set a permanent boolean shield flag; drop the shield and remove the exact trail segment array row upon intersection without killing the player.


* Configure the condition lock: protect the Trail Breaker from breaking if a Ghost phase is actively running.

### Teammate 2: Lobby Controls & Match State

* Build custom lobby form controls allowing the lead host player to select the designated number of round victories needed to win a match.
* Implement the round transition state manager: update round numbers, track cumulative wins per session, and flash the global match winner screen.

### Teammate 3: Power-Up Graphics & UI Timers

* Animate the floating arena power-up icons using lightweight CSS animations to maintain 60 FPS.
* Render countdown visual bars beneath individual player score blocks when temporary modifiers like Ghost or Freeze are ticking down on their status arrays.

---

## 📅 Phase 5: Optimization & Teammate Hand-off

**Objective:** Polish system performance using browser tools and wrap up file tracking for your team's deployment specialist.

* **The Performance Pass:** Open the browser **Performance Tool** to audit execution speeds. Clean up any redundant DOM nodes and double-check that your client loop is utilizing standard `requestAnimationFrame` correctly.

