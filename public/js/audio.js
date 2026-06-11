const SAMPLE_RATE = 16000;
const MUSIC_VOLUME = 0.1;
const AUDIO_SETTINGS_STORAGE_KEY = 'tron-audio-settings-v1';
const DEFAULT_AUDIO_SETTINGS = Object.freeze({
    music: true,
    sfx: true
});

export const AUDIO_CUES = Object.freeze({
    countdown: '/assets/audio/beep.mp3',
    countdownFinal: '/assets/audio/beep_high.mp3',
    roundStart: '/assets/audio/electric.mp3',
    elimination: '/assets/audio/elimination.mp3',
    victory: '/assets/audio/victory.mp3',
    defeat: '/assets/audio/defeat.mp3',
    powerup_appears: '/assets/audio/powerup_appears.mp3',
    powerup_ghost_activate: '/assets/audio/powerup_ghost_activate.mp3',
    powerup_ghost_deactivate: '/assets/audio/powerup_ghost_deactivate.mp3',
    powerup_freeze_activate: '/assets/audio/powerup_freeze_activate.mp3',
    powerup_freeze_deactivate: '/assets/audio/powerup_freeze_deactivate.mp3',
    powerup_trail_eraser_activate: '/assets/audio/powerup_trail_eraser_activate.mp3',
    powerup_trail_eraser_deactivate: '/assets/audio/powerup_trail_eraser_deactivate.mp3',
    powerup_trail_breaker_activate: '/assets/audio/powerup_trail_breaker_activate.mp3',
    powerup_trail_breaker_deactivate: '/assets/audio/powerup_trail_breaker_deactivate.mp3'
});

const MUSIC_TRACK_SOURCES = Object.freeze({
    // Lobby music file location: public/assets/audio/music/lobby.mp3
    lobby: '/assets/audio/music/lobby.mp3',

    // In-game music file location: public/assets/audio/music/game.mp3
    game: '/assets/audio/music/game.mp3'
});

let audioSettings = loadAudioSettings();
const sounds = createSoundRegistry();
const musicTracks = createMusicRegistry();
const audioSettingsListeners = new Set();
let lastCountdownValue = null;
let lastGameStatus = null;
let activeMusicScene = 'lobby';
let audioUnlocked = false;
const playedEliminations = new Set();

export function preloadAudio() {
    return Promise.all(
        [...Object.values(sounds), ...Object.values(musicTracks)]
            .map(sound => new Promise(resolve => {
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
    audioUnlocked = true;

    // Browsers allow background music only after the first user interaction.
    if (context?.state === 'suspended') {
        context.resume().finally(syncMusicPlayback);
        return;
    }

    syncMusicPlayback();
}

export function getAudioSettings() {
    return { ...audioSettings };
}

export function setAudioSetting(setting, enabled) {
    if (!(setting in DEFAULT_AUDIO_SETTINGS)) return;

    const nextValue = Boolean(enabled);
    if (audioSettings[setting] === nextValue) return;

    audioSettings = {
        ...audioSettings,
        [setting]: nextValue
    };
    saveAudioSettings();

    if (setting === 'music') {
        syncMusicPlayback();
    } else if (!nextValue) {
        stopSoundEffects();
    }

    const settingsSnapshot = getAudioSettings();
    audioSettingsListeners.forEach(listener => listener(settingsSnapshot));
}

export function subscribeAudioSettings(listener) {
    audioSettingsListeners.add(listener);
    listener(getAudioSettings());

    return () => audioSettingsListeners.delete(listener);
}

export function handleGameAudio(gameState, previousState, currentPlayerId) {
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
                format: ['mp3'],
                preload: true,
                volume: getCueVolume(name)
            })
        ])
    );
}

function createMusicRegistry() {
    const Howl = window.Howl;
    if (!Howl) return {};

    return Object.fromEntries(
        Object.entries(MUSIC_TRACK_SOURCES)
            .filter(([, src]) => Boolean(src))
            .map(([name, src]) => [
                name,
                new Howl({
                    src: [src],
                    format: ['mp3'],
                    loop: true,
                    preload: true,
                    volume: MUSIC_VOLUME
                })
            ])
    );
}

function playSound(name, { rate = 1 } = {}) {
    if (!audioSettings.sfx) return;

    const sound = sounds[name];
    if (!sound) return;

    const soundId = sound.play();
    sound.rate(rate, soundId);
}

function updateMusicScene(gameStatus) {
    // Countdown, active play, pause and results all use the in-game track.
    const nextScene = gameStatus === 'LOBBY' ? 'lobby' : 'game';
    if (nextScene === activeMusicScene) return;

    Object.values(musicTracks).forEach(track => track.stop());
    activeMusicScene = nextScene;
    syncMusicPlayback();
}

function syncMusicPlayback() {
    const activeTrack = musicTracks[activeMusicScene];

    Object.entries(musicTracks).forEach(([scene, track]) => {
        if (scene !== activeMusicScene && track.playing()) {
            track.stop();
        }
    });

    if (!activeTrack) return;

    if (!audioSettings.music || !audioUnlocked) {
        if (activeTrack.playing()) activeTrack.pause();
        return;
    }

    if (!activeTrack.playing()) activeTrack.play();
}

function stopSoundEffects() {
    Object.values(sounds).forEach(sound => sound.stop());
}

function loadAudioSettings() {
    try {
        const storedSettings = JSON.parse(
            localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY)
        );

        return {
            music: storedSettings?.music !== false,
            sfx: storedSettings?.sfx !== false
        };
    } catch {
        return { ...DEFAULT_AUDIO_SETTINGS };
    }
}

function saveAudioSettings() {
    try {
        localStorage.setItem(
            AUDIO_SETTINGS_STORAGE_KEY,
            JSON.stringify(audioSettings)
        );
    } catch {
        // Audio controls still work for this session when storage is unavailable.
    }
}

function getCueVolume(name) {
    if (name === 'victory' || name === 'defeat') return 0.60;
    if (name === 'roundStart') return 0.54;
    if (name === 'elimination') return 0.49;
    return 0.60;
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
