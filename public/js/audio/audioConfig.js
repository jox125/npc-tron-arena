export const MUSIC_VOLUME = 0.1;
export const AUDIO_SETTINGS_STORAGE_KEY = 'tron-audio-settings-v1';

export const DEFAULT_AUDIO_SETTINGS = Object.freeze({
    music: true,
    sfx: true
});

export const AUDIO_CUES = Object.freeze({
    countdown: '/assets/audio/sfx/beep.mp3',
    countdownFinal: '/assets/audio/sfx/beep_high.mp3',
    cycleRide: '/assets/audio/sfx/electric.mp3',
    elimination: '/assets/audio/sfx/elimination.mp3',
    victory: '/assets/audio/sfx/victory.mp3',
    defeat: '/assets/audio/sfx/defeat.mp3',
    powerup_appears: '/assets/audio/sfx/powerup_appears.mp3',
    powerup_ghost_activate:
        '/assets/audio/sfx/powerup_ghost_activate.mp3',
    powerup_ghost_deactivate:
        '/assets/audio/sfx/powerup_ghost_deactivate.mp3',
    powerup_freeze_activate:
        '/assets/audio/sfx/powerup_freeze_activate.mp3',
    powerup_freeze_deactivate:
        '/assets/audio/sfx/powerup_freeze_deactivate.mp3',
    powerup_trail_eraser_activate:
        '/assets/audio/sfx/powerup_trail_eraser_activate.mp3',
    powerup_trail_breaker_activate:
        '/assets/audio/sfx/powerup_trail_breaker_activate.mp3',
    powerup_trail_breaker_deactivate:
        '/assets/audio/sfx/powerup_trail_breaker_deactivate.mp3'
});

export const POWER_UP_AUDIO_CUES = new Set([
    'powerup_appears',
    'powerup_ghost_activate',
    'powerup_ghost_deactivate',
    'powerup_freeze_activate',
    'powerup_freeze_deactivate',
    'powerup_trail_eraser_activate',
    'powerup_trail_breaker_activate',
    'powerup_trail_breaker_deactivate'
]);

export const MUSIC_TRACK_SOURCES = Object.freeze({
    lobby: '/assets/audio/music/lobby.mp3',
    game: '/assets/audio/music/game.mp3'
});
