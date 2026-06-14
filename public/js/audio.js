/**
 * Public audio API. Implementation details live in the audio/ directory.
 */
export { AUDIO_CUES } from './audio/audioConfig.js';
export {
    getAudioSettings,
    subscribeAudioSettings
} from './audio/audioSettings.js';
export {
    preloadAudio,
    setAudioSetting,
    unlockAudio
} from './audio/audioPlayer.js';
export {
    handleGameAudio,
    playCountdownCue,
    playEliminationCue,
    playPowerUpCue,
    playVictoryCue,
    resetCountdownAudio
} from './audio/gameAudio.js';
