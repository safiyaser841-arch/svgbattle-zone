"use strict";

const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;


/* =========================
   HTTP SERVER
========================= */

const httpServer = http.createServer(
    function(req, res) {

        res.writeHead(200, {
            "Content-Type": "text/plain; charset=utf-8"
        });

        res.end("Battle Zone Server läuft!");
    }
);


/* =========================
   WEBSOCKET SERVER
========================= */

const wss = new WebSocket.Server({
    server: httpServer
});


/* =========================
   GAME SETTINGS
========================= */

const MAP_WIDTH = 1600;
const MAP_HEIGHT = 900;

const PLAYER_SPEED = 5;

const PLAYER_HP = 100;
const PLAYER_SHIELD = 50;

const BULLET_SPEED = 18;
const BULLET_DAMAGE = 20;

const BOT_HP = 130;

const ROOMS = new Map();


/* =========================
   ROOM CODE
========================= */

function createRoomCode() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    do {

        code = "";

        for (let i = 0; i < 4; i++) {

            code +=
                chars[
                    Math.floor(
                        Math.random() *
                        chars.length
                    )
                ];

        }

    } while (ROOMS.has(code));


    return code;
}


/* =========================
   RANDOM POSITION
========================= */

function randomPosition() {

    return {

        x:
            100 +
            Math.random() *
            (MAP_WIDTH - 200),

        y:
            100 +
            Math.random() *
            (MAP_HEIGHT - 200)

    };

}


/* =========================
   PLAYER
========================= */

function createPlayer(
    socket,
    name
) {

    const position =
        randomPosition();


    return {

        id:
            Math.random()
            .toString(36)
            .substring(2, 10),

        socket:

            socket,

        name:
            String(name || "Player")
            .substring(0, 15),

        x:
            position.x,

        y:
            position.y,

        hp:
            PLAYER_HP,

        maxHp:
            PLAYER_HP,

        shield:
            PLAYER_SHIELD,

        kills:
            0,

        alive:
            true,

        angle:
            0,

        lastShot:
            0,

        lastHeal:
            0

    };

}


/* =========================
   BOT
========================= */

function createBot(number) {

    const position =
        randomPosition();


    return {

        id:
            "bot_" +
            number +
            "_" +
            Math.random()
            .toString(36)
            .substring(2, 6),

        name:
            "Bot " + number,

        x:
            position.x,

        y:
            position.y,

        hp:
            BOT_HP,

        maxHp:
            BOT_HP,

        shield:
            20,

        alive:
            true,

        angle:
            0,

        lastShot:
            0,

        targetId:
            null

    };

}


/* =========================
   ROOM
========================= */

function createRoom(
    socket,
    name,
    botCount,
    difficulty
) {

    const code =
        createRoomCode();


    const player =
        createPlayer(
            socket,
            name
        );


    const room = {

        code:
            code,

        players:
            new Map(),

        bots:
            [],

        difficulty:
            difficulty || "medium",

        started:
            false

    };


    room.players.set(
        player.id,
        player
    );


    for (
        let i = 1;
        i <= botCount;
        i++
    ) {

        room.bots.push(
            createBot(i)
        );

    }


    ROOMS.set(
        code,
        room
    );


    socket.roomCode =
        code;

    socket.playerId =
        player.id;


    send(socket, {

        type:
            "roomCreated",

        code:
            code

    });


    return room;

}


/* =========================
   JOIN ROOM
========================= */

function joinRoom(
    socket,
    code,
    name
) {

    const room =
        ROOMS.get(code);


    if (!room) {

        send(socket, {

            type:
                "error",

            message:
                "Lobby nicht gefunden."

        });

        return;

    }


    if (
        room.players.size >= 8
    ) {

        send(socket, {

            type:
                "error",

            message:
                "Lobby ist voll."

        });

        return;

    }


    const player =
        createPlayer(
            socket,
            name
        );


    room.players.set(
        player.id,
        player
    );


    socket.roomCode =
        code;

    socket.playerId =
        player.id;


    send(socket, {

        type:
            "joinedRoom",

        code:
            code

    });

}


/* =========================
   SEND
========================= */

function send(
    socket,
    data
) {

    if (
        socket &&
        socket.readyState ===
        WebSocket.OPEN
    ) {

        socket.send(
            JSON.stringify(data)
        );

    }

}


/* =========================
   BROADCAST
========================= */

