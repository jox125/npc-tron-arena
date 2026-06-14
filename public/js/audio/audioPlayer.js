import {
    AUDIO_CUES,
    MUSIC_TRACK_SOURCES,
    MUSIC_VOLUME
} from './audioConfig.js';
import {
    getAudioSettings,
    updateAudioSetting
} from './audioSettings.js';

const sounds = createSoundRegistry();
const musicTracks = createMusicRegistry();

let activeMusicScene = 'lobby';
let audioUnlocked = false;

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

    // Browsers allow background music only after the first interaction.
    if (context?.state === 'suspended') {
        context.resume().finally(syncMusicPlayback);
        return;
    }

    syncMusicPlayback();
}

export function setAudioSetting(setting, enabled) {
    const changed = updateAudioSetting(setting, enabled);
    if (!changed) return;

    if (setting === 'music') {
        syncMusicPlayback();
    } else if (!enabled) {
        stopSoundEffects();
    }
}

export function playSound(name, { rate = 1 } = {}) {
    if (!getAudioSettings().sfx) return;

    const sound = sounds[name];
    if (!sound) return;

    const soundId = sound.play();
    sound.rate(rate, soundId);
}

export function updateMusicScene(gameStatus) {
    const nextScene = getMusicScene(gameStatus);
    if (nextScene === activeMusicScene) return;

    Object.values(musicTracks).forEach(track => track.stop());
    activeMusicScene = nextScene;
    syncMusicPlayback();
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
        Object.entries(MUSIC_TRACK_SOURCES).map(([name, src]) => [
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

function getMusicScene(gameStatus) {
    if (gameStatus === 'PLAYING' || gameStatus === 'PAUSED') {
        return 'game';
    }
    if (gameStatus === 'LOBBY') return 'lobby';

    // Countdown and results intentionally have no background track.
    return null;
}

function syncMusicPlayback() {
    const activeTrack = musicTracks[activeMusicScene];

    Object.entries(musicTracks).forEach(([scene, track]) => {
        if (scene !== activeMusicScene && track.playing()) {
            track.stop();
        }
    });

    if (!activeTrack) return;

    if (!getAudioSettings().music || !audioUnlocked) {
        if (activeTrack.playing()) activeTrack.pause();
        return;
    }

    if (!activeTrack.playing()) activeTrack.play();
}

function stopSoundEffects() {
    Object.values(sounds).forEach(sound => sound.stop());
}

function getCueVolume(name) {
    if (name === 'victory' || name === 'defeat') return 0.60;
    if (name === 'cycleRide') return 0.54;
    if (name === 'elimination') return 0.49;
    return 0.60;
}
