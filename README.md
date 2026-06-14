# Light Cycle Arena — Game Specification

> Koodi ülesehituse ja andmevoo selgitus:
> [docs/Architecture.md](docs/Architecture.md)

## 1. Features

* **Real-Time Multiplayer:** Supports 2 to 4 players simultaneously over the internet.

* **Pure DOM Rendering:** High-performance, jank-free 60 FPS continuous physics rendering utilizing HTML elements and hardware-accelerated CSS transforms instead of HTML Canvas.

* **Intuitive Controls:** Responsive, low-latency keyboard steering with no input delays.

* **Fast-Paced Gameplay:** Quick rounds built on twitch reflexes and tactical pathing.
* **Dynamic Power-Ups:** Four distinct, randomly spawning battlefield modifiers to shift the tide of a match.
* **Cross-Browser Compatibility:** Designed to run flawlessly across standard modern web browsers.


---

## 2. Movement & Input Rules

* **Directional Steering:** Players navigate using the **W, A, S, D** or **Arrow Keys** to execute instantaneous, smooth 90-degree vector turns.

* **No Self-Inversion:** A player moving in a specific direction cannot instantly input the exact opposite command (e.g., pressing `DOWN` while moving `UP`). The game server strictly ignores self-inverting inputs to prevent accidental instant suicide.
* **Universal Game Menu:** Pressing the **ESC** key triggers the in-game menu, allowing players to pause, resume, or quit the match. When any of these actions are taken, a global message broadcast notifies all players exactly who triggered the system state change.


---

## 3. Scoring & Round Mechanics

### Pre-Round & Spawning

* **Input Freeze Countdown:** Every round begins with a visible 3-second countdown timer. During this period, player positions are synchronized but keyboard inputs remain locked to ensure an equal, lag-free start for everyone.

* **Symmetric Perimeter Spawn:** Players spawn dead-center along their respective arena boundaries (Top, Bottom, Left, and Right), facing inward toward the center of the playing area to ensure balanced map equity.

### Active Gameplay

* **Constant Momentum:** Once the countdown ends, all light cycles automatically advance forward at a continuous baseline velocity. Players cannot stop or slow down manually; they can only alter their trajectory via 90-degree turns.

* **Persistent Trails:** As a vehicle moves across the continuous coordinate space, it leaves behind a solid, persistent wall of its designated player color.

* **Screen Wrapping:** The boundaries of the arena are completely open. Passing through any edge instantly wraps the player's continuous coordinates to the exact corresponding position on the mathematically opposite edge, forcing a seamless split in their current trail segment.

### Game Timer

* An on-screen game timer counts upward in real-time, tracking exactly how many seconds the active round has lasted.


### Elimination & Victory Conditions

* **Losing Condition (Elimination):** A player is instantly eliminated from the active round if their vehicle's collision hitbox intersects with an opponent's trail or their own previous trail lines.

* **Round Victory:** The last surviving player standing wins the round. Placement rankings for the remaining players are automatically calculated based on the exact order of their timestamps of elimination.

* **Match Victory:** The number of rounds required to win a match is customized by the lead player inside the host lobby. The player who secures the highest number of round victories at the end of the set is crowned the overall winner.



---

## 4. Power-Ups

Power-ups materialize dynamically at random continuous coordinates across the arena throughout the match.

* **Ghost:** Grants complete invulnerability to trail collisions for exactly 4 seconds, allowing the player to phase cleanly through any line segment on the board.

* **Freeze (Global Slow):** Instantly debuffs all *opponents*, cutting their forward velocity in half for 5 seconds while the user maintains standard movement speed.

* **Trail Eraser:** Actively purges the user's entire historical trailing line data from both the server memory and client viewports, resetting their trail layout back to zero to clear trapped zones.

* **Trail Breaker (Shield):** A passive, permanent insurance policy with no expiration timer. Upon colliding with a deadly trail segment, the shield shatters, destroying that specific obstructing trail obstacle to open a path while the user survives unscathed.

* *Interaction Rule:* If a player activates a **Ghost** power-up while holding a **Trail Breaker** shield, the shield remains dormant. The Trail Breaker will only trigger if a collision occurs *after* the Ghost phase duration has fully expired.
