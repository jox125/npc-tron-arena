import { registerControls } from './client/controls.js';
import { registerSocketEvents } from './client/socketEvents.js';
import { startInput } from './input.js';
import { startLoop } from './renderer.js';

// Socket.IO's browser bundle exposes the io() factory globally.
const socket = io();

registerControls(socket);
registerSocketEvents(socket);
startInput(socket);
startLoop();
