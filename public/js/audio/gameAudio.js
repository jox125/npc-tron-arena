import { POWER_UP_AUDIO_CUES } from './audioConfig.js';
import { playSound, updateMusicScene } from './audioPlayer.js';

let lastCountdownValue = null;
let lastGameStatus = null;
const playedEliminations = new Set();

/**
 * Compares consecutive game states and plays sounds only for new events.
 */
export function handleGameAudio(
    gameState,
    previousState,
    currentPlayerId
) {
    updateMusicScene(gameState.gameStatus);

    if (!currentPlayerId) {
        resetCountdownAudio();
        lastGameStatus = gameState.gameStatus;
        return;
    }

    if (gameState.gameStatus === 'COUNTDOWN') {
        playCountdownCue(gameState.timer);
    } else {
        resetCountdownAudio();
    }

    playNewEliminations(gameState, currentPlayerId);

    if (
        gameState.gameStatus === 'GAME_OVER'
        && lastGameStatus !== 'GAME_OVER'
    ) {
        playVictoryCue({
            isLocalWinner:
                gameState.roundResult?.winnerId === currentPlayerId
        });
    }

    if (
        gameState.gameStatus === 'LOBBY'
        && previousState?.gameStatus !== 'LOBBY'
    ) {
        playedEliminations.clear();
    }

    lastGameStatus = gameState.gameStatus;
}

export function playCountdownCue(value) {
    if (value === lastCountdownValue) return;
    lastCountdownValue = value;

    if (value === 3) {
        playSound('cycleRide');
        playSound('countdown');
    } else if (value > 1) {
        playSound('countdown');
    } else if (value === 1) {
        playSound('countdownFinal');
    }
}

export function resetCountdownAudio() {
    lastCountdownValue = null;
}

export function playEliminationCue({
    playerId,
    isLocalPlayer = false
} = {}) {
    if (playerId && playedEliminations.has(playerId)) return;
    if (playerId) playedEliminations.add(playerId);

    playSound('elimination', {
        rate: isLocalPlayer ? 0.82 : 1
    });
}

export function playVictoryCue({ isLocalWinner = false } = {}) {
    playSound(isLocalWinner ? 'victory' : 'defeat');
}

export function playPowerUpCue(cue) {
    if (POWER_UP_AUDIO_CUES.has(cue)) playSound(cue);
}

function playNewEliminations(gameState, currentPlayerId) {
    const eliminatedIds = gameState.eliminationOrder ?? [];

    eliminatedIds.forEach(playerId => {
        playEliminationCue({
            playerId,
            isLocalPlayer: playerId === currentPlayerId
        });
    });
}
