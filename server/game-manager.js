import { getRandomPrompt } from '../shared/prompts.js';
import { GAME_SETTINGS } from '../shared/game-constants.js';
import { calculateScore, getNextPsychicIndex, generateRoomCode } from '../shared/game-logic.js';
import { getAvailableColor, generatePromptColors } from '../shared/color-utils.js';

export default class GameManager {
    constructor() {
        this.rooms = new Map();
        this.disconnectedPlayers = new Map();
        this.countdownTimers = new Map();
    }

    createRoom(socketId, playerName) {
        const roomCode = generateRoomCode();

        this.rooms.set(roomCode, {
            players: [
                { id: socketId, name: playerName, ready: false, team: null, color: null }
            ],
            gameState: null,
            currentRound: 0,
            currentPsychic: 0,
            lastPsychicPerTeam: { 1: null, 2: null },
            scores: { team1: 0, team2: 0 },
            dialAngle: GAME_SETTINGS.DEFAULT_DIAL_ANGLE,
            targetAngle: null,
            currentPrompt: null,
            phase: null
        });

        return roomCode;
    }

    joinRoom(roomCode, socketId, playerName) {
        const room = this.rooms.get(roomCode);

        if (!room) {
            return { success: false, message: 'Room not found' };
        }

        if (room.players.length >= GAME_SETTINGS.MAX_PLAYERS) {
            return { success: false, message: 'Room is full' };
        }

        room.players.push({
            id: socketId,
            name: playerName,
            ready: false,
            team: null,
            color: null
        });

        return {
            success: true,
            players: room.players,
            playerCount: room.players.length
        };
    }

    changeTeam(roomCode, socketId, newTeam) {
        const room = this.rooms.get(roomCode);
        if (!room) return { success: false };

        const player = room.players.find(p => p.id === socketId);
        if (!player) return { success: false };

        const teamPlayers = room.players.filter(p => p.team === newTeam);
        if (teamPlayers.length >= GAME_SETTINGS.TEAM_SIZE) {
            return { success: false, message: 'Team is full' };
        }

        player.team = newTeam;
        player.ready = false;

        const usedColors = room.players
            .filter(p => p.color && p.id !== socketId)
            .map(p => p.color);
        player.color = getAvailableColor(usedColors);

        return { success: true, players: room.players };
    }

    leaveTeam(roomCode, socketId) {
        const room = this.rooms.get(roomCode);
        if (!room) return { success: false };

        const player = room.players.find(p => p.id === socketId);
        if (!player) return { success: false };

        player.team = null;
        player.ready = false;
        player.color = null;

        return { success: true, players: room.players };
    }

    setPlayerReady(roomCode, socketId) {
        const room = this.rooms.get(roomCode);
        if (!room) return;

        const player = room.players.find(p => p.id === socketId);
        if (player) {
            player.ready = true;
        }
    }

    setPlayerUnready(roomCode, socketId) {
        const room = this.rooms.get(roomCode);
        if (!room) return;

        const player = room.players.find(p => p.id === socketId);
        if (player) {
            player.ready = false;
        }
    }

    allPlayersReady(roomCode) {
        const room = this.rooms.get(roomCode);
        if (!room || room.players.length !== GAME_SETTINGS.MAX_PLAYERS) return false;

        return room.players.every(p => p.ready && p.team);
    }

    cancelCountdown(roomCode) {
        const timer = this.countdownTimers.get(roomCode);
        if (timer) {
            clearTimeout(timer);
            this.countdownTimers.delete(roomCode);
            return true;
        }
        return false;
    }

    startGame(roomCode) {
        const room = this.rooms.get(roomCode);
        if (!room) return null;

        room.gameState = 'active';
        room.targetAngle = Math.random() * 180;
        room.currentPrompt = getRandomPrompt();
        room.currentRound = 1;
        room.currentPsychic = Math.floor(Math.random() * GAME_SETTINGS.MAX_PLAYERS);
        room.phase = 'psychic';
        room.promptColors = generatePromptColors();

        const psychic = room.players[room.currentPsychic];

        room.lastPsychicPerTeam = { 1: null, 2: null };
        if (psychic && psychic.team) {
            room.lastPsychicPerTeam[psychic.team] = room.currentPsychic;
        }

        return {
            players: room.players,
            targetAngle: room.targetAngle,
            prompt: room.currentPrompt,
            promptColors: room.promptColors,
            psychicTeam: psychic.team,
            psychicName: psychic.name,
            psychicId: psychic.id,
            guessingTeam: psychic.team,
            scores: room.scores,
            round: room.currentRound,
            phase: room.phase
        };
    }

