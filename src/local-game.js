import { Dial } from './dial.js';
import { getRandomPrompt } from '../shared/prompts.js';
import { GAME_SETTINGS } from '../shared/game-constants.js';
import { calculateScore, clampScore } from '../shared/game-logic.js';
import { getTwoDistinctColors, getAvailableColor } from '../shared/color-utils.js';
import { showMenu } from './menu.js';

export class Game {
    constructor() {
        this.currentPlayer = 1;
        this.score = { player1: 0, player2: 0 };
        this.gameContainer = document.getElementById('game');
        this.currentPrompt = null;
        this.player1Name = 'Player 1';
        this.player2Name = 'Player 2';
        this.winScore = GAME_SETTINGS.DEFAULT_WIN_SCORE;
        this.currentRound = 1;

        this.player1Color = getAvailableColor([]);
        this.player2Color = getAvailableColor([this.player1Color]);
    }

    start() {
        this.renderSetupScreen();
    }

    renderSetupScreen() {
        const gameScreen = document.querySelector('.game-screen');
        const endScreen = document.querySelector('.end-screen');
        const setupScreen = document.querySelector('.setup-screen');

        if (gameScreen) gameScreen.remove();
        if (endScreen) endScreen.remove();
        if (setupScreen) setupScreen.remove();

        const newSetupScreen = document.createElement('div');
        newSetupScreen.className = 'setup-screen';
        newSetupScreen.innerHTML = `
        <div class="setup-content">
                <h1>Game Setup</h1>
                
                <div class="madlib-text">
                    <p>Player 1 is called <input type="text" id="player1-name" placeholder="Player 1" maxlength="15"></p>
                    <p>Player 2 is called <input type="text" id="player2-name" placeholder="Player 2" maxlength="15"></p>
                    <p>Playing to <input type="number" id="win-score" value="${GAME_SETTINGS.DEFAULT_WIN_SCORE}" min="${GAME_SETTINGS.MIN_WIN_SCORE}" max="${GAME_SETTINGS.MAX_WIN_SCORE}"> points</p>
                </div>
                
                <div class="lobby-buttons">
                    <button id="back-btn" class="game-btn">Back</button>
                    <button id="start-game-btn" class="game-btn">Begin Game</button>
                </div>
            </div>
        `;

        this.gameContainer.appendChild(newSetupScreen);

        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.player1Name = document.getElementById('player1-name').value.trim() || 'Player 1';
            this.player2Name = document.getElementById('player2-name').value.trim() || 'Player 2';
            const winScore = parseInt(document.getElementById('win-score').value) || GAME_SETTINGS.DEFAULT_WIN_SCORE;
            this.winScore = clampScore(winScore, GAME_SETTINGS.MIN_WIN_SCORE, GAME_SETTINGS.MAX_WIN_SCORE);

            this.renderGameScreen();
        });

        document.getElementById('back-btn').onclick = () => {
            this.exitToMenu();
        };
    }

    exitToMenu() {
        const setupScreen = document.querySelector('.setup-screen');
        const gameScreen = document.querySelector('.game-screen');
        const endScreen = document.querySelector('.end-screen');

        if (setupScreen) setupScreen.remove();
        if (gameScreen) gameScreen.remove();
        if (endScreen) endScreen.remove();

        showMenu();

        this.score = { player1: 0, player2: 0 };
        this.currentPlayer = 1;
        this.currentRound = 1;
    }

    renderGameScreen() {
        const setupScreen = document.querySelector('.setup-screen');
        const endScreen = document.querySelector('.end-screen');
        const gameScreen = document.querySelector('.game-screen');

        if (setupScreen) setupScreen.remove();
        if (endScreen) endScreen.remove();
        if (gameScreen) gameScreen.remove();

        const newGameScreen = document.createElement('div');
        newGameScreen.className = 'game-screen';

        const currentPlayerColor = this.currentPlayer === 1 ? this.player1Color : this.player2Color;
        newGameScreen.innerHTML = `
            <div class="game-content">
                <div id="dial-container"></div>
                <div id="prompt-display" class="prompt-display">
                    <span class="prompt-left">?</span>
                    <span class="prompt-right">?</span>
                </div>
            </div>
            <div class="left-panel">
                <div id="phase-indicator" class="phase-indicator">
                    <div class="phase-title">Psychic Phase</div>
                    <div class="phase-subtitle"><span style="background-color: ${currentPlayerColor}; padding: 1px 6px; border-radius: 3px; color: white; font-weight: 700; font-size: 14px;">${this.getCurrentPlayerName()}</span> is up!</div>
                </div>
                <button id="start-round-btn" class="game-btn">Reveal Board</button>
                <div class="scoreboard">
                    <h2>Round ${this.currentRound}</h2>
                    <div class="score-item" data-player="1">
                        <span class="player-name" style="background-color: ${this.player1Color}; padding: 2px 6px; border-radius: 3px; color: white;">${this.player1Name}</span>
                        <span class="player-score">${this.score.player1}</span>
                    </div>
                    <div class="score-item" data-player="2">
                        <span class="player-name" style="background-color: ${this.player2Color}; padding: 2px 6px; border-radius: 3px; color: white;">${this.player2Name}</span>
                        <span class="player-score">${this.score.player2}</span>
                    </div>
                </div>
            </div>
        `;

        this.gameContainer.appendChild(newGameScreen);

        const dial = new Dial(document.getElementById('dial-container'));
        dial.render();

        this.currentPrompt = getRandomPrompt();
        dial.randomizeTarget();

        this.setupRoundHandlers(dial);
    }

    setupRoundHandlers(dial) {
        const startBtn = document.getElementById('start-round-btn');

        dial.lock();

        const setupPsychicPhase = () => {
            this.updatePromptDisplay(this.currentPrompt);
            setTimeout(() => dial.hideCover(), 100);

            startBtn.textContent = 'Cover Board';
            startBtn.onclick = () => this.setupGuessingPhase(dial, startBtn);
        };

        startBtn.onclick = setupPsychicPhase;
    }

    setupGuessingPhase(dial, startBtn) {
        const opponentColor = this.currentPlayer === 1 ? this.player2Color : this.player1Color;
        this.updatePhaseDisplay('Team Phase', `<span style="background-color: ${opponentColor}; padding: 1px 6px; border-radius: 3px; color: white; font-weight: 700; font-size: 14px;">${this.getOpponentName()}</span> is up!`);

        dial.showCover();
        dial.unlock();
        startBtn.textContent = 'Lock Guess';
        startBtn.onclick = () => this.handleGuessLock(dial, startBtn);
    }

    handleGuessLock(dial, startBtn) {
        setTimeout(() => dial.hideCover(), 100);
        dial.lock();

        const points = calculateScore(dial.angle, dial.targetAngle);
        this.updateScore(points);

        startBtn.textContent = `Continue...`;
        startBtn.onclick = () => this.handleNextRound(dial, startBtn);
    }

    handleNextRound(dial, startBtn) {
        const winner = this.checkWinner();
        if (winner) {
            this.renderEndScreen(winner);
            return;
        }

        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.currentRound++;
        this.resetPromptDisplay();

        setTimeout(() => dial.showCover(), 100);
        dial.angle = GAME_SETTINGS.DEFAULT_DIAL_ANGLE;

        this.currentPrompt = getRandomPrompt();

        setTimeout(() => {
            dial.randomizeTarget();
            dial.lock();
        }, 400);

        startBtn.textContent = 'Uncover Board';

        const setupPsychicPhase = () => {
            this.updatePromptDisplay(this.currentPrompt);
            setTimeout(() => dial.hideCover(), 100);
            startBtn.textContent = 'Cover Board';
            startBtn.onclick = () => this.setupGuessingPhase(dial, startBtn);
        };

        startBtn.onclick = setupPsychicPhase;

        this.updateScoreboardRound();

        const currentPlayerColor = this.currentPlayer === 1 ? this.player1Color : this.player2Color;
        const phaseIndicator = document.getElementById('phase-indicator');
        const phaseTitle = phaseIndicator.querySelector('.phase-title');
        const phaseSubtitle = phaseIndicator.querySelector('.phase-subtitle');
        phaseTitle.textContent = 'Psychic Phase';
        phaseSubtitle.innerHTML = `<span style="background-color: ${currentPlayerColor}; padding: 1px 6px; border-radius: 3px; color: white; font-weight: 700; font-size: 14px;">${this.getCurrentPlayerName()}</span> is up!`;
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

        this.showScoreNotification(points);
    }

    showScoreNotification(points) {
        const colorMap = {
            0: '#ffffff',
            2: '#feca57',
            3: '#ff9f43',
            4: '#45b7d1'
        };

        const notification = document.createElement('div');
        notification.className = 'score-notification';
        notification.style.backgroundColor = colorMap[points] || '#ffffff';
        notification.innerHTML = `<span class="score-points">+${points} point${points !== 1 ? 's' : ''}</span>`;

        const scoreboard = document.querySelector('.scoreboard');
        scoreboard.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    updateScoreboardRound() {
        const scoreboard = document.querySelector('.scoreboard');
        const roundHeader = scoreboard.querySelector('h2');
        if (roundHeader) {
            roundHeader.textContent = `Round ${this.currentRound}`;
        }
    }

    updatePhaseDisplay(title, subtitle) {
        const phaseIndicator = document.getElementById('phase-indicator');
        phaseIndicator.querySelector('.phase-title').textContent = title;
        phaseIndicator.querySelector('.phase-subtitle').innerHTML = subtitle;
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

    renderEndScreen(winner) {
        const setupScreen = document.querySelector('.setup-screen');
        const gameScreen = document.querySelector('.game-screen');
        const endScreen = document.querySelector('.end-screen');

        if (setupScreen) setupScreen.remove();
        if (gameScreen) gameScreen.remove();
        if (endScreen) endScreen.remove();

        const newEndScreen = document.createElement('div');
        newEndScreen.className = 'end-screen';
        newEndScreen.innerHTML = `
            <div class="end-content">
                <h1>Game Over, <span class="winner-name">${winner}</span> Wins!</h1>
                <div class="final-scores">
                    <div class="final-score-item">
                        <span style="background-color: ${this.player1Color}; padding: 2px 6px; border-radius: 3px; color: white;">${this.player1Name}</span>
                        <span>${this.score.player1} points</span>
                    </div>
                    <div class="final-score-item">
                        <span style="background-color: ${this.player2Color}; padding: 2px 6px; border-radius: 3px; color: white;">${this.player2Name}</span>
                        <span>${this.score.player2} points</span>
                    </div>
                </div>
                <div class="end-buttons">
                    <button id="play-again-btn" class="game-btn">Play Again</button>
                    <button id="exit-btn" class="game-btn">Exit to Menu</button>
                </div>
            </div>
        `;

        this.gameContainer.appendChild(newEndScreen);

        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.score = { player1: 0, player2: 0 };
            this.currentPlayer = 1;
            this.currentRound = 1;
            this.renderGameScreen();
        });

        document.getElementById('exit-btn').addEventListener('click', () => {
            this.exitToMenu();
        });
    }
}