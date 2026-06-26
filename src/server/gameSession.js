import {
    ARENA_HEIGHT,
    ARENA_WIDTH,
    eliminatePlayer,
    finishRound,
    gameState,
    resetGameToLobby,
    resetRoomToLobby,
    resetRoundOnlyPlayerState,
    startNewTrailSegment
} from '../gameEngine.js';
import {
    distanceToDanger,
    getCurrentDirection
} from '../botController.js';
import { spawnRandomPowerUp } from '../powerUp.js';
import { ensureHost, getPlayerIdentity } from './playerRegistry.js';
import { GAME_MODES } from './gameModes.js';

const COUNTDOWN_STEP_MS = 750;
const POWER_UP_SPAWN_INTERVAL_MS = 6000;
export const MATCH_SUMMARY_AUTO_RETURN_MS = 30000;

/**
 * Owns timers and round transitions for one running game server.
 *
 * Keeping timer handles here prevents Socket.IO handlers from needing to know
 * how countdowns, elapsed time and power-up spawning are implemented.
 */
export function createGameSession(
    io,
    { matchSummaryAutoReturnMs = MATCH_SUMMARY_AUTO_RETURN_MS } = {}
) {
    let countdownInterval = null;
    let powerUpInterval = null;
    let matchSummaryAutoReturnTimeout = null;
    let systemNoticeId = 0;

    function resolveRoundEnd() {
        if (!['PLAYING', 'PAUSED'].includes(gameState.gameStatus)) return false;

        const players = Object.values(gameState.players);
        if (players.length < 2) return false;

        players
            .filter(player =>
                !player.isAlive
                && !gameState.eliminationOrder.includes(player.id)
            )
            .forEach(player => gameState.eliminationOrder.push(player.id));

        const alivePlayers = players.filter(player => player.isAlive);
        if (shouldEndSinglePlayerAfterHumanDeath(players)) {
            updateRoundElapsedTime();
            return finishRoundAndScheduleLobbyReturn(
                selectSinglePlayerBotWinnerId(players),
                gameState.eliminationOrder
            );
        }

        if (alivePlayers.length > 1) return false;

        updateRoundElapsedTime();
        return finishRoundAndScheduleLobbyReturn(
            alivePlayers[0]?.id ?? null,
            gameState.eliminationOrder
        );
    }

    function finishRoundAndScheduleLobbyReturn(winnerId, eliminationOrder) {
        const finished = finishRound(winnerId, eliminationOrder);
        if (finished) scheduleMatchSummaryAutoReturn();

        return finished;
    }

    function startRoundCountdown() {
        clearCountdown();
        clearMatchSummaryAutoReturn();

        gameState.gameStatus = 'COUNTDOWN';
        gameState.timer = 3;
        gameState.roundStartedAt = null;
        gameState.roundPausedAt = null;
        gameState.roundPausedDurationMs = 0;
        gameState.roundElapsedMs = 0;
        gameState.pausedBy = null;
        gameState.roundResult = null;
        gameState.resultAutoReturnAt = null;
        gameState.eliminationOrder = [];
        gameState.eliminatedPlayers = {};
        gameState.trails = [];

        Object.values(gameState.players).forEach(player => {
            player.isAlive = true;
            player.dx = 0;
            player.dy = 0;
            resetRoundOnlyPlayerState(player);
        });

        io.emit('GAME_STATE_UPDATE', gameState);

        // The four phases are 3, 2, 1 and the transition into active play.
        countdownInterval = setInterval(() => {
            gameState.timer--;

            if (gameState.timer < 0) {
                clearCountdown();
                startActiveRound();
            }

            io.emit('GAME_STATE_UPDATE', gameState);
        }, COUNTDOWN_STEP_MS);
    }

    function startActiveRound() {
        gameState.gameStatus = 'PLAYING';
        gameState.powerUps = [];
        gameState.roundStartedAt = Date.now();
        gameState.roundElapsedMs = 0;

        Object.values(gameState.players).forEach(player => {
            setPlayerStartPosition(player);
            startNewTrailSegment(player);
        });

        clearPowerUpSpawner();
        powerUpInterval = setInterval(() => {
            if (gameState.gameStatus !== 'PLAYING') {
                clearPowerUpSpawner();
                return;
            }

            spawnRandomPowerUp(gameState);
        }, POWER_UP_SPAWN_INTERVAL_MS);
    }

    function removePlayerFromMatch(playerId) {
        eliminatePlayer(playerId);
        resolveRoundEnd();
        delete gameState.players[playerId];

        const hasHumanPlayers = Object.values(gameState.players)
            .some(player => player.isBot !== true);
        if (!hasHumanPlayers) {
            gameState.players = {};
            resetEmptySession();
            return;
        }

        ensureHost(io);
    }

    function updateRoundElapsedTime(now = Date.now()) {
        if (gameState.roundStartedAt === null) return;

        const endTime = gameState.roundPausedAt ?? now;
        gameState.roundElapsedMs = Math.max(
            0,
            endTime
                - gameState.roundStartedAt
                - gameState.roundPausedDurationMs
        );
    }

    function pauseRoundTimer() {
        const now = Date.now();
        updateRoundElapsedTime(now);
        gameState.roundPausedAt = now;
    }

    function resumeRoundTimer() {
        if (gameState.roundPausedAt === null) return;

        gameState.roundPausedDurationMs +=
            Date.now() - gameState.roundPausedAt;
        gameState.roundPausedAt = null;
    }

    function setSystemNotice(action, player, message) {
        gameState.systemNotice = {
            id: ++systemNoticeId,
            action,
            actor: getPlayerIdentity(player),
            message,
            createdAt: Date.now()
        };
    }

    function resetEmptySession() {
        clearCountdown();
        clearPowerUpSpawner();
        clearMatchSummaryAutoReturn();
        resetGameToLobby();
    }

    function returnToLobby() {
        clearMatchSummaryAutoReturn();
        resetRoomToLobby();
        io.emit('ROOM_STATE_UPDATE', Object.values(gameState.players));
        io.emit('GAME_STATE_UPDATE', gameState);
    }

    function clearCountdown() {
        if (!countdownInterval) return;
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    function clearPowerUpSpawner() {
        if (!powerUpInterval) return;
        clearInterval(powerUpInterval);
        powerUpInterval = null;
    }

    function scheduleMatchSummaryAutoReturn() {
        clearMatchSummaryAutoReturn();
        if (matchSummaryAutoReturnMs <= 0) return;

        gameState.resultAutoReturnAt =
            Date.now() + matchSummaryAutoReturnMs;
        matchSummaryAutoReturnTimeout = setTimeout(() => {
            if (gameState.gameStatus !== 'GAME_OVER') return;

            returnToLobby();
        }, matchSummaryAutoReturnMs);
    }

    function clearMatchSummaryAutoReturn() {
        if (matchSummaryAutoReturnTimeout) {
            clearTimeout(matchSummaryAutoReturnTimeout);
            matchSummaryAutoReturnTimeout = null;
        }
        gameState.resultAutoReturnAt = null;
    }

    return {
        pauseRoundTimer,
        removePlayerFromMatch,
        resetEmptySession,
        resolveRoundEnd,
        resumeRoundTimer,
        returnToLobby,
        setSystemNotice,
        startRoundCountdown,
        updateRoundElapsedTime
    };
}

function shouldEndSinglePlayerAfterHumanDeath(players) {
    if (gameState.gameMode !== GAME_MODES.SINGLE_PLAYER) return false;

    return !players.some(player =>
        player.isBot !== true &&
        player.isAlive === true
    );
}

function selectSinglePlayerBotWinnerId(players) {
    const aliveBots = players
        .filter(player => player.isBot === true && player.isAlive === true);

    if (aliveBots.length === 0) return null;

    return aliveBots
        .map(bot => ({
            id: bot.id,
            playerNumber: bot.playerNumber,
            survivalScore: getBotSurvivalScore(bot)
        }))
        .sort((first, second) => {
            if (second.survivalScore !== first.survivalScore) {
                return second.survivalScore - first.survivalScore;
            }

            return first.playerNumber - second.playerNumber;
        })[0].id;
}

function getBotSurvivalScore(bot) {
    const currentDirection = getCurrentDirection(bot);
    if (!currentDirection) return 0;

    return distanceToDanger(
        bot,
        currentDirection,
        gameState,
        Math.max(ARENA_WIDTH, ARENA_HEIGHT)
    );
}

function setPlayerStartPosition(player) {
    const startPositions = {
        1: { x: 400, y: 50, dx: 0, dy: 4 },
        2: { x: 400, y: 750, dx: 0, dy: -4 },
        3: { x: 50, y: 400, dx: 4, dy: 0 },
        4: { x: 750, y: 400, dx: -4, dy: 0 }
    };

    Object.assign(player, startPositions[player.playerNumber]);
}
