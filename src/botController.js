import {ARENA_HEIGHT, ARENA_WIDTH} from "./gameEngine.js";
import {
    BOT_DIFFICULTIES,
    BOT_PERSONALITIES
} from "./botConfig.js";

export const DIRECTIONS = Object.freeze({
    UP: 'UP',
    DOWN: 'DOWN',
    LEFT: 'LEFT',
    RIGHT: 'RIGHT'
});
const SCAN_STEP = 4;
const TRAIL_COLLISION_BUFFER = 4;
const PLAYER_DANGER_BUFFER = 10;
const OPPONENT_SCAN_RADIUS = 60;
const DANGER_REACTION_DISTANCE = 48;
const STRATEGIC_DECISION_MULTIPLIER = 4;

// Difficulty controls how far ahead a bot sees, how often it reconsiders,
// and how much imperfect human-like noise is allowed into the score.
const DIFFICULTY_SETTINGS = Object.freeze({
    [BOT_DIFFICULTIES.EASY]: Object.freeze({
        lookAhead: 120,
        decisionCooldownMs: 550,
        randomNoise: 30,
        safetyWeight: 3
    }),
    [BOT_DIFFICULTIES.MEDIUM]: Object.freeze({
        lookAhead: 220,
        decisionCooldownMs: 350,
        randomNoise: 14,
        safetyWeight: 3.5
    }),
    [BOT_DIFFICULTIES.HARD]: Object.freeze({
        lookAhead: 360,
        decisionCooldownMs: 220,
        randomNoise: 5,
        safetyWeight: 4
    })
});

// Personality weights bias equally safe choices without overriding safety.
// SURVIVOR values space, HUNTER values opponents, COLLECTOR values power-ups.
const PERSONALITY_WEIGHTS = Object.freeze({
    [BOT_PERSONALITIES.SURVIVOR]: Object.freeze({
        safety: 1.2,
        opponent: 0.2,
        powerUp: 0.2
    }),
    [BOT_PERSONALITIES.HUNTER]: Object.freeze({
        safety: 0.55,
        opponent: 1.35,
        powerUp: 0.15
    }),
    [BOT_PERSONALITIES.COLLECTOR]: Object.freeze({
        safety: 0.55,
        opponent: 0.25,
        powerUp: 1.4
    })
});

export function getCurrentDirection(player) {
    if (
        !player ||
        !Number.isFinite(player.dx) ||
        !Number.isFinite(player.dy)
    ) {
        return null;
    }

    if (player.dx > 0 && player.dy === 0) return DIRECTIONS.RIGHT;
    if (player.dx < 0 && player.dy === 0) return DIRECTIONS.LEFT;
    if (player.dy > 0 && player.dx === 0) return DIRECTIONS.DOWN;
    if (player.dy < 0 && player.dx === 0) return DIRECTIONS.UP;

    return null;
}

export function getCandidateDirections(player) {
    const currentDirection = getCurrentDirection(player);

    if (!currentDirection) {
        return [];
    }
    const directions = Object.values(DIRECTIONS);
    const oppositeDirections = {
        [DIRECTIONS.LEFT]: DIRECTIONS.RIGHT,
        [DIRECTIONS.RIGHT]: DIRECTIONS.LEFT,
        [DIRECTIONS.UP]: DIRECTIONS.DOWN,
        [DIRECTIONS.DOWN]: DIRECTIONS.UP
    };

    return directions.filter(
        direction => direction !== oppositeDirections[currentDirection]
    );
}

export function simulateStep(position, direction, distance) {
    const result = {...position};

    switch (direction) {
        case DIRECTIONS.RIGHT:
            result.x = result.x + distance;
            if (result.x > ARENA_WIDTH) {
                result.x = result.x - ARENA_WIDTH;
            }
            break;
        case DIRECTIONS.LEFT:
            result.x = result.x - distance;
            if (result.x < 0) {
                result.x = result.x + ARENA_WIDTH;
            }
            break;
        case DIRECTIONS.DOWN:
            result.y = result.y + distance;
            if (result.y > ARENA_HEIGHT) {
                result.y = result.y - ARENA_HEIGHT;
            }
            break;
        case DIRECTIONS.UP:
            result.y = result.y - distance;
            if (result.y < 0) {
                result.y = result.y + ARENA_HEIGHT;
            }
            break;
    }
    return result;
}

export function distanceToDanger(player, direction, gameState, maxDistance) {

    let currentPosition = {
        x: player.x,
        y: player.y
    };

    let distance = 0;
    while (distance < maxDistance) {
        const stepDistance = Math.min(SCAN_STEP, maxDistance - distance);
        distance += stepDistance;
        currentPosition = simulateStep(
            currentPosition,
            direction,
            stepDistance
        );

        if (pointHitsTrail(currentPosition, player, gameState.trails) ||
            pointHitsOtherPlayer(currentPosition, player, gameState.players)) {
            return distance;
        }
    }
    return maxDistance;
}