    uncoverBoard(roomCode) {
        const room = this.rooms.get(roomCode);
        if (!room) return { success: false };

        room.phase = 'revealed';
        return { success: true, phase: room.phase };
    }

    coverAndBegin(roomCode) {
        const room = this.rooms.get(roomCode);
        if (!room) return { success: false };

        room.phase = 'guessing';
        return { success: true, phase: room.phase };
    }

    updateDial(roomCode, angle) {
        const room = this.rooms.get(roomCode);
        if (room) {
            room.dialAngle = angle;
        }
    }

    lockGuess(roomCode) {
        const room = this.rooms.get(roomCode);
        if (!room) return null;

        const points = calculateScore(room.dialAngle, room.targetAngle);

        const psychicTeam = room.players[room.currentPsychic].team;
        if (psychicTeam === 1) {
            room.scores.team1 += points;
        } else {
            room.scores.team2 += points;
        }

        room.players.forEach(p => p.readyForNext = false);

        return {
            points,
            targetAngle: room.targetAngle,
            guessAngle: room.dialAngle,
            scores: room.scores
        };
    }

    setPlayerReadyForNext(roomCode, socketId) {
        const room = this.rooms.get(roomCode);
        if (!room) return { success: false };

        const player = room.players.find(p => p.id === socketId);
        if (!player) return { success: false };

        player.readyForNext = true;

        const allReady = room.players.every(p => p.readyForNext);
        console.log(`Player ready in room ${roomCode}. Ready status:`, room.players.map(p => ({name: p.name, ready: p.readyForNext})), 'All ready:', allReady);

        return {
            success: true,
            players: room.players,
            allReady
        };
    }

    nextRound(roomCode) {
        try {
            const room = this.rooms.get(roomCode);
            if (!room) {
                console.error(`nextRound: Room ${roomCode} not found!`);
                return null;
            }

            console.log(`nextRound: Current psychic index: ${room.currentPsychic}`);
            console.log(`nextRound: Last psychic per team:`, room.lastPsychicPerTeam);

            const nextPsychicIndex = getNextPsychicIndex(room.players, room.currentPsychic, room.lastPsychicPerTeam);
            console.log(`nextRound: Next psychic index: ${nextPsychicIndex}`);

            if (nextPsychicIndex === -1) {
                console.error(`nextRound: getNextPsychicIndex returned -1! Cannot proceed.`);
                return null;
            }

            const currentPsychicPlayer = room.players[room.currentPsychic];
            if (currentPsychicPlayer && currentPsychicPlayer.team) {
                room.lastPsychicPerTeam[currentPsychicPlayer.team] = room.currentPsychic;
                console.log(`nextRound: Updated lastPsychicPerTeam[${currentPsychicPlayer.team}] = ${room.currentPsychic}`);
            }

            room.currentPsychic = nextPsychicIndex;
            console.log(`nextRound: Set room.currentPsychic to ${room.currentPsychic}`);

            room.currentRound++;
            console.log(`nextRound: Incremented round to ${room.currentRound}`);

            room.dialAngle = GAME_SETTINGS.DEFAULT_DIAL_ANGLE;
            room.targetAngle = Math.random() * 180;
            console.log(`nextRound: Generated targetAngle: ${room.targetAngle}`);

            room.currentPrompt = getRandomPrompt();
            console.log(`nextRound: Got prompt: ${room.currentPrompt?.left} - ${room.currentPrompt?.right}`);

            room.phase = 'psychic';
            room.promptColors = generatePromptColors();
            console.log(`nextRound: Generated colors: ${room.promptColors?.color1}, ${room.promptColors?.color2}`);

            room.players.forEach(p => p.readyForNext = false);
            console.log(`nextRound: Reset readyForNext flags`);

            console.log(`nextRound: room.players length: ${room.players.length}`);
            console.log(`nextRound: room.currentPsychic (index): ${room.currentPsychic}`);

            const psychic = room.players[room.currentPsychic];
            if (!psychic) {
                console.error(`nextRound: ERROR - No player found at index ${room.currentPsychic}!`);
                console.error(`nextRound: Players array:`, room.players.map(p => ({id: p.id, name: p.name, team: p.team})));
                return null;
            }

            console.log(`nextRound: Starting round ${room.currentRound}, psychic is ${psychic.name}`);

            return {
                players: room.players,
                round: room.currentRound,
                targetAngle: room.targetAngle,
                prompt: room.currentPrompt,
                promptColors: room.promptColors,
                psychicTeam: psychic.team,
                psychicName: psychic.name,
                psychicId: psychic.id,
                guessingTeam: psychic.team,
                scores: room.scores,
                phase: room.phase
            };
        } catch (error) {
            console.error(`nextRound: CAUGHT EXCEPTION:`, error);
            console.error(`nextRound: Error stack:`, error.stack);
            return null;
        }
    }

