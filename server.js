const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Battle Zone Server läuft!");
});

const wss = new WebSocket.Server({ server });

const rooms = {};

const weapons = [
    "pistol",
    "smg",
    "shotgun",
    "sniper",
    "sword",
    "hammer"
];

const colors = [
    "#3498db",
    "#e74c3c",
    "#9b59b6",
    "#f1c40f",
    "#1abc9c",
    "#e67e22"
];

let nextId = 1;

function randomWeapon() {
    return weapons[
        Math.floor(Math.random() * weapons.length)
    ];
}

function randomPosition() {
    return {
        x: 100 + Math.random() * 800,
        y: 80 + Math.random() * 490
    };
}

function createBot(room, number) {

    const pos = randomPosition();

    const bot = {
        id: "bot-" + number + "-" + Date.now(),
        bot: true,
        x: pos.x,
        y: pos.y,
        hp: 100,
        shield: 50,
        kills: 0,
        level: 1,
        alive: true,
        weapon: weapons[number % weapons.length],
        color: colors[number % colors.length],
        angle: Math.random() * Math.PI * 2,
        target: null
    };

    room.players[bot.id] = bot;

    console.log(
        "Bot erstellt:",
        bot.id,
        bot.weapon
    );
}

function createBots(room) {

    // Nicht doppelt erstellen
    if (room.botsCreated) return;

    room.botsCreated = true;

    for (let i = 0; i < 5; i++) {
        createBot(room, i);
    }

    console.log("5 Bots wurden erstellt!");
}

function broadcast(room) {

    const data = JSON.stringify({
        type: "state",
        players: room.players
    });

    room.clients.forEach(ws => {

        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }

    });
}

function startBotAI(room) {

    if (room.aiStarted) return;

    room.aiStarted = true;

    setInterval(() => {

        const bots =
            Object.values(room.players)
            .filter(p => p.bot && p.alive);

        const humans =
            Object.values(room.players)
            .filter(p => !p.bot && p.alive);

        for (const bot of bots) {

            let targets = [
                ...humans,
                ...bots.filter(
                    b => b.id !== bot.id
                )
            ];

            if (targets.length === 0) continue;

            // Nächstes Ziel suchen
            targets.sort((a, b) => {

                const da =
                    Math.hypot(
                        a.x - bot.x,
                        a.y - bot.y
                    );

                const db =
                    Math.hypot(
                        b.x - bot.x,
                        b.y - bot.y
                    );

                return da - db;
            });

            const target = targets[0];

            const dx =
                target.x - bot.x;

            const dy =
                target.y - bot.y;

            const distance =
                Math.hypot(dx, dy);

            bot.angle =
                Math.atan2(dy, dx);

            // Bot bewegt sich zum Ziel
            if (distance > 100) {

                bot.x +=
                    (dx / distance) * 3;

                bot.y +=
                    (dy / distance) * 3;
            }

            // Angreifen
            if (distance < 350) {

                bot.lastShot =
                    bot.lastShot || 0;

                if (
                    Date.now() -
                    bot.lastShot >
                    700
                ) {

                    bot.lastShot =
                        Date.now();

                    attack(
                        room,
                        bot,
                        target
                    );
                }
            }

            // Karte begrenzen
            bot.x =
                Math.max(
                    35,
                    Math.min(
                        965,
                        bot.x
                    )
                );

            bot.y =
                Math.max(
                    35,
                    Math.min(
                        615,
                        bot.y
                    )
                );
        }

        broadcast(room);

    }, 100);
}

function attack(room, attacker, target) {

    if (!target.alive) return;

    let damage = 10;

    switch (attacker.weapon) {

        case "pistol":
            damage = 10;
            break;

        case "smg":
            damage = 7;
            break;

        case "shotgun":
            damage = 18;
            break;

        case "sniper":
            damage = 25;
            break;

        case "sword":
            damage = 20;
            break;

        case "hammer":
            damage = 24;
            break;
    }

    // Nahkampf braucht Nähe
    if (
        attacker.weapon === "sword" ||
        attacker.weapon === "hammer"
    ) {

        const distance =
            Math.hypot(
                attacker.x - target.x,
                attacker.y - target.y
            );

        if (distance > 90) return;
    }

    // Schild zuerst
    if (target.shield > 0) {

        target.shield -= damage;

        if (target.shield < 0) {

            target.hp +=
                target.shield;

            target.shield = 0;
        }

    } else {

        target.hp -= damage;
    }

    if (target.hp <= 0) {

        target.hp = 0;
        target.alive = false;

        attacker.kills++;

        attacker.level =
            1 +
            Math.floor(
                attacker.kills / 2
            );

        setTimeout(() => {

            respawn(room, target);

        }, 3000);
    }
}

