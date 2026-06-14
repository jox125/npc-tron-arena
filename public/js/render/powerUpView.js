import { POWER_UP_ICONS } from './renderConfig.js';

const arena = document.querySelector('#arena');
const powerUpElements = new Map();

export function renderPowerUps(gameState) {
    const activeIds = new Set(gameState.powerUps.map(powerUp => powerUp.id));

    gameState.powerUps.forEach(powerUp => {
        if (powerUpElements.has(powerUp.id)) return;

        const element = document.createElement('div');
        element.dataset.id = powerUp.id;
        element.classList.add('powerup');
        element.textContent = POWER_UP_ICONS[powerUp.type];
        element.style.cssText = `
            font-size: ${powerUp.radius * 2}px;
            left: ${powerUp.x}px;
            top: ${powerUp.y}px;
        `;

        arena.appendChild(element);
        powerUpElements.set(powerUp.id, element);
    });

    powerUpElements.forEach((_, id) => {
        if (!activeIds.has(id)) removePowerUp(id);
    });
}

export function cleanupPowerUps() {
    powerUpElements.forEach((_, id) => removePowerUp(id));
}

function removePowerUp(id) {
    powerUpElements.get(id)?.remove();
    powerUpElements.delete(id);
}
