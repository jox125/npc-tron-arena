// Import the test module
import test from 'node:test';
import assert from 'node:assert/strict';

import {applyPlayerTurn} from "../src/gameEngine.js";
import {createPlayer} from "../src/server/playerRegistry.js";



test("if player moves up, can turn right", () => {
    const player = createPlayer(1111, "testPlayer");
    player.dy = -4;
    assert.ok(applyPlayerTurn(player, "RIGHT"))
})