export const COLORS = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731',
    '#5f27cd', '#00d2d3', '#ff9ff3', '#54a0ff',
    '#48dbfb', '#1dd1a1', '#feca57', '#ff6348',
    '#ff7a18', '#ffb347', '#32ff7e', '#18dcff',
    '#7d5fff', '#c56cf0', '#ff4757', '#ffa502',
    '#70a1ff', '#5352ed', '#2ed573', '#7bed9f',
    '#ff6f91', '#ff9671', '#1e90ff', '#00a8ff',
    '#f368e0', '#ee5253', '#10ac84', '#01a3a4',
    '#ff9f43', '#341f97', '#0abde3'
];

export const SCORING = {
    EXACT: { threshold: 2, points: 4 },
    CLOSE: { threshold: 6, points: 3 },
    NEAR: { threshold: 10, points: 2 },
    DEFAULT: { points: 0 }
};

export const GAME_SETTINGS = {
    MAX_PLAYERS: 4,
    TEAM_SIZE: 2,
    DEFAULT_WIN_SCORE: 10,
    MIN_WIN_SCORE: 1,
    MAX_WIN_SCORE: 100,
    DEFAULT_DIAL_ANGLE: 90,
    RECONNECT_GRACE_PERIOD: 30000,
    COLOR_DISTANCE_THRESHOLD: 150,
    MIN_COLOR_INDEX_DIFFERENCE: 3
};

export const PHASES = {
    PSYCHIC: 'psychic',
    REVEALED: 'revealed',
    GUESSING: 'guessing'
};