    removePlayer(socketId) {
        for (const [roomCode, room] of this.rooms.entries()) {
            const index = room.players.findIndex(p => p.id === socketId);
            if (index !== -1) {
                const player = room.players[index];

                this.disconnectedPlayers.set(socketId, {
                    roomCode,
                    player: { ...player },
                    timestamp: Date.now()
                });

                room.players.splice(index, 1);

                if (room.players.length === 0) {
                    setTimeout(() => {
                        const currentRoom = this.rooms.get(roomCode);
                        if (currentRoom && currentRoom.players.length === 0) {
                            this.rooms.delete(roomCode);
                            console.log(`Room ${roomCode} deleted after grace period`);
                        }
                    }, GAME_SETTINGS.RECONNECT_GRACE_PERIOD);
                }

                return roomCode;
            }
        }
        return null;
    }

    attemptReconnect(newSocketId, roomCode, playerName) {
        const room = this.rooms.get(roomCode);
        if (!room) {
            return { success: false, message: 'Room not found' };
        }

        const existingPlayerIndex = room.players.findIndex(p => p.name === playerName);

        if (existingPlayerIndex !== -1) {
            room.players[existingPlayerIndex].id = newSocketId;
            console.log(`Player ${playerName} updated socket ID in room ${roomCode}`);

            return {
                success: true,
                players: room.players,
                playerCount: room.players.length
            };
        }

        let reconnectedPlayer = null;
        for (const [oldSocketId, data] of this.disconnectedPlayers.entries()) {
            if (data.roomCode === roomCode && data.player.name === playerName) {
                reconnectedPlayer = data.player;
                this.disconnectedPlayers.delete(oldSocketId);
                break;
            }
        }

        if (reconnectedPlayer) {
            reconnectedPlayer.id = newSocketId;
            room.players.push(reconnectedPlayer);
            console.log(`Player ${playerName} reconnected to room ${roomCode}`);
        } else {
            if (room.players.length >= GAME_SETTINGS.MAX_PLAYERS) {
                return { success: false, message: 'Room is full' };
            }

            room.players.push({
                id: newSocketId,
                name: playerName,
                ready: false,
                team: null,
                color: null
            });
        }

        return {
            success: true,
            players: room.players,
            playerCount: room.players.length
        };
    }

    getCurrentGameState(roomCode) {
        const room = this.rooms.get(roomCode);
        if (!room) return null;

        const psychic = room.players[room.currentPsychic];

        return {
            players: room.players,
            targetAngle: room.targetAngle,
            prompt: room.currentPrompt,
            promptColors: room.promptColors,
            psychicTeam: psychic.team,
            psychicName: psychic.name,
            psychicId: psychic.id,
            guessingTeam: psychic.team,
            scores: room.scores,
            round: room.currentRound,
            phase: room.phase
        };
    }

    getRoom(roomCode) {
        return this.rooms.get(roomCode);
    }
}