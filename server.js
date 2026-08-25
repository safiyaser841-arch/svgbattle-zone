const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 10000;

app.use(express.static(path.join(__dirname)));

const rooms = {};

function createCode() {
    let code;

    do {
        code = Math.random()
            .toString(36)
            .substring(2, 6)
            .toUpperCase();
    } while (rooms[code]);

    return code;
}

function sendRoom(code) {
    if (!rooms[code]) return;

    io.to(code).emit("roomUpdate", {
        players: rooms[code].players,
        bots: rooms[code].bots
    });
}

io.on("connection", (socket) => {

    console.log("Spieler verbunden:", socket.id);

    socket.on("createRoom", (data) => {

        const code = createCode();

        rooms[code] = {
            bots: Number(data.bots) || 0,
            players: {}
        };

        rooms[code].players[socket.id] = {
            id: socket.id,
            name: data.name || "Player",
            skin: data.skin || "blue",
            x: 300,
            y: 300,
            hp: 100
        };

        socket.join(code);
        socket.room = code;

        socket.emit("roomCreated", code);

        sendRoom(code);
    });

    socket.on("joinRoom", (data) => {

        const code = String(data.code || "").toUpperCase();
        const room = rooms[code];

        if (!room) {
            socket.emit("errorMessage", "Dieser Raum existiert nicht.");
            return;
        }

        room.players[socket.id] = {
            id: socket.id,
            name: data.name || "Player",
            skin: data.skin || "blue",
            x: 700,
            y: 300,
            hp: 100
        };

        socket.join(code);
        socket.room = code;

        socket.emit("joinedRoom", code);

        sendRoom(code);
    });

    socket.on("move", (data) => {

        const code = socket.room;

        if (!code || !rooms[code]) return;

        const p = rooms[code].players[socket.id];

        if (!p) return;

        p.x = data.x;
        p.y = data.y;

        socket.to(code).emit("playerMove", p);
    });

    socket.on("shoot", (data) => {

        const code = socket.room;

        if (!code || !rooms[code]) return;

        socket.to(code).emit("shot", {
            id: socket.id,
            x: data.x,
            y: data.y,
            dx: data.dx,
            dy: data.dy
        });
    });

    socket.on("disconnect", () => {

        const code = socket.room;

        if (!code || !rooms[code]) return;

        delete rooms[code].players[socket.id];

        sendRoom(code);

        if (Object.keys(rooms[code].players).length === 0) {
            delete rooms[code];
        }

        console.log("Spieler getrennt:", socket.id);
    });
});

server.listen(PORT, "0.0.0.0", () => {
    console.log("Battle Zone Server läuft auf Port " + PORT);
});
