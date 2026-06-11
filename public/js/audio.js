const SAMPLE_RATE = 16000;

export const AUDIO_CUES = Object.freeze({
    countdown: '/audio/beep.mp3',
    countdownFinal: '/audio/beep_high.mp3',
    roundStart: '/audio/electric.mp3',
    elimination: '/audio/elimination.mp3',
    victory: '/audio/victory.mp3',
    defeat: '/audio/defeat.mp3',
    powerup_appears: '/audio/powerup_appears.mp3',
    powerup_ghost_activate: '/audio/powerup_ghost_activate.mp3',
    powerup_ghost_deactivate: '/audio/powerup_ghost_deactivate.mp3',
    powerup_freeze_activate: '/audio/powerup_freeze_activate.mp3',
    powerup_freeze_deactivate: '/audio/powerup_freeze_deactivate.mp3',
    powerup_trail_eraser_activate: '/audio/powerup_trail_eraser_activate.mp3',
    powerup_trail_eraser_deactivate: '/audio/powerup_trail_eraser_deactivate.mp3',
    powerup_trail_breaker_activate: '/audio/powerup_trail_breaker_activate.mp3',
    powerup_trail_breaker_deactivate: '/audio/powerup_trail_breaker_deactivate.mp3'
});

const sounds = createSoundRegistry();
let lastCountdownValue = null;
let lastGameStatus = null;
const playedEliminations = new Set();

export function preloadAudio() {
    return Promise.all(
        Object.values(sounds).map(sound => new Promise(resolve => {
            if (!sound || sound.state() === 'loaded') {
                resolve();
                return;
            }

            sound.once('load', resolve);
            sound.once('loaderror', resolve);
            sound.load();
        }))
    );
}

export function unlockAudio() {
    const context = window.Howler?.ctx;

    if (context?.state === 'suspended') {
        context.resume();
    }
}

export function handleGameAudio(gameState, previousState, currentPlayerId) {
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

    if (gameState.gameStatus === 'GAME_OVER' && lastGameStatus !== 'GAME_OVER') {
        const isLocalWinner =
            Boolean(currentPlayerId) &&
            gameState.roundResult?.winnerId === currentPlayerId;
        playVictoryCue({ isLocalWinner });
    }

    if (gameState.gameStatus === 'LOBBY'
        && previousState?.gameStatus !== 'LOBBY') {
        playedEliminations.clear();
    }

    lastGameStatus = gameState.gameStatus;
}

export function playCountdownCue(value) {
    if (value === lastCountdownValue) return;

    lastCountdownValue = value;

    if (value > 1) {
        playSound('countdown');
    } else if (value === 1) {
        playSound('countdownFinal');
    } else {
        playSound('roundStart');
    }
}

export function resetCountdownAudio() {
    lastCountdownValue = null;
}

/**
 * Public integration hook for the future collision/elimination event.
 * Repeated calls for the same player ID are ignored.
 */
export function playEliminationCue({ playerId, isLocalPlayer = false } = {}) {
    if (playerId && playedEliminations.has(playerId)) return;
    if (playerId) playedEliminations.add(playerId);

    playSound('elimination', {
        rate: isLocalPlayer ? 0.82 : 1
    });
}

export function playVictoryCue({ isLocalWinner = false } = {}) {
    playSound(isLocalWinner ? 'victory' : 'defeat');
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

function createSoundRegistry() {
    const Howl = window.Howl;
    if (!Howl) return {};

    return Object.fromEntries(
        Object.entries(AUDIO_CUES).map(([name, src]) => [
            name,
            new Howl({
                src: [src],
                format: ['wav'],
                preload: true,
                volume: getCueVolume(name)
            })
        ])
    );
}

function playSound(name, { rate = 1 } = {}) {
    const sound = sounds[name];
    if (!sound) return;

    const soundId = sound.play();
    sound.rate(rate, soundId);
}

function getCueVolume(name) {
    if (name === 'victory' || name === 'defeat') return 0.32;
    if (name === 'roundStart') return 0.26;
    if (name === 'elimination') return 0.22;
    return 0.18;
}

function createToneWav({
    duration,
    startFrequency,
    endFrequency,
    waveform
}) {
    const sampleCount = Math.floor(SAMPLE_RATE * duration);
    const bytes = new Uint8Array(44 + sampleCount * 2);
    const view = new DataView(bytes.buffer);

    writeAscii(view, 0, 'RIFF');
    view.setUint32(4, 36 + sampleCount * 2, true);
    writeAscii(view, 8, 'WAVE');
    writeAscii(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, SAMPLE_RATE, true);
    view.setUint32(28, SAMPLE_RATE * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeAscii(view, 36, 'data');
    view.setUint32(40, sampleCount * 2, true);

    let phase = 0;
    for (let index = 0; index < sampleCount; index++) {
        const progress = index / sampleCount;
        const frequency =
            startFrequency + (endFrequency - startFrequency) * progress;
        const envelope = Math.sin(Math.PI * progress) ** 1.5;
        phase += 2 * Math.PI * frequency / SAMPLE_RATE;
        const sample = getWaveSample(waveform, phase) * envelope * 0.72;

        view.setInt16(44 + index * 2, sample * 32767, true);
    }

    let binary = '';
    bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });

    return `data:audio/wav;base64,${btoa(binary)}`;
}

function getWaveSample(waveform, phase) {
    if (waveform === 'square') return Math.sign(Math.sin(phase));
    if (waveform === 'sawtooth') {
        return 2 * ((phase / (2 * Math.PI)) % 1) - 1;
    }
    if (waveform === 'triangle') {
        return 2 * Math.asin(Math.sin(phase)) / Math.PI;
    }
    return Math.sin(phase);
}

function writeAscii(view, offset, value) {
    for (let index = 0; index < value.length; index++) {
        view.setUint8(offset + index, value.charCodeAt(index));
    }
}
