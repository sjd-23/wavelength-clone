import { Game } from './game.js';

export function initMenu() {
    const localBtn = document.getElementById('local-2p-btn');

    localBtn.addEventListener('click', () => {
        startLocalGame();
    });
}

function startLocalGame() {
    const mainMenu = document.querySelector('.main-menu');
    mainMenu.style.display = 'none';

    const game = new Game();
    game.start();
}