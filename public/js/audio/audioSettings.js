import {
    AUDIO_SETTINGS_STORAGE_KEY,
    DEFAULT_AUDIO_SETTINGS
} from './audioConfig.js';

let audioSettings = loadAudioSettings();
const listeners = new Set();

export function getAudioSettings() {
    return { ...audioSettings };
}

/**
 * Updates persistent state. Playback side effects are handled by audioPlayer.
 */
export function updateAudioSetting(setting, enabled) {
    if (!(setting in DEFAULT_AUDIO_SETTINGS)) return false;

    const nextValue = Boolean(enabled);
    if (audioSettings[setting] === nextValue) return false;

    audioSettings = {
        ...audioSettings,
        [setting]: nextValue
    };
    saveAudioSettings();

    const snapshot = getAudioSettings();
    listeners.forEach(listener => listener(snapshot));
    return true;
}

export function subscribeAudioSettings(listener) {
    listeners.add(listener);
    listener(getAudioSettings());

    return () => listeners.delete(listener);
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
        // The controls remain usable for this tab when storage is unavailable.
    }
}
