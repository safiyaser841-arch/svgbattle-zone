const WebSocket = require("ws");
const http = require("http");

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end("Battle Zone Server läuft!");
});

const wss = new WebSocket.Server({
    server
});

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
    "#42a5ff",
    "#ff4d4d",
    "#ffd43b",
    "#9b59ff",
    "#2bd66f",
    "#ff7b39"
];

function randomWeapon() {
    return weapons[
        Math.floor(
            Math.random() * weapons.length
        )
    ];
}

function randomColor() {
    return colors[
        Math.floor(
            Math.random() * colors.length
        )
    ];
}

function createPlayer(id, bot = false) {

    return {
        id,
        bot,

        x: 100 + Math.random() * 800,
        y: 100 + Math.random() * 450,

        angle: 0,

        hp: 100,
        shield: 50,

        kills: 0,
        level: 1,

        weapon: randomWeapon(),

        color: randomColor(),

        alive: true
    };
}

function send(ws, data) {

    if (
        ws &&
        ws.readyState === WebSocket.OPEN
    ) {
        ws.send(
            JSON.stringify(data)
        );
    }
}

function broadcast(room, data) {

    Object.values(room.players)
        .forEach(player => {

            if (player.ws) {
                send(
                    player.ws,
                    data
                );
            }

        });
}

function publicPlayers(room) {

    const result = {};

    Object.values(room.players)
        .forEach(player => {

            result[player.id] = {
                id: player.id,
                x: player.x,
                y: player.y,
                angle: player.angle,
                hp: player.hp,
                shield: player.shield,
                kills: player.kills,
                level: player.level,
                weapon: player.weapon,
                color: player.color,
                alive: player.alive
            };

        });

    return result;
}

function sendState(room) {

    broadcast(room, {
        type: "state",
        players: publicPlayers(room)
    });

}

function addBots(room) {

    for (
        let i = 1;
        i <= 5;
        i++
    ) {

        const id =
            "bot_" +
            i +
            "_" +
            Math.random()
                .toString(36)
                .substring(2, 6);

        room.players[id] =
            createPlayer(
                id,
                true
            );

    }

    sendState(room);
}

function damagePlayer(
    room,
    attacker,
    target
) {

    if (
        !attacker ||
        !target ||
        !target.alive
    ) {
        return;
    }

    const damage = {

        pistol: 12,
        smg: 7,
        shotgun: 22,
        sniper: 35,

        sword: 15,
        hammer: 18

    }[attacker.weapon] || 10;

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

    target.hp -=
        remaining;

    if (
        target.hp <= 0
    ) {

        target.hp = 0;

        target.alive = false;

        attacker.kills++;

        attacker.level =
            1 +
            Math.floor(
                attacker.kills / 2
            );

        broadcast(room, {
            type: "elimination",
            killer: attacker.id,
            victim: target.id
        });

        if (
            attacker.ws
        ) {

            send(
                attacker.ws,
                {
                    type: "levelUp",
                    level: attacker.level
                }
            );

        }

        checkWinner(room);
    }

    sendState(room);
}

function checkWinner(room) {

    const alive =
        Object.values(
            room.players
        ).filter(
            p => p.alive
        );

    if (
        alive.length === 1
    ) {

        broadcast(room, {
            type: "winner",
            id: alive[0].id
        });

    }

}

function movePlayer(
    player,
    dx,
    dy
) {

    const speed = 8;

    player.x +=
        dx * speed;

    player.y +=
        dy * speed;

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

}

function botAI(room) {

    Object.values(room.players)
        .filter(
            p =>
                p.bot &&
                p.alive
        )
        .forEach(bot => {

            const targets =
                Object.values(
                    room.players
                ).filter(
                    p =>
                        p.id !== bot.id &&
                        p.alive
                );

            if (
                targets.length === 0
            ) {
                return;
            }

            let closest =
                targets[0];

            let distance =
                Infinity;

            targets.forEach(target => {

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

                if (
                    d < distance
                ) {

                    distance = d;
                    closest = target;

                }

            });

            const dx =
                closest.x -
                bot.x;

            const dy =
                closest.y -
                bot.y;

            const length =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );

            bot.angle =
                Math.atan2(
                    dy,
                    dx
                );

            if (
                length > 130
            ) {

                movePlayer(
                    bot,
                    dx / length,
                    dy / length
                );

            }

            if (
                length < 280
            ) {

                if (
                    Math.random() < 0.15
                ) {

                    damagePlayer(
                        room,
                        bot,
                        closest
                    );

                }

            }

        });

}

