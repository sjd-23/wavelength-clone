import { Dial } from './dial.js';
import { getRandomPrompt } from './prompts.js';

export class Game {
    constructor() {
        this.currentPlayer = 1;
        this.score = { player1: 0, player2: 0 };
        this.gameContainer = document.getElementById('game');
        this.currentPrompt = null;
        this.player1Name = 'Player 1';
        this.player2Name = 'Player 2';
        this.winScore = 10;
    }

    start() {
        this.renderSetupScreen();
    }

    renderSetupScreen() {
        this.gameContainer.innerHTML = '';

        const setupScreen = document.createElement('div');
        setupScreen.className = 'setup-screen';
        setupScreen.innerHTML = `
        <div class="setup-content">
                <h1>Game Setup</h1>
                
                <div class="setup-section">
                    <label for="player1-name">Player 1 Name:</label>
                    <input type="text" id="player1-name" placeholder="Player 1" maxlength="15">
                </div>
                
                <div class="setup-section">
                    <label for="player2-name">Player 2 Name:</label>
                    <input type="text" id="player2-name" placeholder="Player 2" maxlength="15">
                </div>
                
                <div class="setup-section">
                    <label for="win-score">Play to:</label>
                    <input type="number" id="win-score" placeholder="10" min="1" max="100" value="10">
                </div>
                
                <button id="start-game-btn" class="game-btn">Start Game</button>
            </div>
        `;

        this.gameContainer.appendChild(setupScreen);

        document.getElementById('start-game-btn').addEventListener('click', () => {
            const player1Name = document.getElementById('player1-name').value.trim() || 'Player 1';
            const player2Name = document.getElementById('player2-name').value.trim() || 'Player 2';
            const winScore = parseInt(document.getElementById('win-score').value) || 10;

            this.player1Name = player1Name;
            this.player2Name = player2Name;
            this.winScore = Math.max(1, Math.min(100, winScore));

            this.renderGameScreen();
        });
    }

    renderGameScreen() {
        this.gameContainer.innerHTML = '';

        const gameScreen = document.createElement('div');
        gameScreen.className = 'game-screen';
        gameScreen.innerHTML = `
            <div class="game-content">
                <div id="phase-indicator" class="phase-indicator">Psychic Phase</div>
                <button id="start-round-btn" class="game-btn">Uncover board!</button>
                <div id="dial-container"></div>
                <div id="prompt-display" class="prompt-display">
                    <span class="prompt-left">?</span>
                    <span class="prompt-right">?</span>
                </div>
            </div>
            <div class="scoreboard">
                <h2>Scoreboard</h2>
                <div class="score-item" data-player="1">
                    <span class="player-name">${this.player1Name}</span>
                    <span class="player-score">${this.score.player1}</span>
                </div>
                <div class="score-item" data-player="2">
                    <span class="player-name">${this.player2Name}</span>
                    <span class="player-score">${this.score.player2}</span>
                </div>
            </div>
        `;

        this.gameContainer.appendChild(gameScreen);

        const dialContainer = document.getElementById('dial-container');
        const dial = new Dial(dialContainer);
        dial.render();

        const startBtn = document.getElementById('start-round-btn');
        const promptDisplay = document.getElementById('prompt-display');
        const promptLeft = promptDisplay.querySelector('.prompt-left');
        const promptRight = promptDisplay.querySelector('.prompt-right');
        const phaseIndicator = document.getElementById('phase-indicator');

        this.updatePsychicIndicator();

        const setupRound = () => {
            phaseIndicator.textContent = 'Psychic Phase';
            this.updatePsychicIndicator();

            this.currentPrompt = getRandomPrompt();
            promptLeft.textContent = this.currentPrompt.left;
            promptRight.textContent = this.currentPrompt.right;

            const { color1, color2 } = this.getTwoDistinctColors();
            promptDisplay.style.background = `linear-gradient(90deg, ${color1}, ${color2})`;

            dial.randomizeTarget();
            dial.render();

            setTimeout(() => {
                dial.hideCover();
            }, 100);

            startBtn.textContent = 'Cover and begin!';
            startBtn.onclick = () => {
                phaseIndicator.textContent = 'Team Phase';

                dial.showCover();
                startBtn.textContent = 'Lock guess!';
                startBtn.onclick = () => {
                    setTimeout(() => {
                        dial.hideCover();
                    }, 100);
                    dial.lock();

                    const guessAngle = dial.angle;
                    const targetAngle = dial.targetAngle;
                    const difference = Math.abs(guessAngle - targetAngle);

                    let points = 0;
                    if (difference <= 2) points = 4;
                    else if (difference <= 6) points = 3;
                    else if (difference <= 10) points = 2;

                    if (this.currentPlayer === 1) {
                        this.score.player1 += points;
                    } else {
                        this.score.player2 += points;
                    }

                    const scoreItems = document.querySelectorAll('.score-item');
                    scoreItems[0].querySelector('.player-score').textContent = this.score.player1;
                    scoreItems[1].querySelector('.player-score').textContent = this.score.player2;

                    startBtn.textContent = `${points} Points! Click for Next Round`;
                    startBtn.onclick = () => {
                        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;

                        promptLeft.textContent = '?';
                        promptRight.textContent = '?';
                        promptDisplay.style.background = 'white';

                        setTimeout(() => {
                            dial.showCover();
                        }, 100);

                        dial.angle = 90;
                        dial.unlock();
                        dial.render();
                        startBtn.textContent = 'Uncover board!';
                        startBtn.onclick = setupRound;
                    };
                };
            };
        };

        startBtn.onclick = setupRound;
    }

    getRandomColor() {
        const colors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731',
            '#5f27cd', '#00d2d3', '#ff9ff3', '#54a0ff',
            '#48dbfb', '#1dd1a1', '#feca57', '#ff6348',
            '#ff7a18', '#ffb347',
            '#32ff7e', '#18dcff',
            '#7d5fff', '#c56cf0',
            '#ff4757', '#ffa502',
            '#70a1ff', '#5352ed',
            '#2ed573', '#7bed9f',
            '#ff6f91', '#ff9671',
            '#1e90ff', '#00a8ff',
            '#f368e0', '#ee5253',
            '#10ac84', '#01a3a4',
            '#ff9f43',
            '#341f97',
            '#0abde3'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    colorDistance(color1, color2) {
        const rgb1 = this.hexToRgb(color1);
        const rgb2 = this.hexToRgb(color2);

        return Math.sqrt(
            Math.pow(rgb1.r - rgb2.r, 2) +
            Math.pow(rgb1.g - rgb2.g, 2) +
            Math.pow(rgb1.b - rgb2.b, 2)
        );
    }

    getTwoDistinctColors() {
        let color1 = this.getRandomColor();
        let color2 = this.getRandomColor();

        while (this.colorDistance(color1, color2) < 150) {
            color2 = this.getRandomColor();
        }

        return { color1, color2 };
    }

    updatePsychicIndicator() {
        const scoreItems = document.querySelectorAll('.score-item');
        scoreItems.forEach((item, index) => {
            const playerName = item.querySelector('.player-name');
            if (index + 1 === this.currentPlayer) {
                playerName.style.color = '#ff6b6b';
            } else {
                playerName.style.color = '#00165c';
            }
        });
    }
}