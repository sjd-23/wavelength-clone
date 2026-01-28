import socketClient from './socket-client.js';
import { Dial } from './dial.js';
import { GAME_SETTINGS } from '../shared/game-constants.js';

export class OnlineGame {
    constructor() {
        this.gameContainer = document.getElementById('game');
        this.socket = socketClient.connect();
        this.roomCode = null;
        this.playerName = null;
        this.players = [];
        this.isHost = false;
        this.myTeam = null;
        this.gameState = null;

        this.setupSocketListeners();
    }

    setupSocketListeners() {
        this.socket.on('room_created', ({ roomCode, playerName, players }) => {
            this.roomCode = roomCode;
            this.playerName = playerName;
            this.isHost = true;
            this.players = players || [];

            this.saveSessionData(roomCode, playerName, 'lobby');
            this.updateURL();
            this.renderWaitingRoom();
        });

        this.socket.on('room_joined', ({ roomCode, playerName }) => {
            this.roomCode = roomCode;
            this.playerName = playerName;

            this.saveSessionData(roomCode, playerName, 'lobby');
            this.renderWaitingRoom();
        });

        this.socket.on('player_joined', ({ players }) => {
            this.players = players;
            this.updatePlayerList();
        });

        this.socket.on('player_ready_update', ({ players }) => {
            this.players = players;
            this.updatePlayerList();

            if (players.length === 4 &&
                players.every(p => p.ready && p.team)) {
                setTimeout(() => this.startCountdown(), 100);
            }
        });

        this.socket.on('team_changed', ({ players }) => {
            this.players = players;
            this.updatePlayerList();
        });

        this.socket.on('game_start', (gameState) => {
            sessionStorage.setItem('gameState', 'playing');
            // Small delay to let countdown finish displaying
            setTimeout(() => {
                this.startOnlineGame(gameState);
            }, 100);
        });

        this.socket.on('join_error', ({ message }) => {
            alert(message);
        });

        this.socket.on('player_left', ({ players }) => {
            this.players = players;
            this.updatePlayerList();
        });

        this.socket.on('player_unready_update', ({ players }) => {
            if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
                const countdownWrapper = document.getElementById('countdown-container-wrapper');
                if (countdownWrapper) {
                    countdownWrapper.style.display = 'none';
                }
            }

            this.players = players;
            this.updatePlayerList();
        });

