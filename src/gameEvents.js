import { EventEmitter } from 'node:events';

export const gameEvents = new EventEmitter();

export function emitPowerUpAudio(cue, details = {}) {
    gameEvents.emit('powerup-audio', {
        cue,
        ...details
    });
}