wss.on(
    "connection",
    ws => {

        const id =
            Math.random()
                .toString(36)
                .substring(2, 10);

        send(ws, {
            type: "id",
            id
        });

        ws.on(
            "message",
            message => {

                let data;

                try {

                    data =
                        JSON.parse(
                            message
                        );

                } catch {

                    return;

                }

                if (
                    data.type ===
                    "create"
                ) {

                    const roomCode =
                        data.room
                        .toUpperCase();

                    rooms[roomCode] = {

                        players: {},

                        code: roomCode

                    };

                    const room =
                        rooms[roomCode];

                    const player =
                        createPlayer(
                            id
                        );

                    player.ws =
                        ws;

                    room.players[id] =
                        player;

                    ws.room =
                        roomCode;

                    send(ws, {
                        type: "created",
                        room: roomCode
                    });

                    return;
                }

                if (
                    data.type ===
                    "join"
                ) {

                    const room =
                        rooms[
                            data.room
                                .toUpperCase()
                        ];

                    if (!room) {

                        send(ws, {
                            type: "error",
                            message:
                                "Raum nicht gefunden"
                        });

                        return;

                    }

                    const player =
                        createPlayer(
                            id
                        );

                    player.ws =
                        ws;

                    room.players[id] =
                        player;

                    ws.room =
                        room.code;

                    send(ws, {
                        type: "joined",
                        room: room.code
                    });

                    sendState(room);

                    return;
                }

                const room =
                    rooms[ws.room];

                if (!room) {
                    return;
                }

                const player =
                    room.players[id];

                if (!player) {
                    return;
                }

                if (
                    data.type ===
                    "addBots"
                ) {

                    const botCount =
                        Object.values(
                            room.players
                        ).filter(
                            p => p.bot
                        ).length;

                    if (
                        botCount === 0
                    ) {

                        addBots(room);

                    }

                }

                if (
                    data.type ===
                    "move"
                ) {

                    if (
                        player.alive
                    ) {

                        movePlayer(
                            player,
                            data.dx || 0,
                            data.dy || 0
                        );

                        sendState(room);

                    }

                }

                if (
                    data.type ===
                    "aim"
                ) {

                    player.angle =
                        data.angle || 0;

                }

                if (
                    data.type ===
                    "shoot"
                ) {

                    if (
                        player.alive
                    ) {

                        const targets =
                            Object.values(
                                room.players
                            ).filter(
                                p =>
                                    p.id !==
                                    player.id &&
                                    p.alive
                            );

                        let closest =
                            null;

                        let distance =
                            Infinity;

                        targets.forEach(
                            target => {

                                const dx =
                                    target.x -
                                    player.x;

                                const dy =
                                    target.y -
                                    player.y;

                                const d =
                                    Math.sqrt(
                                        dx * dx +
                                        dy * dy
                                    );

                                if (
                                    d <
                                    distance &&
                                    d < 300
                                ) {

                                    distance = d;
                                    closest = target;

                                }

                            }
                        );

                        if (
                            closest
                        ) {

                            damagePlayer(
                                room,
                                player,
                                closest
                            );

                        }

                    }

                }

            }
        );

        ws.on(
            "close",
            () => {

                const room =
                    rooms[ws.room];

                if (!room) {
                    return;
                }

                delete room.players[id];

                sendState(room);

            }
        );

    }
);

setInterval(
    () => {

        Object.values(
            rooms
        ).forEach(
            room => {

                botAI(room);

                sendState(room);

            }
        );

    },
    500
);

server.listen(
    PORT,
    () => {

        console.log(
            "Battle Zone Server läuft auf Port " +
            PORT
        );

    }
);