        this.socket.on('game_state_restored', (gameState) => {
            this.gameState = gameState;
            this.renderOnlineGameScreen();
        });
    }

    saveSessionData(roomCode, playerName, gameState) {
        sessionStorage.setItem('roomCode', roomCode);
        sessionStorage.setItem('playerName', playerName);
        sessionStorage.setItem('gameState', gameState);
    }

    updateURL() {
        const url = new URL(window.location);
        url.searchParams.set('room', this.roomCode);
        window.history.pushState({}, '', url);
    }

    checkURLForRoom() {
        const url = new URL(window.location);
        return url.searchParams.get('room');
    }

    renderLobbyChoice() {
        const urlRoomCode = this.checkURLForRoom();

        this.gameContainer.innerHTML = '';

        const lobbyScreen = document.createElement('div');
        lobbyScreen.className = 'setup-screen';

        if (urlRoomCode) {
            lobbyScreen.innerHTML = `
                <div class="setup-content">
                    <h1>Join Room</h1>
                    
                    <div class="madlib-text">
                        <p>Your name is <input type="text" id="player-name-input" placeholder="Player" maxlength="15"></p>
                        <p>Room code is <strong>${urlRoomCode}</strong></p>
                    </div>
                    
                    <button id="submit-join-btn" class="game-btn">Join Room</button>
                    <button id="back-to-menu-btn" class="game-btn" style="margin-top: 10px;">Back to Menu</button>
                </div>
            `;

            this.gameContainer.appendChild(lobbyScreen);

            document.getElementById('submit-join-btn').onclick = () => {
                const playerName = document.getElementById('player-name-input').value.trim() || 'Player';
                this.socket.emit('join_room', { roomCode: urlRoomCode, playerName });
            };

            document.getElementById('back-to-menu-btn').onclick = () => {
                this.clearSessionAndReload();
            };

            return;
        }

        lobbyScreen.innerHTML = `
            <div class="setup-content">
                <h1>Online Multiplayer</h1>
                
                <div class="madlib-text">
                    <p>Your name is <input type="text" id="player-name-input" placeholder="Player" maxlength="15"></p>
                </div>
                
                <div class="lobby-buttons">
                    <button id="create-room-btn" class="game-btn">Create Room</button>
                    <button id="join-room-btn" class="game-btn">Join Room</button>
                </div>
                
                <button id="back-to-menu-btn" class="game-btn" style="margin-top: 20px;">Back to Menu</button>
            </div>
        `;

        this.gameContainer.appendChild(lobbyScreen);

        document.getElementById('create-room-btn').onclick = () => {
            const playerName = document.getElementById('player-name-input').value.trim() || 'Player';
            this.playerName = playerName;
            this.socket.emit('create_room', playerName);
        };

        document.getElementById('join-room-btn').onclick = () => {
            const playerName = document.getElementById('player-name-input').value.trim() || 'Player';
            this.playerName = playerName;
            this.showJoinScreen();
        };

        document.getElementById('back-to-menu-btn').onclick = () => {
            this.clearSessionAndReload();
        };
    }

    showJoinScreen() {
        this.gameContainer.innerHTML = '';

        const joinScreen = document.createElement('div');
        joinScreen.className = 'setup-screen';
        joinScreen.innerHTML = `
            <div class="setup-content">
                <h1>Join Room</h1>
                
                <div class="madlib-text">
                    <p>Room code is <input type="text" id="room-code-input" placeholder="ABCDEF" maxlength="6" style="text-transform: uppercase;"></p>
                </div>
                
                <button id="submit-join-btn" class="game-btn">Join Room</button>
                <button id="back-btn" class="game-btn" style="margin-top: 10px;">Back</button>
            </div>
        `;

        this.gameContainer.appendChild(joinScreen);

        document.getElementById('submit-join-btn').onclick = () => {
            const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();

            if (roomCode.length === 6) {
                this.socket.emit('join_room', { roomCode, playerName: this.playerName });
            } else {
                alert('Please enter a valid 6-character room code');
            }
        };

        document.getElementById('back-btn').onclick = () => {
            this.renderLobbyChoice();
        };
    }

    renderWaitingRoom() {
        this.gameContainer.innerHTML = '';

        const shareURL = `${window.location.origin}${window.location.pathname}?room=${this.roomCode}`;

        const waitingScreen = document.createElement('div');
        waitingScreen.className = 'setup-screen';
        waitingScreen.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
                <div id="countdown-container-wrapper" style="display: none; background: white; padding: 20px; box-shadow: 0 2px 8px rgba(0, 22, 92, 0.15); border: 3px solid #4ecdc4; min-width: 300px;">
                    <div id="countdown-container" style="text-align: center;"></div>
                </div>
                <div class="setup-content lobby-content">
                    <h1>Lobby</h1>
                    
                    <div class="compact-room-info">
                        <div class="room-code-compact">
                            Code: <span class="room-code">${this.roomCode}</span>
                        </div>
                        <button id="copy-link-btn" class="copy-btn">Copy Room Link</button>
                    </div>
                    
                    <div id="player-list"></div>
                </div>
            </div>
        `;

        this.gameContainer.appendChild(waitingScreen);

        document.getElementById('copy-link-btn').onclick = () => {
            navigator.clipboard.writeText(shareURL).then(() => {
                const btn = document.getElementById('copy-link-btn');
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            });
        };

        this.updatePlayerList();
    }

    updatePlayerList() {
        const playerList = document.getElementById('player-list');
        if (!playerList) return;

        const team1 = this.players.filter(p => p.team === 1);
        const team2 = this.players.filter(p => p.team === 2);
        const unassigned = this.players.filter(p => !p.team);

        const myPlayer = this.players.find(p => p.name === this.playerName);
        this.myTeam = myPlayer?.team;

        playerList.innerHTML = `
            <div class="teams-container">
                <div class="team-column">
                    <h3>Team 1 (${team1.length}/2)</h3>
                    <div class="team-players">
                        ${team1.map(p => `
                            <div class="player-card" style="background-color: ${p.color || '#f5f5f5'}">
                                <span>${p.name}${p.ready ? ' ✓' : ''}</span>
                                ${p.name === this.playerName ? '<button class="leave-team-btn" data-player="${p.name}">Leave Team</button>' : ''}
                            </div>
                        `).join('')}
                        ${team1.length < 2 && !this.myTeam ? `
                            <button class="join-team-btn" data-team="1">Join Team 1</button>
                        ` : ''}
                    </div>
                </div>
                
                <div class="team-column">
                    <h3>Team 2 (${team2.length}/2)</h3>
                    <div class="team-players">
                        ${team2.map(p => `
                            <div class="player-card" style="background-color: ${p.color || '#f5f5f5'}">
                                <span>${p.name}${p.ready ? ' ✓' : ''}</span>
                                ${p.name === this.playerName ? '<button class="leave-team-btn" data-player="${p.name}">Leave</button>' : ''}
                            </div>
                        `).join('')}
                        ${team2.length < 2 && !this.myTeam ? `
                            <button class="join-team-btn" data-team="2">Join Team 2</button>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            ${unassigned.length > 0 ? `
                <div class="unassigned-players">
                    <h4>Not on a team:</h4>
                    ${unassigned.map(p => `<span>${p.name}</span>`).join(', ')}
                </div>
            ` : ''}
            
            <div class="lobby-buttons-bottom">
                ${this.myTeam ? `
                    <button id="toggle-ready-btn" class="game-btn ${myPlayer?.ready ? 'ready' : ''}">
                        ${myPlayer?.ready ? 'Unready' : 'Ready'}
                    </button>
                ` : ''}
                <button id="leave-room-btn" class="game-btn danger-btn">Leave Room</button>
            </div>
        `;

        document.querySelectorAll('.join-team-btn').forEach(btn => {
            btn.onclick = () => {
                const team = parseInt(btn.dataset.team);
                this.socket.emit('change_team', { roomCode: this.roomCode, team });
            };
        });

        document.querySelectorAll('.leave-team-btn').forEach(btn => {
            btn.onclick = () => {
                this.socket.emit('leave_team', this.roomCode);
            };
        });

        const readyBtn = document.getElementById('toggle-ready-btn');
        if (readyBtn) {
            readyBtn.onclick = () => {
                if (myPlayer?.ready) {
                    this.socket.emit('set_unready', this.roomCode);
                } else {
                    this.socket.emit('set_ready', this.roomCode);
                }
            };
        }

        const leaveBtn = document.getElementById('leave-room-btn');
        if (leaveBtn) {
            leaveBtn.onclick = () => {
                this.socket.emit('leave_room', this.roomCode);
                this.clearSessionAndReload();
            };
        }
    }

    startCountdown() {
        if (this.countdownInterval) return;

        let countdown = 3;
        const countdownWrapper = document.getElementById('countdown-container-wrapper');
        const countdownContainer = document.getElementById('countdown-container');
        if (!countdownContainer || !countdownWrapper) {
            console.error('Countdown containers not found!');
            return;
        }

        console.log('Starting countdown from 3...');
        countdownWrapper.style.display = 'block';
        countdownContainer.innerHTML = `
            <div style="font-size: 18px; font-weight: 500; color: #00165c; margin-bottom: 10px;">Game beginning in...</div>
            <div style="font-size: 56px; font-weight: 700; color: #4ecdc4;">${countdown}</div>
        `;

        this.countdownInterval = setInterval(() => {
            countdown--;
            console.log(`Countdown: ${countdown}`);
            if (countdown > 0) {
                countdownContainer.innerHTML = `
                    <div style="font-size: 18px; font-weight: 500; color: #00165c; margin-bottom: 10px;">Game beginning in...</div>
                    <div style="font-size: 56px; font-weight: 700; color: #4ecdc4;">${countdown}</div>
                `;
            } else {
                console.log('Countdown finished');
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
                countdownWrapper.style.display = 'none';
                countdownContainer.innerHTML = '';
            }
        }, 1000);
    }

    startOnlineGame(gameState) {
        this.gameState = gameState;
        this.renderOnlineGameScreen();
    }

    renderOnlineGameScreen() {
        this.gameContainer.innerHTML = '';

        const gameScreen = document.createElement('div');
        gameScreen.className = 'game-screen';

        const team1Players = this.gameState.players.filter(p => p.team === 1);
        const team2Players = this.gameState.players.filter(p => p.team === 2);

        const psychic = this.gameState.players.find(p => p.id === this.gameState.psychicId);
        const isPsychic = psychic?.name === this.playerName;
        const isMyTeamGuessing = this.myTeam === this.gameState.guessingTeam && !isPsychic;

        const guessingTeamPlayers = this.gameState.players.filter(p => p.team === this.gameState.guessingTeam && p.id !== psychic.id);
        const guesser = guessingTeamPlayers[0];

        let phaseTitle = 'Psychic Phase';
        let phaseSubtitle = `<span style="background-color: ${psychic.color}; padding: 1px 6px; border-radius: 3px; color: white; font-weight: 700; font-size: 14px;">${psychic.name}</span> is up!`;
        let actionBtnText = 'Uncover board!';

        if (this.gameState.phase === 'revealed') {
            phaseTitle = 'Psychic Phase';
            phaseSubtitle = `<span style="background-color: ${psychic.color}; padding: 1px 6px; border-radius: 3px; color: white; font-weight: 700; font-size: 14px;">${psychic.name}</span> is up!`;
            actionBtnText = 'Cover and begin!';
        } else if (this.gameState.phase === 'guessing') {
            phaseTitle = 'Team Phase';
            phaseSubtitle = `<span style="background-color: ${guesser.color}; padding: 1px 6px; border-radius: 3px; color: white; font-weight: 700; font-size: 14px;">${guesser.name}</span> is up!`;
            actionBtnText = 'Lock guess!';
        }

        gameScreen.innerHTML = `
            <div class="game-content">
                <div id="phase-indicator" class="phase-indicator">
                    <div class="phase-title">${phaseTitle}</div>
                    <div class="phase-subtitle">${phaseSubtitle}</div>
                </div>
                <button id="game-action-btn" class="game-btn">${actionBtnText}</button>
                <div id="ready-indicators-container" style="min-height: 50px; display: flex; justify-content: center; align-items: center; margin-bottom: 10px;"></div>
                <div id="dial-container"></div>
                <div id="prompt-display" class="prompt-display" style="background: ${this.gameState.phase === 'psychic' ? 'white' : `linear-gradient(90deg, ${this.gameState.promptColors.color1}, ${this.gameState.promptColors.color2})`}">
                    <span class="prompt-left">${this.gameState.phase === 'psychic' ? '?' : this.gameState.prompt.left}</span>
                    <span class="prompt-right">${this.gameState.phase === 'psychic' ? '?' : this.gameState.prompt.right}</span>
                </div>
            </div>
            <div class="scoreboard">
                <h2>Round ${this.gameState.round}</h2>
                <div class="score-item">
                    <div class="team-info">
                        <span class="team-label">Team 1</span>
                        <div class="team-members">
                            ${team1Players.map(p => `
                                <span class="player-tag" style="background-color: ${p.color}">${p.name}</span>
                            `).join('')}
                        </div>
                    </div>
                    <span class="player-score">${this.gameState.scores.team1}</span>
                </div>
                <div class="score-item">
                    <div class="team-info">
                        <span class="team-label">Team 2</span>
                        <div class="team-members">
                            ${team2Players.map(p => `
                                <span class="player-tag" style="background-color: ${p.color}">${p.name}</span>
                            `).join('')}
                        </div>
                    </div>
                    <span class="player-score">${this.gameState.scores.team2}</span>
                </div>
            </div>
        `;

        this.gameContainer.appendChild(gameScreen);

        const dial = new Dial(document.getElementById('dial-container'));
        dial.angle = GAME_SETTINGS.DEFAULT_DIAL_ANGLE;
        dial.targetAngle = this.gameState.targetAngle;
        dial.render();
        dial.lock();

        if (this.gameState.phase === 'psychic') {
            dial.showCover();
        } else if (this.gameState.phase === 'revealed') {
            if (isPsychic) {
                dial.hideCover();
            } else {
                dial.showCover();
            }
        } else {
            dial.showCover();
        }

        this.setupGameHandlers(dial, isPsychic, isMyTeamGuessing);
    }

    setupGameHandlers(dial, isPsychic, isMyTeamGuessing) {
        this.socket.off('board_uncovered');
        this.socket.off('cover_begin');
        this.socket.off('dial_updated');
        this.socket.off('guess_locked');
        this.socket.off('player_ready_for_next');

        const actionBtn = document.getElementById('game-action-btn');

        if (this.gameState.phase === 'psychic') {
            if (isPsychic) {
                actionBtn.style.opacity = '1';
                actionBtn.style.pointerEvents = 'auto';
                actionBtn.disabled = false;
                actionBtn.onclick = () => {
                    dial.lock();
                    this.socket.emit('uncover_board', this.roomCode);
                    actionBtn.disabled = true;
                };
            } else {
                actionBtn.style.opacity = '0';
                actionBtn.style.pointerEvents = 'none';
                actionBtn.disabled = true;
            }
        } else if (this.gameState.phase === 'revealed') {
            if (isPsychic) {
                actionBtn.style.opacity = '1';
                actionBtn.style.pointerEvents = 'auto';
                actionBtn.disabled = false;
                actionBtn.onclick = () => {
                    this.socket.emit('cover_and_begin', this.roomCode);
                    actionBtn.disabled = true;
                };
            } else {
                actionBtn.style.opacity = '0';
                actionBtn.style.pointerEvents = 'none';
                actionBtn.disabled = true;
            }
        } else {
            if (isMyTeamGuessing) {
                dial.unlock();
                actionBtn.style.opacity = '1';
                actionBtn.style.pointerEvents = 'auto';
                actionBtn.disabled = false;
                actionBtn.onclick = () => {
                    dial.lock();
                    this.socket.emit('lock_guess', this.roomCode);
                    actionBtn.disabled = true;
                    actionBtn.textContent = 'Waiting...';
                };
            } else {
                actionBtn.style.opacity = '0';
                actionBtn.style.pointerEvents = 'none';
                actionBtn.disabled = true;
            }
        }

        this.socket.off('board_uncovered');
        this.socket.on('board_uncovered', ({ phase }) => {
            this.gameState.phase = phase;
            const phaseIndicator = document.getElementById('phase-indicator');
            phaseIndicator.querySelector('.phase-title').textContent = 'Psychic Phase';

            const promptDisplay = document.getElementById('prompt-display');
            promptDisplay.style.background = `linear-gradient(90deg, ${this.gameState.promptColors.color1}, ${this.gameState.promptColors.color2})`;
            promptDisplay.querySelector('.prompt-left').textContent = this.gameState.prompt.left;
            promptDisplay.querySelector('.prompt-right').textContent = this.gameState.prompt.right;

            if (isPsychic) {
                setTimeout(() => dial.hideCover(), 100);
            }

            const actionBtn = document.getElementById('game-action-btn');
            if (isPsychic) {
                actionBtn.style.opacity = '1';
                actionBtn.style.pointerEvents = 'auto';
                actionBtn.disabled = false;
                actionBtn.textContent = 'Cover and begin!';
                actionBtn.onclick = () => {
                    this.socket.emit('cover_and_begin', this.roomCode);
                    actionBtn.disabled = true;
                };
            } else {
                actionBtn.style.opacity = '0';
                actionBtn.style.pointerEvents = 'none';
                actionBtn.disabled = true;
            }
        });

        this.socket.off('cover_begin');
        this.socket.on('cover_begin', ({ phase }) => {
            this.gameState.phase = phase;
            const phaseIndicator = document.getElementById('phase-indicator');
            phaseIndicator.querySelector('.phase-title').textContent = 'Team Phase';

            const guessingTeamPlayers = this.gameState.players.filter(p => p.team === this.gameState.guessingTeam && p.id !== this.gameState.psychicId);
            const guesser = guessingTeamPlayers[0];
            phaseIndicator.querySelector('.phase-subtitle').innerHTML = `<span style="background-color: ${guesser.color}; padding: 1px 6px; border-radius: 3px; color: white; font-weight: 700; font-size: 14px;">${guesser.name}</span> is up!`;

            setTimeout(() => dial.showCover(), 100);

            const actionBtn = document.getElementById('game-action-btn');
            if (isMyTeamGuessing) {
                dial.unlock();
                actionBtn.style.opacity = '1';
                actionBtn.style.pointerEvents = 'auto';
                actionBtn.disabled = false;
                actionBtn.textContent = 'Lock guess!';
                actionBtn.onclick = () => {
                    dial.lock();
                    this.socket.emit('lock_guess', this.roomCode);
                    actionBtn.disabled = true;
                    actionBtn.textContent = 'Waiting...';
                };

                const originalHandleDrag = dial.handleDrag.bind(dial);
                dial.handleDrag = (e) => {
                    originalHandleDrag(e);
                    this.socket.emit('update_dial', {
                        roomCode: this.roomCode,
                        angle: dial.angle
                    });
                };
            } else {
                actionBtn.style.opacity = '0';
                actionBtn.style.pointerEvents = 'none';
                actionBtn.disabled = true;
            }
        });

        this.socket.off('dial_updated');
        this.socket.on('dial_updated', ({ angle }) => {
            if (this.gameState.phase !== 'guessing') return;
            dial.angle = angle;
            dial.updatePointer();
        });

        this.socket.off('guess_locked');
        this.socket.on('guess_locked', (result) => {
            this.socket.off('dial_updated');
            this.socket.off('guess_locked');
            this.socket.off('board_uncovered');
            this.socket.off('cover_begin');
            this.showGuessResult(result, dial);
        });

        if (isMyTeamGuessing && this.gameState.phase === 'guessing') {
            const originalHandleDrag = dial.handleDrag.bind(dial);
            dial.handleDrag = (e) => {
                originalHandleDrag(e);
                this.socket.emit('update_dial', {
                    roomCode: this.roomCode,
                    angle: dial.angle
                });
            };
        }
    }

    showGuessResult(result, dial) {
        dial.hideCover();
        dial.lock();

        const phaseIndicator = document.getElementById('phase-indicator');
        phaseIndicator.querySelector('.phase-title').textContent = 'Round Finished!';
        phaseIndicator.querySelector('.phase-subtitle').textContent = '';

        const actionBtn = document.getElementById('game-action-btn');
        actionBtn.style.opacity = '1';
        actionBtn.style.pointerEvents = 'auto';
        actionBtn.style.visibility = 'visible';
        actionBtn.textContent = 'Ready for Next Round';
        actionBtn.disabled = false;

        const scoreItems = document.querySelectorAll('.score-item');
        scoreItems[0].querySelector('.player-score').textContent = result.scores.team1;
        scoreItems[1].querySelector('.player-score').textContent = result.scores.team2;

        this.showScoreNotification(result.points);

        const readyIndicatorsContainer = document.getElementById('ready-indicators-container');
        readyIndicatorsContainer.innerHTML = '';

        const readyIndicators = document.createElement('div');
        readyIndicators.id = 'ready-indicators';
        readyIndicators.style.cssText = 'display: flex; justify-content: center; gap: 10px;';

        this.gameState.players.forEach(player => {
            const indicator = document.createElement('div');
            indicator.className = 'ready-indicator';
            indicator.id = `ready-${player.name}`;
            indicator.style.cssText = `
                width: 30px;
                height: 30px;
                border-radius: 50%;
                background-color: ${player.color || '#ccc'};
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                color: white;
                font-weight: bold;
            `;
            readyIndicators.appendChild(indicator);
        });

        readyIndicatorsContainer.appendChild(readyIndicators);

        actionBtn.onclick = () => {
            this.socket.emit('ready_for_next', this.roomCode);
            actionBtn.disabled = true;
            actionBtn.textContent = 'Waiting for others...';
        };

        this.socket.off('player_ready_for_next');
        this.socket.on('player_ready_for_next', ({ players }) => {
            this.gameState.players = players;

            players.forEach(player => {
                const indicator = document.getElementById(`ready-${player.name}`);
                if (indicator) {
                    indicator.textContent = player.readyForNext ? '✓' : '';
                }
            });
        });

        this.socket.off('round_start');
        this.socket.on('round_start', (gameState) => {
            this.socket.off('player_ready_for_next');
            this.gameState = gameState;
            this.renderOnlineGameScreen();
        });
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

    clearSessionAndReload() {
        sessionStorage.removeItem('roomCode');
        sessionStorage.removeItem('playerName');
        sessionStorage.removeItem('gameState');
        socketClient.disconnect();
        window.history.pushState({}, '', window.location.pathname);
        location.reload();
    }

    start() {
        const storedRoomCode = sessionStorage.getItem('roomCode');
        const storedPlayerName = sessionStorage.getItem('playerName');
        const storedGameState = sessionStorage.getItem('gameState');

        if (storedRoomCode && storedPlayerName) {
            this.playerName = storedPlayerName;
            this.roomCode = storedRoomCode;

            if (storedGameState === 'playing') {
                this.socket.emit('request_game_state', { roomCode: storedRoomCode, playerName: storedPlayerName });
            } else {
                this.socket.emit('join_room', {
                    roomCode: storedRoomCode,
                    playerName: storedPlayerName
                });
            }
        } else {
            this.renderLobbyChoice();
        }
    }
}