function respawn(room, player) {

    const pos =
        randomPosition();

    player.x = pos.x;
    player.y = pos.y;

    player.hp = 100;
    player.shield = 50;
    player.alive = true;
}

wss.on("connection", ws => {

    const id =
        "player-" + nextId++;

    ws.playerId = id;

    ws.send(JSON.stringify({
        type: "id",
        id: id
    }));

    ws.on("message", message => {

        let data;

        try {
            data = JSON.parse(message);
        } catch {
            return;
        }

        // Raum erstellen
        if (data.type === "create") {

            const roomCode =
                data.room || "ROOM";

            rooms[roomCode] = {

                players: {},

                clients: new Set(),

                botsCreated: false,

                aiStarted: false
            };

            const room =
                rooms[roomCode];

            room.clients.add(ws);

            const pos =
                randomPosition();

            room.players[id] = {

                id,

                bot: false,

                x: pos.x,

                y: pos.y,

                hp: 100,

                shield: 50,

                kills: 0,

                level: 1,

                alive: true,

                weapon: randomWeapon(),

                color: "#ffffff",

                angle: 0
            };

            ws.room = roomCode;

            // HIER werden die 5 Bots erstellt
            createBots(room);

            startBotAI(room);

            ws.send(JSON.stringify({
                type: "created",
                room: roomCode
            }));

            broadcast(room);
        }

        // Raum beitreten
        if (data.type === "join") {

            const room =
                rooms[data.room];

            if (!room) {

                ws.send(JSON.stringify({
                    type: "error",
                    message: "Raum nicht gefunden"
                }));

                return;
            }

            room.clients.add(ws);

            const pos =
                randomPosition();

            room.players[id] = {

                id,

                bot: false,

                x: pos.x,

                y: pos.y,

                hp: 100,

                shield: 50,

                kills: 0,

                level: 1,

                alive: true,

                weapon: randomWeapon(),

                color: "#ffffff",

                angle: 0
            };

            ws.room = data.room;

            createBots(room);

            startBotAI(room);

            ws.send(JSON.stringify({
                type: "joined",
                room: data.room
            }));

            broadcast(room);
        }

        // Spieler bewegen
        if (
            data.type === "move" &&
            ws.room
        ) {

            const room =
                rooms[ws.room];

            const player =
                room.players[id];

            if (!player || !player.alive)
                return;

            const length =
                Math.hypot(
                    data.dx,
                    data.dy
                );

            if (length === 0)
                return;

            player.x +=
                (data.dx / length) * 5;

            player.y +=
                (data.dy / length) * 5;

            player.x =
                Math.max(
                    25,
                    Math.min(
                        975,
                        player.x
                    )
                );

            player.y =
                Math.max(
                    25,
                    Math.min(
                        625,
                        player.y
                    )
                );

            broadcast(room);
        }

        // Zielen
        if (
            data.type === "aim" &&
            ws.room
        ) {

            const room =
                rooms[ws.room];

            const player =
                room.players[id];

            if (player) {
                player.angle =
                    data.angle;
            }
        }

        // Schießen
        if (
            data.type === "shoot" &&
            ws.room
        ) {

            const room =
                rooms[ws.room];

            const attacker =
                room.players[id];

            if (!attacker || !attacker.alive)
                return;

            let closest = null;
            let closestDistance = 9999;

            Object.values(
                room.players
            ).forEach(target => {

                if (
                    target.id === attacker.id ||
                    !target.alive
                ) return;

                const dx =
                    target.x -
                    attacker.x;

                const dy =
                    target.y -
                    attacker.y;

                const distance =
                    Math.hypot(dx, dy);

                if (
                    distance <
                    closestDistance
                ) {

                    const angle =
                        Math.atan2(
                            dy,
                            dx
                        );

                    let difference =
                        Math.abs(
                            angle -
                            data.angle
                        );

                    if (
                        difference >
                        Math.PI
                    ) {
                        difference =
                            Math.PI * 2 -
                            difference;
                    }

                    if (
                        difference <
                        0.35
                    ) {

                        closest =
                            target;

                        closestDistance =
                            distance;
                    }
                }
            });

            if (closest) {

                attack(
                    room,
                    attacker,
                    closest
                );
            }

            broadcast(room);
        }
    });

    ws.on("close", () => {

        if (!ws.room) return;

        const room =
            rooms[ws.room];

        if (!room) return;

        delete room.players[id];

        room.clients.delete(ws);

        broadcast(room);

    });

});


server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Battle Zone Server läuft auf Port ${PORT}`
        );

    }
);
