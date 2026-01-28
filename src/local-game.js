import { Dial } from './dial.js';
import { getRandomPrompt } from '../shared/prompts.js';
import { GAME_SETTINGS } from '../shared/game-constants.js';
import { calculateScore, clampScore } from '../shared/game-logic.js';
import { getTwoDistinctColors } from '../shared/color-utils.js';

export class Game {
    constructor() {
        this.currentPlayer = 1;
        this.score = { player1: 0, player2: 0 };
        this.gameContainer = document.getElementById('game');
        this.currentPrompt = null;
        this.player1Name = 'Player 1';
        this.player2Name = 'Player 2';
        this.winScore = GAME_SETTINGS.DEFAULT_WIN_SCORE;
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
                <h1>Game Configuration</h1>
                
                <div class="madlib-text">
                    <p>Playing <strong>Local Two Player</strong> mode</p>
                    <p>Player 1 is called <input type="text" id="player1-name" placeholder="Player 1" maxlength="15"></p>
                    <p>Player 2 is called <input type="text" id="player2-name" placeholder="Player 2" maxlength="15"></p>
                    <p>Playing to <input type="number" id="win-score" value="${GAME_SETTINGS.DEFAULT_WIN_SCORE}" min="${GAME_SETTINGS.MIN_WIN_SCORE}" max="${GAME_SETTINGS.MAX_WIN_SCORE}"> points</p>
                </div>
                
                <button id="start-game-btn" class="game-btn">Start Game</button>
            </div>
        `;

        this.gameContainer.appendChild(setupScreen);

        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.player1Name = document.getElementById('player1-name').value.trim() || 'Player 1';
            this.player2Name = document.getElementById('player2-name').value.trim() || 'Player 2';
            const winScore = parseInt(document.getElementById('win-score').value) || GAME_SETTINGS.DEFAULT_WIN_SCORE;
            this.winScore = clampScore(winScore, GAME_SETTINGS.MIN_WIN_SCORE, GAME_SETTINGS.MAX_WIN_SCORE);

            this.renderGameScreen();
        });
    }

    renderGameScreen() {
        this.gameContainer.innerHTML = '';

        const gameScreen = document.createElement('div');
        gameScreen.className = 'game-screen';
        gameScreen.innerHTML = `
            <div class="game-content">
                <div id="phase-indicator" class="phase-indicator">
                    <div class="phase-title">Psychic Phase</div>
                    <div class="phase-subtitle">${this.getCurrentPlayerName()}'s turn!</div>
                </div>
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

        const dial = new Dial(document.getElementById('dial-container'));
        dial.render();

        this.setupRoundHandlers(dial);
        this.updatePsychicIndicator();
    }

    setupRoundHandlers(dial) {
        const startBtn = document.getElementById('start-round-btn');
        const promptDisplay = document.getElementById('prompt-display');
        const phaseIndicator = document.getElementById('phase-indicator');

        const setupPsychicPhase = () => {
            this.updatePhaseDisplay('Psychic Phase', `${this.getCurrentPlayerName()}'s turn!`);
            this.updatePsychicIndicator();

            this.currentPrompt = getRandomPrompt();
            this.updatePromptDisplay(this.currentPrompt);

            dial.randomizeTarget();
            dial.render();
            setTimeout(() => dial.hideCover(), 100);

            startBtn.textContent = 'Cover and begin!';
            startBtn.onclick = () => this.setupGuessingPhase(dial, startBtn);
        };

        startBtn.onclick = setupPsychicPhase;
    }

    setupGuessingPhase(dial, startBtn) {
        this.updatePhaseDisplay('Team Phase', `${this.getOpponentName()}'s turn!`);

        dial.showCover();
        startBtn.textContent = 'Lock guess!';
        startBtn.onclick = () => this.handleGuessLock(dial, startBtn);
    }

    handleGuessLock(dial, startBtn) {
        setTimeout(() => dial.hideCover(), 100);
        dial.lock();

        const points = calculateScore(dial.angle, dial.targetAngle);
        this.updateScore(points);

        startBtn.textContent = `${points} Points! Click for Next Round`;
        startBtn.onclick = () => this.handleNextRound(dial, startBtn);
    }

