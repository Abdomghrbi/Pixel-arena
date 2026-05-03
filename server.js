const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // للسماح بالاتصال من أي مكان
});

// تقديم الملفات الثابتة
app.use(express.static('public'));

// بيانات اللاعبين
const players = {};
const messages = [];

// عند اتصال لاعب جديد
io.on('connection', (socket) => {
    console.log('لاعب متصل:', socket.id);
    
    // إنشاء لاعب جديد في وسط الشاشة
    players[socket.id] = {
        id: socket.id,
        x: 400,
        y: 300,
        color: getRandomColor(),
        name: 'لاعب ' + socket.id.substr(0, 4)
    };
    
    // إرسال بيانات اللاعب له
    socket.emit('init', {
        id: socket.id,
        players: players,
        messages: messages.slice(-20) // آخر 20 رسالة
    });
    
    // إبلاغ اللاعبين الآخرين
    socket.broadcast.emit('playerJoined', players[socket.id]);
    
    // عند تحريك اللاعب
    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            
            // إرسال التحديث للجميع
            io.emit('playerMoved', {
                id: socket.id,
                x: data.x,
                y: data.y
            });
        }
    });
    
    // عند إرسال رسالة
    socket.on('chat', (msg) => {
        const message = {
            id: socket.id,
            name: players[socket.id]?.name || 'مجهول',
            text: msg,
            time: new Date().toLocaleTimeString('ar-SA')
        };
        messages.push(message);
        
        // حفظ آخر 50 رسالة فقط
        if (messages.length > 50) messages.shift();
        
        io.emit('chatMessage', message);
    });
    
    // عند قطع الاتصال
    socket.on('disconnect', () => {
        console.log('لاعب غادر:', socket.id);
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
    console.log(`🎮 Pixel Arena شغال على البورت ${PORT}`);
});