function broadcast(
    room,
    data
) {

    room.players.forEach(
        player => {

            send(
                player.socket,
                data
            );

        }
    );

}


/* =========================
   DISTANCE
========================= */

function distance(
    a,
    b
) {

    return Math.sqrt(

        Math.pow(
            a.x - b.x,
            2
        )

        +

        Math.pow(
            a.y - b.y,
            2
        )

    );

}


/* =========================
   MOVE
========================= */

function movePlayer(
    player,
    dx,
    dy
) {

    if (!player.alive)
        return;


    const length =
        Math.sqrt(
            dx * dx +
            dy * dy
        );


    if (length === 0)
        return;


    dx /= length;
    dy /= length;


    player.x +=
        dx *
        PLAYER_SPEED;

    player.y +=
        dy *
        PLAYER_SPEED;


    player.x =
        Math.max(
            30,
            Math.min(
                MAP_WIDTH - 30,
                player.x
            )
        );


    player.y =
        Math.max(
            30,
            Math.min(
                MAP_HEIGHT - 30,
                player.y
            )
        );


    player.angle =
        Math.atan2(
            dy,
            dx
        );

}


/* =========================
   SHOOT
========================= */

function playerShoot(
    room,
    player,
    dx,
    dy
) {

    if (!player.alive)
        return;


    const now =
        Date.now();


    if (
        now -
        player.lastShot <
        250
    ) {

        return;

    }


    player.lastShot =
        now;


    const length =
        Math.sqrt(
            dx * dx +
            dy * dy
        );


    if (length === 0)
        return;


    dx /= length;
    dy /= length;


    player.angle =
        Math.atan2(
            dy,
            dx
        );


    const bullet = {

        id:
            Math.random()
            .toString(36)
            .substring(2),

        owner:
            player.id,

        x:
            player.x,

        y:
            player.y,

        dx:
            dx,

        dy:
            dy,

        life:
            50

    };


    room.bullets =
        room.bullets || [];


    room.bullets.push(
        bullet
    );

}


/* =========================
   DAMAGE
========================= */

function damageTarget(
    room,
    attacker,
    target,
    damage
) {

    if (!target.alive)
        return;


    let remaining =
        damage;


    if (target.shield > 0) {

        const shieldDamage =
            Math.min(
                target.shield,
                remaining
            );


        target.shield -=
            shieldDamage;

        remaining -=
            shieldDamage;

    }


    if (remaining > 0) {

        target.hp -=
            remaining;

    }


    if (target.hp <= 0) {

        target.hp = 0;

        target.alive =
            false;


        if (attacker) {

            attacker.kills++;

        }


        broadcast(
            room,
            {

                type:
                    "elimination",

                killer:
                    attacker
                    ? attacker.id
                    : null,

                victim:
                    target.id

            }
        );


        checkRoundEnd(room);

    }

}


/* =========================
   BULLETS
========================= */

function updateBullets(
    room
) {

    if (!room.bullets)
        room.bullets = [];


    const remaining = [];


    for (
        const bullet of
        room.bullets
    ) {

        bullet.x +=
            bullet.dx *
            BULLET_SPEED;

        bullet.y +=
            bullet.dy *
            BULLET_SPEED;

        bullet.life--;


        if (
            bullet.life <= 0
        )
            continue;


        if (
            bullet.x < 0 ||
            bullet.x > MAP_WIDTH ||
            bullet.y < 0 ||
            bullet.y > MAP_HEIGHT
        ) {

            continue;

        }


        let hit = false;


        /* PLAYERS */

        for (
            const player of
            room.players.values()
        ) {

            if (
                !player.alive ||
                player.id ===
                bullet.owner
            )
                continue;


            const d =
                distance(
                    bullet,
                    player
                );


            if (d < 25) {

                const attacker =
                    findCombatant(
                        room,
                        bullet.owner
                    );


                damageTarget(
                    room,
                    attacker,
                    player,
                    BULLET_DAMAGE
                );


                hit = true;

                break;

            }

        }


        if (hit)
            continue;


        /* BOTS */

        for (
            const bot of
            room.bots
        ) {

            if (!bot.alive)
                continue;


            if (
                bot.id ===
                bullet.owner
            )
                continue;


            const d =
                distance(
                    bullet,
                    bot
                );


            if (d < 25) {

                const attacker =
                    findCombatant(
                        room,
                        bullet.owner
                    );


                damageTarget(
                    room,
                    attacker,
                    bot,
                    BULLET_DAMAGE
                );


                hit = true;

                break;

            }

        }


        if (!hit) {

            remaining.push(
                bullet
            );

        }

    }


    room.bullets =
        remaining;

}


