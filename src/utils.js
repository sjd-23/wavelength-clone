export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}