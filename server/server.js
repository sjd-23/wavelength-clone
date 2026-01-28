import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import GameManager from './game-manager.js';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const gameManager = new GameManager();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_room', (playerName) => {
        const roomCode = gameManager.createRoom(socket.id, playerName);
        socket.join(roomCode);

        const room = gameManager.getRoom(roomCode);
        socket.emit('room_created', {
            roomCode,
            playerName,
            players: room.players
        });
        console.log(`Room created: ${roomCode} by ${playerName}`);
    });

    socket.on('join_room', ({ roomCode, playerName }) => {
        const result = gameManager.attemptReconnect(socket.id, roomCode, playerName);

        if (result.success) {
            socket.join(roomCode);
            socket.emit('room_joined', { roomCode, playerName });

            io.to(roomCode).emit('player_joined', {
                players: result.players,
                playerCount: result.playerCount
            });

            console.log(`${playerName} joined room: ${roomCode}`);
        } else {
            socket.emit('join_error', { message: result.message });
        }
    });

    socket.on('set_ready', (roomCode) => {
        gameManager.setPlayerReady(roomCode, socket.id);
        const room = gameManager.getRoom(roomCode);

        io.to(roomCode).emit('player_ready_update', {
            players: room.players
        });

        if (gameManager.allPlayersReady(roomCode)) {
            console.log(`All players ready in room: ${roomCode}, starting 3 second countdown...`);
            const timer = setTimeout(() => {
                const gameState = gameManager.startGame(roomCode);
                io.to(roomCode).emit('game_start', gameState);
                console.log(`Game starting in room: ${roomCode}`);
            }, 3000);
            gameManager.countdownTimers.set(roomCode, timer);
        }
    });

    socket.on('set_unready', (roomCode) => {
        gameManager.setPlayerUnready(roomCode, socket.id);
        const room = gameManager.getRoom(roomCode);

        const cancelled = gameManager.cancelCountdown(roomCode);
        if (cancelled) {
            console.log(`Countdown cancelled in room: ${roomCode}`);
        }

        io.to(roomCode).emit('player_unready_update', {
            players: room.players
        });
    });

    socket.on('change_team', ({ roomCode, team }) => {
        const result = gameManager.changeTeam(roomCode, socket.id, team);

        if (result.success) {
            io.to(roomCode).emit('team_changed', {
                players: result.players
            });
        } else {
            socket.emit('join_error', { message: result.message || 'Could not change team' });
        }
    });

    socket.on('leave_team', (roomCode) => {
        const result = gameManager.leaveTeam(roomCode, socket.id);

        if (result.success) {
            io.to(roomCode).emit('team_changed', {
                players: result.players
            });
        }
    });

    socket.on('update_dial', ({ roomCode, angle }) => {
        gameManager.updateDial(roomCode, angle);
        socket.to(roomCode).emit('dial_updated', { angle });
    });

    socket.on('lock_guess', (roomCode) => {
        const result = gameManager.lockGuess(roomCode);
        io.to(roomCode).emit('guess_locked', result);
    });

    socket.on('uncover_board', (roomCode) => {
        const result = gameManager.uncoverBoard(roomCode);

        if (result.success) {
            io.to(roomCode).emit('board_uncovered', {
                phase: result.phase
            });
        }
    });

    socket.on('cover_and_begin', (roomCode) => {
        const result = gameManager.coverAndBegin(roomCode);

        if (result.success) {
            io.to(roomCode).emit('cover_begin', {
                phase: result.phase
            });
        }
    });

    socket.on('ready_for_next', (roomCode) => {
        const result = gameManager.setPlayerReadyForNext(roomCode, socket.id);

        if (result.success) {
            io.to(roomCode).emit('player_ready_for_next', {
                players: result.players
            });

            if (result.allReady) {
                console.log(`All players ready for next round in room: ${roomCode}, calling nextRound()...`);
                const gameState = gameManager.nextRound(roomCode);
                console.log(`nextRound returned:`, gameState ? 'valid gameState' : 'NULL');
                if (gameState) {
                    io.to(roomCode).emit('round_start', gameState);
                    console.log(`round_start event emitted for room: ${roomCode}`);
                } else {
                    console.error(`ERROR: nextRound returned null for room: ${roomCode}`);
                }
            }
        }
    });

    socket.on('request_game_state', ({ roomCode, playerName }) => {
        const room = gameManager.getRoom(roomCode);

        if (room && room.gameState) {
            const result = gameManager.attemptReconnect(socket.id, roomCode, playerName);

            if (result.success) {
                socket.join(roomCode);

                if (room.phase === 'revealed') {
                    room.phase = 'guessing';
                    io.to(roomCode).emit('cover_begin', {
                        phase: room.phase
                    });
                }

                const gameState = gameManager.getCurrentGameState(roomCode);
                socket.emit('game_state_restored', gameState);
            } else {
                socket.emit('join_error', { message: 'Could not rejoin game' });
            }
        } else {
            socket.emit('join_error', { message: 'Game not found' });
        }
    });

    socket.on('disconnect', () => {
        const roomCode = gameManager.removePlayer(socket.id);
        if (roomCode) {
            const room = gameManager.getRoom(roomCode);
            io.to(roomCode).emit('player_left', {
                players: room?.players || []
            });
            console.log(`Player ${socket.id} disconnected from room ${roomCode}`);
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});