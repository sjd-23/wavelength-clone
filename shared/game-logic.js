import { SCORING } from './game-constants.js';

export function calculateScore(guessAngle, targetAngle) {
    const difference = Math.abs(guessAngle - targetAngle);

    if (difference <= SCORING.EXACT.threshold) {
        return SCORING.EXACT.points;
    }
    if (difference <= SCORING.CLOSE.threshold) {
        return SCORING.CLOSE.points;
    }
    if (difference <= SCORING.NEAR.threshold) {
        return SCORING.NEAR.points;
    }
    return SCORING.DEFAULT.points;
}

export function getNextPsychicIndex(players, currentPsychicIndex, lastPsychicPerTeam = {}) {
    const currentPsychic = players[currentPsychicIndex];
    const oppositeTeam = currentPsychic.team === 1 ? 2 : 1;

    const oppositeTeamIndices = players
        .map((player, index) => ({ player, index }))
        .filter(({ player }) => player.team === oppositeTeam)
        .map(({ index }) => index);

    if (oppositeTeamIndices.length === 0) {
        console.error('getNextPsychicIndex: No players on opposite team!');
        return -1;
    }

    const lastPsychicOnOppositeTeam = lastPsychicPerTeam[oppositeTeam];

    if (lastPsychicOnOppositeTeam !== undefined && oppositeTeamIndices.length === 2) {
        const otherPlayer = oppositeTeamIndices.find(idx => idx !== lastPsychicOnOppositeTeam);
        if (otherPlayer !== undefined) {
            return otherPlayer;
        }
    }

    return oppositeTeamIndices[0];
}

export function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function clampScore(score, min, max) {
    return Math.max(min, Math.min(max, score));
}