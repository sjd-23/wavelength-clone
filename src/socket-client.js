class SocketClient {
    constructor() {
        this.socket = null;
        this.connected = false;
    }

    connect() {
        const serverUrl = this.getServerUrl();
        console.log('Connecting to server:', serverUrl);

        this.socket = io(serverUrl);

        this.socket.on('connect', () => {
            console.log('Connected to server:', this.socket.id);
            this.connected = true;
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.connected = false;
        });

        return this.socket;
    }

    getServerUrl() {
        if (window.SOCKET_SERVER_URL) {
            return window.SOCKET_SERVER_URL;
        }

        const hostname = window.location.hostname;

        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3001';
        }

        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        return `${protocol}//${hostname}:3001`;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

export default new SocketClient();