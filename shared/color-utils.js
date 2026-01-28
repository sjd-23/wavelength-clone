import { COLORS, GAME_SETTINGS } from './game-constants.js';

export function getRandomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

export function colorDistance(color1, color2) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    if (!rgb1 || !rgb2) return 0;

    return Math.sqrt(
        Math.pow(rgb1.r - rgb2.r, 2) +
        Math.pow(rgb1.g - rgb2.g, 2) +
        Math.pow(rgb1.b - rgb2.b, 2)
    );
}

export function getTwoDistinctColors() {
    let color1 = getRandomColor();
    let color2 = getRandomColor();

    while (colorDistance(color1, color2) < GAME_SETTINGS.COLOR_DISTANCE_THRESHOLD) {
        color2 = getRandomColor();
    }

    return { color1, color2 };
}

export function getAvailableColor(usedColors) {
    const available = COLORS.filter(c => !usedColors.includes(c));
    
    if (available.length > 0) {
        return available[Math.floor(Math.random() * available.length)];
    }
    
    return getRandomColor();
}

export function generatePromptColors() {
    let color1 = getRandomColor();
    let color2 = getRandomColor();

    const color1Index = COLORS.indexOf(color1);
    const color2Index = COLORS.indexOf(color2);

    while (Math.abs(color1Index - color2Index) < GAME_SETTINGS.MIN_COLOR_INDEX_DIFFERENCE) {
        color2 = getRandomColor();
    }

    return { color1, color2 };
}
