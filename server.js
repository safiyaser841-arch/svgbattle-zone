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

const weapons = [
    { name: "Pistole", damage: 12, speed: 12, color: "#fff" },
    { name: "SMG", damage: 8, speed: 15, color: "#22d3ee" },
    { name: "Gewehr", damage: 20, speed: 13, color: "#facc15" },
    { name: "Schrotflinte", damage: 30, speed: 10, color: "#fb923c" },
    { name: "Bogen", damage: 35, speed: 9, color: "#a78bfa" },
    { name: "Schwert", damage: 45, speed: 0, color: "#f8fafc", melee: true }
];

function code() {
    return Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();
}

function randomWeapon() {
    return weapons[Math.floor(Math.random() * weapons.length)];
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function broadcastRoom(roomCode) {
    const room = rooms[roomCode];

    if (!room) return;

    io.to(roomCode).emit("state", {
        players: room.players,
        bots: room.bots
    });
}

function createBots(room) {
    room.bots = [];

    for (let i = 0; i < room.botCount; i++) {

        room.bots.push({
            id: "bot-" + i + "-" + Math.random(),
            name: "BOT " + (i + 1),
            x: 150 + Math.random() * 900,
            y: 100 + Math.random() * 500,
            hp: 100,
            skin: i % 2 === 0 ? "botBlue" : "botRed",
            weapon: randomWeapon().name,
            target: null,
            alive: true,
            cooldown: 0
        });
    }
}

io.on("connection", socket => {

    console.log("Connected:", socket.id);

    socket.on("createRoom", data => {

        let roomCode = code();

        while (rooms[roomCode]) {
            roomCode = code();
        }

        rooms[roomCode] = {
            players: {},
            bots: [],
            botCount: Math.max(
                0,
                Math.min(5, Number(data.bots) || 0)
            )
        };

        const weapon = randomWeapon();

        rooms[roomCode].players[socket.id] = {
            id: socket.id,
            name: data.name || "Player",
            x: 300,
            y: 300,
            hp: 100,
            alive: true,
            skin: data.skin || "standard",
            weapon: weapon.name,
            cooldown: 0
        };

        createBots(rooms[roomCode]);

        socket.join(roomCode);
        socket.room = roomCode;

        socket.emit("roomCreated", {
            code: roomCode
        });

        broadcastRoom(roomCode);
    });

    socket.on("joinRoom", data => {

        const roomCode =
            String(data.code || "").toUpperCase();

        const room = rooms[roomCode];

        if (!room) {
            socket.emit(
                "errorMessage",
                "Raum nicht gefunden."
            );
            return;
        }

        const weapon = randomWeapon();

        room.players[socket.id] = {
            id: socket.id,
            name: data.name || "Player",
            x: 700,
            y: 300,
            hp: 100,
            alive: true,
            skin: data.skin || "standard",
            weapon: weapon.name,
            cooldown: 0
        };

        socket.join(roomCode);
        socket.room = roomCode;

        socket.emit("joinedRoom", {
            code: roomCode
        });

        broadcastRoom(roomCode);
    });

    socket.on("move", data => {

        const roomCode = socket.room;
        const room = rooms[roomCode];

        if (!room) return;

        const p = room.players[socket.id];

        if (!p || !p.alive) return;

        p.x = Number(data.x);
        p.y = Number(data.y);

        broadcastRoom(roomCode);
    });

    socket.on("shoot", data => {

        const roomCode = socket.room;
        const room = rooms[roomCode];

        if (!room) return;

        const shooter = room.players[socket.id];

        if (!shooter || !shooter.alive) return;

        const weapon =
            weapons.find(w => w.name === shooter.weapon);

        if (!weapon) return;

        io.to(roomCode).emit("bullet", {
            owner: socket.id,
            x: shooter.x,
            y: shooter.y,
            dx: Number(data.dx),
            dy: Number(data.dy),
            damage: weapon.damage,
            color: weapon.color
        });
    });

    socket.on("kill", data => {

        const roomCode = socket.room;
        const room = rooms[roomCode];

        if (!room) return;

        const victim =
            room.players[data.victim];

        const killer =
            room.players[socket.id];

        if (!victim || !killer) return;

        victim.alive = false;
        victim.hp = 0;

        io.to(roomCode).emit("elimination", {
            killer: killer.name,
            victim: victim.name
        });

        broadcastRoom(roomCode);
    });

    socket.on("disconnect", () => {

        const roomCode = socket.room;

        if (!room || !rooms[roomCode]) return;

        delete rooms[roomCode].players[socket.id];

        if (
            Object.keys(
                rooms[roomCode].players
            ).length === 0
        ) {
            delete rooms[roomCode];
        } else {
            broadcastRoom(roomCode);
        }

        console.log("Disconnected:", socket.id);
    });
});

setInterval(() => {

    for (const roomCode in rooms) {

        const room = rooms[roomCode];

        for (const bot of room.bots) {

            if (!bot.alive) continue;

            let targets = [
                ...Object.values(room.players),
                ...room.bots
            ].filter(
                p =>
                    p.alive &&
                    p.id !== bot.id
            );

            if (!targets.length) continue;

            targets.sort(
                (a, b) =>
                    distance(bot, a) -
                    distance(bot, b)
            );

            const target = targets[0];

            bot.target = target.id;

            const dx = target.x - bot.x;
            const dy = target.y - bot.y;

            const d = Math.hypot(dx, dy) || 1;

            bot.x += dx / d * 1.5;
            bot.y += dy / d * 1.5;

            bot.cooldown--;

            if (
                bot.cooldown <= 0 &&
                d < 500
            ) {

                const weapon =
                    weapons.find(
                        w =>
                            w.name === bot.weapon
                    );

                if (
                    weapon &&
                    !weapon.melee
                ) {

                    io.to(roomCode).emit(
                        "bullet",
                        {
                            owner: bot.id,
                            x: bot.x,
                            y: bot.y,
                            dx: dx / d * weapon.speed,
                            dy: dy / d * weapon.speed,
                            damage: weapon.damage,
                            color: weapon.color
                        }
                    );

                    bot.cooldown =
                        30 + Math.random() * 30;
                }
            }
        }

        broadcastRoom(roomCode);
    }

}, 1000 / 30);

server.listen(PORT, "0.0.0.0", () => {
    console.log(
        "Battle Zone Server läuft auf Port " + PORT
    );
});