    handleNextRound(dial, startBtn) {
        const winner = this.checkWinner();
        if (winner) {
            this.renderEndScreen(winner);
            return;
        }

        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.resetPromptDisplay();

        setTimeout(() => dial.showCover(), 100);
        dial.angle = GAME_SETTINGS.DEFAULT_DIAL_ANGLE;
        dial.unlock();
        dial.render();

        startBtn.textContent = 'Uncover board!';
        startBtn.onclick = () => this.setupRoundHandlers(dial);

        const phaseIndicator = document.getElementById('phase-indicator');
        const phaseTitle = phaseIndicator.querySelector('.phase-title');
        const phaseSubtitle = phaseIndicator.querySelector('.phase-subtitle');
        phaseTitle.textContent = 'Psychic Phase';
        phaseSubtitle.textContent = `${this.getCurrentPlayerName()}'s turn!`;
        this.updatePsychicIndicator();
    }

    updateScore(points) {
        if (this.currentPlayer === 1) {
            this.score.player1 += points;
        } else {
            this.score.player2 += points;
        }

        const scoreItems = document.querySelectorAll('.score-item');
        scoreItems[0].querySelector('.player-score').textContent = this.score.player1;
        scoreItems[1].querySelector('.player-score').textContent = this.score.player2;
    }

    updatePhaseDisplay(title, subtitle) {
        const phaseIndicator = document.getElementById('phase-indicator');
        phaseIndicator.querySelector('.phase-title').textContent = title;
        phaseIndicator.querySelector('.phase-subtitle').textContent = subtitle;
    }

    updatePromptDisplay(prompt) {
        const promptDisplay = document.getElementById('prompt-display');
        promptDisplay.querySelector('.prompt-left').textContent = prompt.left;
        promptDisplay.querySelector('.prompt-right').textContent = prompt.right;

        const { color1, color2 } = getTwoDistinctColors();
        promptDisplay.style.background = `linear-gradient(90deg, ${color1}, ${color2})`;
    }

    resetPromptDisplay() {
        const promptDisplay = document.getElementById('prompt-display');
        promptDisplay.querySelector('.prompt-left').textContent = '?';
        promptDisplay.querySelector('.prompt-right').textContent = '?';
        promptDisplay.style.background = 'white';
    }

    getCurrentPlayerName() {
        return this.currentPlayer === 1 ? this.player1Name : this.player2Name;
    }

    getOpponentName() {
        return this.currentPlayer === 1 ? this.player2Name : this.player1Name;
    }

    checkWinner() {
        if (this.score.player1 >= this.winScore) return this.player1Name;
        if (this.score.player2 >= this.winScore) return this.player2Name;
        return null;
    }

    updatePsychicIndicator() {
        const scoreItems = document.querySelectorAll('.score-item');
        scoreItems.forEach((item, index) => {
            const playerName = item.querySelector('.player-name');
            playerName.style.color = (index + 1 === this.currentPlayer) ? '#ff6b6b' : '#00165c';
        });
    }

    renderEndScreen(winner) {
        this.gameContainer.innerHTML = '';

        const endScreen = document.createElement('div');
        endScreen.className = 'end-screen';
        endScreen.innerHTML = `
            <div class="end-content">
                <h1>Game Over, <span class="winner-name">${winner}</span> Wins!</h1>
                <div class="final-scores">
                    <div class="final-score-item">
                        <span>${this.player1Name}</span>
                        <span>${this.score.player1} points</span>
                    </div>
                    <div class="final-score-item">
                        <span>${this.player2Name}</span>
                        <span>${this.score.player2} points</span>
                    </div>
                </div>
                <div class="end-buttons">
                    <button id="play-again-btn" class="game-btn">Play Again</button>
                    <button id="exit-btn" class="game-btn">Exit to Menu</button>
                </div>
            </div>
        `;

        this.gameContainer.appendChild(endScreen);

        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.score = { player1: 0, player2: 0 };
            this.currentPlayer = 1;
            this.renderGameScreen();
        });

        document.getElementById('exit-btn').addEventListener('click', () => {
            location.reload();
        });
    }
}