/* =========================
   FIND PLAYER OR BOT
========================= */

function findCombatant(
    room,
    id
) {

    const player =
        room.players.get(id);


    if (player)
        return player;


    return room.bots.find(
        bot =>
            bot.id === id
    ) || null;

}


/* =========================
   SIMPLE BOTS
========================= */

function updateBots(
    room
) {

    const alivePlayers =
        Array.from(
            room.players.values()
        )
        .filter(
            player =>
                player.alive
        );


    for (
        const bot of
        room.bots
    ) {

        if (!bot.alive)
            continue;


        if (
            alivePlayers.length === 0
        )
            continue;


        /* FIND CLOSEST PLAYER */

        let target =
            alivePlayers[0];

        let bestDistance =
            distance(
                bot,
                target
            );


        for (
            const player of
            alivePlayers
        ) {

            const d =
                distance(
                    bot,
                    player
                );


            if (
                d <
                bestDistance
            ) {

                bestDistance =
                    d;

                target =
                    player;

            }

        }


        bot.targetId =
            target.id;


        const dx =
            target.x -
            bot.x;


        const dy =
            target.y -
            bot.y;


        const d =
            Math.sqrt(
                dx * dx +
                dy * dy
            );


        if (d > 120) {

            bot.x +=
                dx / d *
                getBotSpeed(
                    room
                );

            bot.y +=
                dy / d *
                getBotSpeed(
                    room
                );

        }


        bot.angle =
            Math.atan2(
                dy,
                dx
            );


        /* SHOOT */

        if (
            d < 600 &&
            Date.now() -
            bot.lastShot >
            getBotFireRate(
                room
            )
        ) {

            bot.lastShot =
                Date.now();


            const shootX =
                dx / Math.max(
                    d,
                    1
                );


            const shootY =
                dy / Math.max(
                    d,
                    1
                );


            room.bullets =
                room.bullets || [];


            room.bullets.push({

                id:
                    Math.random()
                    .toString(36),

                owner:
                    bot.id,

                x:
                    bot.x,

                y:
                    bot.y,

                dx:
                    shootX,

                dy:
                    shootY,

                life:
                    40

            });

        }

    }

}


/* =========================
   BOT DIFFICULTY
========================= */

function getBotSpeed(room) {

    if (
        room.difficulty ===
        "easy"
    ) {

        return 1.2;

    }


    if (
        room.difficulty ===
        "hard"
    ) {

        return 2.5;

    }


    return 1.8;

}


function getBotFireRate(room) {

    if (
        room.difficulty ===
        "easy"
    ) {

        return 1600;

    }


    if (
        room.difficulty ===
        "hard"
    ) {

        return 700;

    }


    return 1100;

}


/* =========================
   HEAL
========================= */

function healPlayer(
    player
) {

    if (!player.alive)
        return;


    const now =
        Date.now();


    if (
        now -
        player.lastHeal <
        5000
    ) {

        return;

    }


    player.lastHeal =
        now;


    player.hp =
        Math.min(
            player.maxHp,
            player.hp + 30
        );

}


/* =========================
   ROUND END
========================= */

function checkRoundEnd(
    room
) {

    const alivePlayers =
        Array.from(
            room.players.values()
        )
        .filter(
            player =>
                player.alive
        );


    const aliveBots =
        room.bots.filter(
            bot =>
                bot.alive
        );


    if (
        alivePlayers.length === 0
    ) {

        broadcast(
            room,
            {

                type:
                    "roundEnd",

                winner:
                    null

            }
        );

        return;

    }


    if (
        aliveBots.length === 0
    ) {

        const winner =
            alivePlayers[0];


        broadcast(
            room,
            {

                type:
                    "roundEnd",

                winner:
                    winner.id

            }
        );

    }

}


/* =========================
   STATE
========================= */

