const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// مهم: استخدام polling فقط لأن WebSocket مش مدعوم على Vercel
const io = new Server(server, {
    cors: { origin: "*" },
    transports: ['polling'], // ❌ شيل websocket
    allowUpgrades: false,
    pingTimeout: 60000,
    pingInterval: 25000
});

app.use(express.static('public'));

const players = {};
const messages = [];

io.on('connection', (socket) => {
    console.log('متصل:', socket.id);
    
    players[socket.id] = {
        id: socket.id,
        x: 400,
        y: 300,
        color: getRandomColor(),
        name: 'لاعب ' + socket.id.substr(0, 4)
    };
    
    socket.emit('init', {
        id: socket.id,
        players: players,
        messages: messages.slice(-20)
    });
    
    socket.broadcast.emit('playerJoined', players[socket.id]);
    
    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            io.emit('playerMoved', { id: socket.id, x: data.x, y: data.y });
        }
    });
    
    socket.on('chat', (msg) => {
        const message = {
            id: socket.id,
            name: players[socket.id]?.name || 'مجهول',
            text: msg,
            time: new Date().toLocaleTimeString('ar-SA')
        };
        messages.push(message);
        if (messages.length > 50) messages.shift();
        io.emit('chatMessage', message);
    });
    
    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerLeft', socket.id);
    });
});

function getRandomColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    return colors[Math.floor(Math.random() * colors.length)];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🎮 Pixel Arena على البورت ${PORT}`);
});

// مهم لـ Vercel
module.exports = server;
