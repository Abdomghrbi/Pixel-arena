const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// مهم جداً لـ Render
const io = new Server(server, {
    cors: { 
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000
});

// تقديم الملفات الثابتة
app.use(express.static('public'));

// صحة السيرفر
app.get('/health', (req, res) => {
    res.json({ status: 'OK', players: Object.keys(players).length });
});

const players = {};
const messages = [];

io.on('connection', (socket) => {
    console.log('✅ متصل:', socket.id);
    
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
            socket.broadcast.emit('playerMoved', { id: socket.id, x: data.x, y: data.y });
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
        console.log('❌ غادر:', socket.id);
        delete players[socket.id];
        socket.broadcast.emit('playerLeft', socket.id);
    });
});

function getRandomColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#DDA0DD', '#F0E68C'];
    return colors[Math.floor(Math.random() * colors.length)];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🎮 Pixel Arena شغال على البورت ${PORT}`);
});
