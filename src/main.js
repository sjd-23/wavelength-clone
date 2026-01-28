import { initMenu } from './menu.js';
import { OnlineGame } from './online-game.js';

const url = new URL(window.location);
const roomCode = url.searchParams.get('room');

if (roomCode) {
    const mainMenu = document.querySelector('.main-menu');
    if (mainMenu) {
        mainMenu.style.display = 'none';
    }

    const onlineGame = new OnlineGame();
    onlineGame.start();
} else {
    initMenu();
}