const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = Number(process.env.PORT) || 10000;
const HOST = "0.0.0.0";

const INDEX_FILE = path.join(__dirname, "index.html");

const server = http.createServer((req, res) => {
    if (req.url === "/health") {
        res.writeHead(200, {
            "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
            ok: true,
            server: "Battle Zone"
        }));

        return;
    }

    if (req.url === "/" || req.url === "/index.html") {
        fs.readFile(INDEX_FILE, (error, data) => {
            if (error) {
                console.error("index.html Fehler:", error);

                res.writeHead(500, {
                    "Content-Type": "text/plain; charset=utf-8"
                });

                res.end("index.html konnte nicht geladen werden.");
                return;
            }

            res.writeHead(200, {
                "Content-Type": "text/html; charset=utf-8"
            });

            res.end(data);
        });

        return;
    }

    res.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("404 - Nicht gefunden");
});


/* =========================
   WEBSOCKET
========================= */

const wss = new WebSocket.Server({
    server: server,
    path: "/ws"
});


/* =========================
   GAME
========================= */

const MAP_WIDTH = 1600;
const MAP_HEIGHT = 900;

const PLAYER_SPEED = 6;

const players = new Map();

let nextPlayerId = 1;


/* =========================
   HILFSFUNKTIONEN
========================= */

function random(min, max) {
    return Math.random() * (max - min) + min;
}


function createPlayer(ws, name, bot = false) {

    const id = String(nextPlayerId++);

    const player = {
        id: id,

        name:
            name ||
            (bot ? `Bot ${id}` : `Player ${id}`),

        x: random(100, MAP_WIDTH - 100),
        y: random(100, MAP_HEIGHT - 100),

        hp: 100,

        bot: bot,

        keys: {
            up: false,
            down: false,
            left: false,
            right: false
        }
    };

    player.ws = ws;

    players.set(id, player);

    return player;
}


function publicPlayer(player) {

    return {
        id: player.id,
        name: player.name,

        x: Math.round(player.x),
        y: Math.round(player.y),

        hp: player.hp,

        bot: player.bot
    };
}


function getState() {

    const result = {};

    for (const player of players.values()) {

        result[player.id] = publicPlayer(player);

    }

    return result;
}


function send(ws, data) {

    if (
        ws &&
        ws.readyState === WebSocket.OPEN
    ) {

        ws.send(JSON.stringify(data));

    }
}


function broadcast(data) {

    const message = JSON.stringify(data);

    for (const player of players.values()) {

        if (
            player.ws &&
            player.ws.readyState === WebSocket.OPEN
        ) {

            player.ws.send(message);

        }

    }
}


/* =========================
   WEBSOCKET CONNECTION
========================= */

wss.on("connection", (ws) => {

    const player = createPlayer(ws);

    console.log(
        "Spieler verbunden:",
        player.id
    );


    send(ws, {
        type: "connected",
        id: player.id,
        name: player.name
    });


    send(ws, {
        type: "serverInfo",
        mapWidth: MAP_WIDTH,
        mapHeight: MAP_HEIGHT
    });


    ws.on("message", (raw) => {

        let data;

        try {

            data = JSON.parse(raw.toString());

        } catch (error) {

            console.log("Ungültige Nachricht");

            return;
        }


        /* NAME */

        if (data.type === "setName") {

            if (
                typeof data.name === "string" &&
                data.name.trim().length > 0
            ) {

                player.name =
                    data.name
                        .trim()
                        .substring(0, 16);

            }

            return;
        }


        /* MOVEMENT */

        if (data.type === "move") {

            player.keys.up = !!data.up;
            player.keys.down = !!data.down;
            player.keys.left = !!data.left;
            player.keys.right = !!data.right;

            return;
        }


        /* STOP */

        if (data.type === "stop") {

            player.keys = {
                up: false,
                down: false,
                left: false,
                right: false
            };

            return;
        }


        /* CREATE BOT */

        if (data.type === "addBot") {

            createPlayer(null, "Bot", true);

            return;
        }


        /* REMOVE BOTS */

        if (data.type === "removeBots") {

            for (const [id, p] of players) {

                if (p.bot) {

                    players.delete(id);

                }

            }

            return;
        }

    });


    ws.on("close", () => {

        console.log(
            "Spieler getrennt:",
            player.id
        );

        players.delete(player.id);

    });


    ws.on("error", (error) => {

        console.log(
            "WebSocket Fehler:",
            error.message
        );

    });

});


/* =========================
   GAME LOOP
========================= */

setInterval(() => {

    for (const player of players.values()) {

        if (player.bot) {

            updateBot(player);

        }

        else {

            updatePlayer(player);

        }

    }

    broadcast({
        type: "state",
        players: getState()
    });

}, 50);


/* =========================
   PLAYER MOVEMENT
========================= */

function updatePlayer(player) {

    let dx = 0;
    let dy = 0;


    if (player.keys.up) {
        dy -= 1;
    }

    if (player.keys.down) {
        dy += 1;
    }

    if (player.keys.left) {
        dx -= 1;
    }

    if (player.keys.right) {
        dx += 1;
    }


    movePlayer(player, dx, dy);

}


/* =========================
   BOT MOVEMENT
========================= */

function updateBot(player) {

    if (!player.botDirection) {

        player.botDirection = {
            x: random(-1, 1),
            y: random(-1, 1)
        };

        player.botTimer =
            Date.now() + random(1000, 3000);

    }


    if (Date.now() > player.botTimer) {

        player.botDirection = {
            x: random(-1, 1),
            y: random(-1, 1)
        };

        player.botTimer =
            Date.now() + random(1000, 3000);

    }


    movePlayer(
        player,
        player.botDirection.x,
        player.botDirection.y
    );

}


/* =========================
   MOVEMENT LIMITS
========================= */

function movePlayer(player, dx, dy) {

    const length =
        Math.sqrt(dx * dx + dy * dy);


    if (length > 0) {

        dx /= length;
        dy /= length;

    }


    player.x += dx * PLAYER_SPEED;
    player.y += dy * PLAYER_SPEED;


    const radius = 25;


    if (player.x < radius) {
        player.x = radius;
    }

    if (player.y < radius) {
        player.y = radius;
    }

    if (player.x > MAP_WIDTH - radius) {
        player.x = MAP_WIDTH - radius;
    }

    if (player.y > MAP_HEIGHT - radius) {
        player.y = MAP_HEIGHT - radius;
    }

}


/* =========================
   SERVER START
========================= */

server.listen(PORT, HOST, () => {

    console.log("--------------------------------");
    console.log("BATTLE ZONE SERVER");
    console.log("--------------------------------");
    console.log(`HTTP: http://${HOST}:${PORT}`);
    console.log(`WebSocket: /ws`);
    console.log(`Health: /health`);
    console.log("--------------------------------");

});
