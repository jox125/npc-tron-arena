const audioToggleButtons =
    document.querySelectorAll('[data-audio-setting]');

/**
 * Keeps every audio toggle in sync with the shared persisted setting.
 */
export function updateAudioControls(settings) {
    audioToggleButtons.forEach(button => {
        const setting = button.dataset.audioSetting;
        const enabled = settings[setting] !== false;
        const stateLabel = button.querySelector('[data-audio-state]');

        button.setAttribute('aria-pressed', String(enabled));
        if (stateLabel) stateLabel.textContent = enabled ? 'On' : 'Off';
    });
}