export function distanceToNearestPowerUp(player, direction, gameState, maxDistance) {
    let currentPosition = {
        x: player.x,
        y: player.y
    };

    let distance = 0;
    while (distance < maxDistance) {
        const stepDistance = Math.min(SCAN_STEP, maxDistance - distance);
        distance += stepDistance;
        currentPosition = simulateStep(
            currentPosition,
            direction,
            stepDistance
        );
        if (pointHitsPowerUp(currentPosition, gameState.powerUps)) {
            return distance;
        }
    }
    return maxDistance;
}

export function distanceToNearestOpponent(
    player,
    direction,
    gameState,
    maxDistance
) {
    let currentPosition = {
        x: player.x,
        y: player.y
    };

    let distance = 0;
    while (distance < maxDistance) {
        const stepDistance = Math.min(SCAN_STEP, maxDistance - distance);
        distance += stepDistance;
        currentPosition = simulateStep(
            currentPosition,
            direction,
            stepDistance
        );

        if (pointNearOpponent(currentPosition, player, gameState.players)) {
            return distance;
        }
    }

    return maxDistance;
}

export function scoreDirection(player, direction, gameState, options = {}) {
    const settings = getDifficultySettings(player.difficulty);
    const personalityWeights = getPersonalityWeights(player.personality);
    const lookAhead = options.lookAhead ?? settings.lookAhead;
    const random = options.random ?? Math.random;

    const safetyDistance = distanceToDanger(
        player,
        direction,
        gameState,
        lookAhead
    );
    const powerUpDistance = distanceToNearestPowerUp(
        player,
        direction,
        gameState,
        lookAhead
    );
    const opponentDistance = distanceToNearestOpponent(
        player,
        direction,
        gameState,
        lookAhead
    );

    // Safety is intentionally the largest part of the score for every bot.
    // Personality can bend a choice, but it should not make a bot happily
    // drive into an obvious wall just because a power-up or opponent is close.
    const safetyScore = safetyDistance * settings.safetyWeight;
    const personalityScore = getPersonalityScore({
        lookAhead,
        opponentDistance,
        personalityWeights,
        powerUpDistance,
        safetyDistance
    });
    const powerUpScore = getClosenessScore(powerUpDistance, lookAhead) *
        personalityWeights.powerUp;
    const opponentScore = getClosenessScore(opponentDistance, lookAhead) *
        personalityWeights.opponent;
    const directionDiversityScore = getDirectionDiversityScore(
        player,
        direction
    );
    const randomNoise = (random() - 0.5) * settings.randomNoise;
    const score = safetyScore +
        personalityScore +
        powerUpScore +
        opponentScore +
        directionDiversityScore +
        randomNoise;

    return {
        direction,
        score,
        safetyDistance,
        powerUpDistance,
        opponentDistance,
        breakdown: {
            safetyScore,
            personalityScore,
            powerUpScore,
            opponentScore,
            directionDiversityScore,
            randomNoise
        }
    };
}

export function shouldBotDecide(
    player,
    gameState,
    now = Date.now(),
    options = {}
) {
    const currentDirection = getCurrentDirection(player);
    if (!currentDirection) {
        return {
            shouldDecide: false,
            reason: 'NO_DIRECTION'
        };
    }

    const settings = getDifficultySettings(player.difficulty);
    const lookAhead = options.lookAhead ?? settings.lookAhead;
    const dangerDistance = distanceToDanger(
        player,
        currentDirection,
        gameState,
        lookAhead
    );

    if (dangerDistance <= DANGER_REACTION_DISTANCE) {
        return {
            shouldDecide: true,
            reason: 'DANGER',
            dangerDistance
        };
    }

    const runtime = player.botRuntime ?? {};
    if (
        runtime.forceDecisionAt !== undefined &&
        now >= runtime.forceDecisionAt
    ) {
        return {
            shouldDecide: true,
            reason: 'STRATEGY',
            dangerDistance
        };
    }

    if (runtime.nextDecisionAt === undefined || now >= runtime.nextDecisionAt) {
        return {
            shouldDecide: true,
            reason: 'STRATEGY',
            dangerDistance
        };
    }

    return {
        shouldDecide: false,
        reason: 'WAIT',
        dangerDistance
    };
}

export function chooseBotDirection(
    player,
    gameState,
    now = Date.now(),
    options = {}
) {
    const decisionReadiness = shouldBotDecide(
        player,
        gameState,
        now,
        options
    );
    if (!decisionReadiness.shouldDecide) {
        return null;
    }

    const candidates = getCandidateDirections(player);
    if (candidates.length === 0) {
        return null;
    }

    const scoredDirections = candidates
        .map(direction => scoreDirection(player, direction, gameState, options))
        .sort((first, second) => second.score - first.score);
    const chosen = scoredDirections[0];

    // Etapp 11 kasutab seda runtime infot, et sama bot ei teeks uut
    // strateegilist otsust igal 30 Hz serveri tick'il.
    player.botRuntime = {
        ...player.botRuntime,
        nextDecisionAt: now + getDifficultySettings(player.difficulty)
            .decisionCooldownMs,
        forceDecisionAt: now + getDifficultySettings(player.difficulty)
            .decisionCooldownMs * STRATEGIC_DECISION_MULTIPLIER,
        lastDirection: chosen.direction,
        lastTurnAt: chosen.direction === getCurrentDirection(player)
            ? player.botRuntime?.lastTurnAt ?? 0
            : now
    };

    return {
        direction: chosen.direction,
        reason: decisionReadiness.reason,
        scores: scoredDirections
    };
}

