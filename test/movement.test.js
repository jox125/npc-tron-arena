// Import the test module
import test from 'node:test';
import assert from 'node:assert/strict';

import {applyPlayerTurn, gameState} from "../src/gameEngine.js";
import {createPlayer} from "../src/server/playerRegistry.js";

test("if player moves up, can turn right", () => {
    const player = createPlayer("test-id", "testPlayer");
    player.dy = -4;
    assert.equal(applyPlayerTurn(player, "RIGHT"), true);
    assert.equal(player.dx, 4);
    assert.equal(player.dy, 0);
})

test("if player moves up, can turn left", () => {
    const player = createPlayer("test-id", "testPlayer");
    player.dy = -4;
    assert.equal(applyPlayerTurn(player, "LEFT"), true);
    assert.equal(player.dx, -4);
    assert.equal(player.dy, 0);
})

test("if player moves up, can't turn down", () => {
    const player = createPlayer("test-id", "testPlayer");
    player.dy = -4;
    assert.equal(applyPlayerTurn(player, "DOWN"), false);
    assert.equal(player.dx, 0);
    assert.equal(player.dy, -4);
})

test("if player moves up, can't turn up", () => {
    const player = createPlayer("test-id", "testPlayer");
    player.dy = -4;
    assert.equal(applyPlayerTurn(player, "UP"), false);
    assert.equal(player.dx, 0);
    assert.equal(player.dy, -4);
})

test("if player moves down, can turn right", () => {
    const player = createPlayer("test-id", "testPlayer");
    player.dy = 4;
    assert.equal(applyPlayerTurn(player, "RIGHT"), true);
    assert.equal(player.dx, 4);
    assert.equal(player.dy, 0);
})

test("if player moves down, can turn left", () => {
    const player = createPlayer("test-id", "testPlayer");
    player.dy = 4;
    assert.equal(applyPlayerTurn(player, "LEFT"), true);
    assert.equal(player.dx, -4);
    assert.equal(player.dy, 0);
})

test("if player moves down, can't turn down", () => {
    const player = createPlayer("test-id", "testPlayer");
    player.dy = 4;
    assert.equal(applyPlayerTurn(player, "DOWN"), false);
    assert.equal(player.dx, 0);
    assert.equal(player.dy, 4);
})

test("if player moves down, can't turn up", () => {
    const player = createPlayer("test-id", "testPlayer");
    player.dy = 4;
    assert.equal(applyPlayerTurn(player, "UP"), false);
    assert.equal(player.dx, 0);
    assert.equal(player.dy, 4);
})

test("if player moves right, can turn up and down not right or left", () => {
    const player = createPlayer("test-id", "testPlayer");

    player.dx = 4;
    player.dy = 0;
    assert.equal(applyPlayerTurn(player, "UP"), true);
    assert.equal(player.dx, 0);
    assert.equal(player.dy, -4);

    player.dx = 4;
    player.dy = 0;
    assert.equal(applyPlayerTurn(player, "DOWN"), true);
    assert.equal(player.dx, 0);
    assert.equal(player.dy, 4);

    player.dx = 4;
    player.dy = 0;
    assert.equal(applyPlayerTurn(player, "RIGHT"), false);
    assert.equal(player.dx, 4);
    assert.equal(player.dy, 0);

    player.dx = 4;
    player.dy = 0;
    assert.equal(applyPlayerTurn(player, "LEFT"), false);
    assert.equal(player.dx, 4);
    assert.equal(player.dy, 0);
})

test("if player moves left, can turn up and down not right or left", () => {
    const player = createPlayer("test-id", "testPlayer");

    player.dx = -4;
    player.dy = 0;
    assert.equal(applyPlayerTurn(player, "UP"), true);
    assert.equal(player.dx, 0);
    assert.equal(player.dy, -4);

    player.dx = -4;
    player.dy = 0;
    assert.equal(applyPlayerTurn(player, "DOWN"), true);
    assert.equal(player.dx, 0);
    assert.equal(player.dy, 4);

    player.dx = -4;
    player.dy = 0;
    assert.equal(applyPlayerTurn(player, "RIGHT"), false);
    assert.equal(player.dx, -4);
    assert.equal(player.dy, 0);

    player.dx = -4;
    player.dy = 0;
    assert.equal(applyPlayerTurn(player, "LEFT"), false);
    assert.equal(player.dx, -4);
    assert.equal(player.dy, 0);
})

test("frozen player keeps speed when turning", () => {
    const player = createPlayer("frozen-id", "Frozen");
    player.dy = -2;

    assert.equal(applyPlayerTurn(player, "RIGHT"), true);
    assert.equal(player.dx, 2);
    assert.equal(player.dy, 0);
});

test("successful turn creates new trail segment", () => {
    const player = createPlayer("test-id", "testPlayer");
    player.dy = -4;
    const trailsNumber = gameState.trails.length;

    assert.equal(applyPlayerTurn(player, "RIGHT"), true);
    assert.equal(player.dx, 4);
    assert.equal(player.dy, 0);
    const newTrailsNumber = gameState.trails.length;

    assert.equal(newTrailsNumber, trailsNumber +1,);
})

test("unsuccessful turn dont create new trail segment", () => {
    const player = createPlayer("test-id", "testPlayer");

    player.dx = 0;
    player.dy = -4;
    const trailsNumber = gameState.trails.length;

    assert.equal(applyPlayerTurn(player, "UP"), false);
    assert.equal(player.dx, 0);
    assert.equal(player.dy, -4);
    const newTrailsNumber = gameState.trails.length;

    assert.equal(newTrailsNumber, trailsNumber);
})