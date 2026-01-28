import { Game } from './local-game.js';
import { OnlineGame } from './online-game.js';

export function initMenu() {
    const localBtn = document.getElementById('local-2p-btn');
    const onlineBtn = document.getElementById('online-4p-btn');

    localBtn.addEventListener('click', startLocalGame);
    onlineBtn.addEventListener('click', startOnlineGame);
}

function startLocalGame() {
    const mainMenu = document.querySelector('.main-menu');
    mainMenu.style.display = 'none';

    const game = new Game();
    game.start();
}

function startOnlineGame() {
    const mainMenu = document.querySelector('.main-menu');
    mainMenu.style.display = 'none';

    const onlineGame = new OnlineGame();
    onlineGame.start();
}
