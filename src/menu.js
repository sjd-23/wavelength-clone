import { Game } from './local-game.js';
import { OnlineGame } from './online-game.js';

export function initMenu() {
    const localBtn = document.getElementById('local-2p-btn');
    const onlineBtn = document.getElementById('online-4p-btn');

    localBtn.addEventListener('click', startLocalGame);
    onlineBtn.addEventListener('click', startOnlineGame);
}

export function showMenu() {
    const mainMenu = document.querySelector('.main-menu');
    if (mainMenu) {
        mainMenu.style.display = 'flex';
    }
}

export function hideMenu() {
    const mainMenu = document.querySelector('.main-menu');
    if (mainMenu) {
        mainMenu.style.display = 'none';
    }
}

function startLocalGame() {
    hideMenu();
    const game = new Game();
    game.start();
}

function startOnlineGame() {
    hideMenu();
    const onlineGame = new OnlineGame();
    onlineGame.start();
}