function getDifficultySettings(difficulty) {
    return DIFFICULTY_SETTINGS[difficulty] ??
        DIFFICULTY_SETTINGS[BOT_DIFFICULTIES.MEDIUM];
}

function getPersonalityWeights(personality) {
    return PERSONALITY_WEIGHTS[personality] ??
        PERSONALITY_WEIGHTS[BOT_PERSONALITIES.SURVIVOR];
}

function getPersonalityScore({
    lookAhead,
    opponentDistance,
    personalityWeights,
    powerUpDistance,
    safetyDistance
}) {
    const safetyBonus = safetyDistance * personalityWeights.safety;
    const opponentBonus = getClosenessScore(opponentDistance, lookAhead) *
        personalityWeights.opponent;
    const powerUpBonus = getClosenessScore(powerUpDistance, lookAhead) *
        personalityWeights.powerUp;

    return safetyBonus + opponentBonus + powerUpBonus;
}

function getClosenessScore(distance, maxDistance) {
    if (distance >= maxDistance) return 0;
    return maxDistance - distance;
}

function getDirectionDiversityScore(player, direction) {
    if (!player.botRuntime?.lastDirection) return 0;
    return player.botRuntime.lastDirection === direction ? -18 : 8;
}

function pointHitsTrail(point, player, trails) {
    for (let i = 0; i < (trails || []).length; i++) {
        const segment = {...trails[i]};
        if (segment.id === player.currentTrailId) {
            continue;
        }
        const minX = Math.min(segment.x1, segment.x2) -
            TRAIL_COLLISION_BUFFER;
        const maxX = Math.max(segment.x1, segment.x2) +
            TRAIL_COLLISION_BUFFER;
        const minY = Math.min(segment.y1, segment.y2) -
            TRAIL_COLLISION_BUFFER;
        const maxY = Math.max(segment.y1, segment.y2) +
            TRAIL_COLLISION_BUFFER;

        if (pointInWrappedBox(point, minX, maxX, minY, maxY)) {
            return true;
        }

    }
    return false;
}

function pointHitsOtherPlayer(point, player, players) {
    const otherPlayers = Object.values(players || {});

    for (const otherPlayer of otherPlayers) {
        if (player.id === otherPlayer.id || otherPlayer.isAlive === false) {
            continue;
        }

        const distanceX = wrappedAxisDistance(
            point.x,
            otherPlayer.x,
            ARENA_WIDTH
        );
        const distanceY = wrappedAxisDistance(
            point.y,
            otherPlayer.y,
            ARENA_HEIGHT
        );

        if (Math.hypot(distanceX, distanceY) <= PLAYER_DANGER_BUFFER) {
            return true;
        }
    }
    return false;
}

function pointInWrappedBox(point, minX, maxX, minY, maxY) {
    const wrappedXValues = [
        point.x,
        point.x - ARENA_WIDTH,
        point.x + ARENA_WIDTH
    ];
    const wrappedYValues = [
        point.y,
        point.y - ARENA_HEIGHT,
        point.y + ARENA_HEIGHT
    ];

    return wrappedXValues.some(x =>
        x >= minX &&
        x <= maxX &&
        wrappedYValues.some(y => y >= minY && y <= maxY)
    );
}

function wrappedAxisDistance(first, second, arenaSize) {
    const directDistance = Math.abs(first - second);
    return Math.min(directDistance, arenaSize - directDistance);
}

function pointHitsPowerUp(point, powerUps) {
    for (const powerUp of powerUps || []) {
        const distanceX = wrappedAxisDistance(
            point.x,
            powerUp.x,
            ARENA_WIDTH
        );
        const distanceY = wrappedAxisDistance(
            point.y,
            powerUp.y,
            ARENA_HEIGHT
        );

        if (Math.hypot(distanceX, distanceY) < powerUp.radius + 5) {
            return true;
        }
    }
    return false;
}

function pointNearOpponent(point, player, players) {
    const otherPlayers = Object.values(players || {});

    for (const otherPlayer of otherPlayers) {
        if (player.id === otherPlayer.id || otherPlayer.isAlive === false) {
            continue;
        }

        const distanceX = wrappedAxisDistance(
            point.x,
            otherPlayer.x,
            ARENA_WIDTH
        );
        const distanceY = wrappedAxisDistance(
            point.y,
            otherPlayer.y,
            ARENA_HEIGHT
        );

        if (Math.hypot(distanceX, distanceY) <= OPPONENT_SCAN_RADIUS) {
            return true;
        }
    }

    return false;
}
