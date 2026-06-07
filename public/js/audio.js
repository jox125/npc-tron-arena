let audioContext = null;
let lastCountdownValue = null;

function getAudioContext() {
    if (!audioContext) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;

        if (AudioContext) {
            audioContext = new AudioContext();
        }
    }

    return audioContext;
}

export function unlockAudio() {
    const context = getAudioContext();

    if (context?.state === 'suspended') {
        context.resume();
    }
}

function playTone(frequency, duration, volume, type = 'sine') {
    const context = getAudioContext();

    if (!context || context.state !== 'running') {
        return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startTime = context.currentTime;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
}

function playCycleLaunch() {
    const context = getAudioContext();

    if (!context || context.state !== 'running') {
        return;
    }

    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const startTime = context.currentTime;
    const duration = 1.5;

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(70, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(260, startTime + duration);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, startTime);
    filter.frequency.exponentialRampToValueAtTime(2200, startTime + duration);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.14, startTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
}

export function playCountdownCue(value) {
    if (value === lastCountdownValue) {
        return;
    }

    lastCountdownValue = value;

    if (value > 0) {
        playTone(value === 1 ? 880 : 620, value === 1 ? 0.3 : 0.16, 0.11);
        return;
    }

    playTone(1180, 0.55, 0.14, 'triangle');
    playCycleLaunch();
}

export function resetCountdownAudio() {
    lastCountdownValue = null;
}