function sendState(
    room
) {

    const players =
        Array.from(
            room.players.values()
        )
        .map(
            player => ({

                id:
                    player.id,

                name:
                    player.name,

                x:
                    player.x,

                y:
                    player.y,

                hp:
                    player.hp,

                maxHp:
                    player.maxHp,

                shield:
                    player.shield,

                kills:
                    player.kills,

                alive:
                    player.alive,

                angle:
                    player.angle

            })
        );


    const bots =
        room.bots.map(
            bot => ({

                id:
                    bot.id,

                name:
                    bot.name,

                x:
                    bot.x,

                y:
                    bot.y,

                hp:
                    bot.hp,

                maxHp:
                    bot.maxHp,

                shield:
                    bot.shield,

                alive:
                    bot.alive,

                angle:
                    bot.angle

            })
        );


    broadcast(
        room,
        {

            type:
                "state",

            players:
                players,

            bots:
                bots

        }
    );

}


/* =========================
   RESET ROUND
========================= */

function resetRound(
    room
) {

    room.players.forEach(
        player => {

            const position =
                randomPosition();


            player.x =
                position.x;

            player.y =
                position.y;

            player.hp =
                player.maxHp;

            player.shield =
                PLAYER_SHIELD;

            player.alive =
                true;

        }
    );


    room.bots.forEach(
        bot => {

            const position =
                randomPosition();


            bot.x =
                position.x;

            bot.y =
                position.y;

            bot.hp =
                BOT_HP;

            bot.shield =
                20;

            bot.alive =
                true;

        }
    );


    room.bullets =
        [];


    broadcast(
        room,
        {

            type:
                "newRound"

        }
    );

}


/* =========================
   SOCKET CONNECTION
========================= */

wss.on(
"connection",
function(socket) {

    socket.roomCode =
        null;

    socket.playerId =
        null;


    send(
        socket,
        {

            type:
                "connected",

            id:
                "temporary"

        }
    );


    socket.on(
        "message",
        function(raw) {

            try {

                const data =
                    JSON.parse(
                        raw.toString()
                    );


                /* CREATE */

                if (
                    data.type ===
                    "createRoom"
                ) {

                    const botCount =
                        Math.max(
                            0,
                            Math.min(
                                5,
                                Number(
                                    data.bots
                                ) || 0
                            )
                        );


                    createRoom(

                        socket,

                        data.name,

                        botCount,

                        data.difficulty

                    );


                    return;

                }


                /* JOIN */

                if (
                    data.type ===
                    "joinRoom"
                ) {

                    const code =
                        String(
                            data.code ||
                            ""
                        )
                        .toUpperCase();


                    joinRoom(
                        socket,
                        code,
                        data.name
                    );


                    return;

                }


                const room =
                    ROOMS.get(
                        socket.roomCode
                    );


                if (!room)
                    return;


                const player =
                    room.players.get(
                        socket.playerId
                    );


                if (!player)
                    return;


                /* START */

                if (
                    data.type ===
                    "startGame"
                ) {

                    room.started =
                        true;

                    sendState(
                        room
                    );

                    return;

                }


                /* MOVE */

                if (
                    data.type ===
                    "move"
                ) {

                    movePlayer(

                        player,

                        Number(
                            data.dx
                        ) || 0,

                        Number(
                            data.dy
                        ) || 0

                    );

                    return;

                }


                /* SHOOT */

                if (
                    data.type ===
                    "shoot"
                ) {

                    playerShoot(

                        room,

                        player,

                        Number(
                            data.dx
                        ) || 0,

                        Number(
                            data.dy
                        ) || 0

                    );

                    return;

                }


                /* HEAL */

                if (
                    data.type ===
                    "heal"
                ) {

                    healPlayer(
                        player
                    );

                    return;

                }

            } catch (error) {

                console.error(
                    "Message error:",
                    error
                );

            }

        }
    );


    socket.on(
        "close",
        function() {

            const room =
                ROOMS.get(
                    socket.roomCode
                );


            if (!room)
                return;


            room.players.delete(
                socket.playerId
            );


            if (
                room.players.size === 0
            ) {

                ROOMS.delete(
                    socket.roomCode
                );

            }

        }
    );

});


/* =========================
   GAME LOOP
========================= */

setInterval(
function() {

    for (
        const room of
        ROOMS.values()
    ) {

        if (!room.started)
            continue;


        updateBots(
            room
        );


        updateBullets(
            room
        );


        sendState(
            room
        );

    }

}, 50);


/* =========================
   START SERVER
========================= */

httpServer.listen(
    PORT,
    "0.0.0.0",
    function() {

        console.log(
            "================================"
        );

        console.log(
            "BATTLE ZONE SERVER ONLINE"
        );

        console.log(
            "Port:",
            PORT
        );

        console.log(
            "================================"
        );

    }
);
