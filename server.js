const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 10000;

app.use(express.static(path.join(__dirname)));

app.get("/health", (_req, res) => {
    res.json({
        ok: true,
        game: "Battle Zone"
    });
});

const wss = new WebSocket.Server({
    server
});

/* =========================================
   MAP
========================================= */

const MAP = {
    width: 1600,
    height: 900
};

const WALLS = [
    { x: 100, y: 90,  w: 300, h: 45 },
    { x: 500, y: 90,  w: 260, h: 45 },
    { x: 900, y: 90,  w: 300, h: 45 },
    { x: 1320, y: 90,  w: 200, h: 45 },

    { x: 150, y: 290, w: 260, h: 45 },
    { x: 600, y: 260, w: 360, h: 45 },
    { x: 1150, y: 290, w: 300, h: 45 },

    { x: 690, y: 405, w: 220, h: 70 },

    { x: 90,  y: 700, w: 300, h: 45 },
    { x: 500, y: 730, w: 280, h: 45 },
    { x: 910, y: 700, w: 300, h: 45 },
    { x: 1300, y: 730, w: 220, h: 45 }
];

/* =========================================
   WEAPONS
========================================= */

const WEAPONS = {
    Pistole: {
        damage: 12,
        speed: 20,
        cooldown: 10,
        range: 760,
        pellets: 1,
        spread: 0
    },

    SMG: {
        damage: 6,
        speed: 21,
        cooldown: 4,
        range: 560,
        pellets: 1,
        spread: 0.08
    },

    Gewehr: {
        damage: 19,
        speed: 24,
        cooldown: 16,
        range: 950,
        pellets: 1,
        spread: 0.02
    },

    Schrotflinte: {
        damage: 7,
        speed: 17,
        cooldown: 30,
        range: 380,
        pellets: 6,
        spread: 0.24
    },

    Bogen: {
        damage: 30,
        speed: 15,
        cooldown: 28,
        range: 950,
        pellets: 1,
        spread: 0
    },

    Schwert: {
        damage: 35,
        speed: 0,
        cooldown: 20,
        range: 90,
        pellets: 1,
        melee: true
    }
};

const WEAPON_NAMES = Object.keys(WEAPONS);

/* =========================================
   ROOMS
========================================= */

const rooms = {};

/* =========================================
   HELPERS
========================================= */

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
    for (
        const player of Object.values(
            room.players
        )
    ) {
        send(
            player.ws,
            data
        );
    }
}

function randomCode() {
    return Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();
}

function createRoomCode() {
    let code = randomCode();

    while (rooms[code]) {
        code = randomCode();
    }

    return code;
}

function clamp(value, min, max) {
    return Math.max(
        min,
        Math.min(max, value)
    );
}

function distance(a, b) {
    return Math.hypot(
        a.x - b.x,
        a.y - b.y
    );
}

function randomWeapon() {
    return WEAPON_NAMES[
        Math.floor(
            Math.random() *
            WEAPON_NAMES.length
        )
    ];
}

/* =========================================
   COLLISION
========================================= */

function circleHitsWall(
    x,
    y,
    radius
) {
    for (
        const wall of WALLS
    ) {
        const closestX = Math.max(
            wall.x,
            Math.min(
                x,
                wall.x + wall.w
            )
        );

        const closestY = Math.max(
            wall.y,
            Math.min(
                y,
                wall.y + wall.h
            )
        );

        const dx =
            x - closestX;

        const dy =
            y - closestY;

        if (
            dx * dx +
            dy * dy <
            radius * radius
        ) {
            return true;
        }
    }

    return false;
}

function lineHitsWall(
    x1,
    y1,
    x2,
    y2
) {
    const d = Math.hypot(
        x2 - x1,
        y2 - y1
    );

    const steps = Math.max(
        1,
        Math.ceil(d / 4)
    );

    for (
        let i = 0;
        i <= steps;
        i++
    ) {
        const t =
            i / steps;

        const x =
            x1 +
            (x2 - x1) * t;

        const y =
            y1 +
            (y2 - y1) * t;

        for (
            const wall of WALLS
        ) {
            if (
                x >= wall.x &&
                x <= wall.x + wall.w &&
                y >= wall.y &&
                y <= wall.y + wall.h
            ) {
                return true;
            }
        }
    }

    return false;
}

/* =========================================
   SPAWN
========================================= */

function randomSpawn(room) {

    for (
        let i = 0;
        i < 1000;
        i++
    ) {
        const x =
            40 +
            Math.random() *
            (MAP.width - 80);

        const y =
            40 +
            Math.random() *
            (MAP.height - 80);

        if (
            circleHitsWall(
                x,
                y,
                22
            )
        ) {
            continue;
        }

        const occupied =
            [
                ...Object.values(
                    room.players
                ),
                ...room.bots
            ].some(
                entity =>
                    entity.alive &&
                    Math.hypot(
                        entity.x - x,
                        entity.y - y
                    ) < 70
            );

        if (!occupied) {
            return {
                x,
                y
            };
        }
    }

    return {
        x: MAP.width / 2,
        y: MAP.height / 2
    };
}

/* =========================================
   ENTITY
========================================= */

function createPlayer(
    socket,
    room,
    data
) {
    const spawn =
        randomSpawn(room);

    const weapon =
        randomWeapon();

    return {
        id:
            socket.id,

        ws:
            socket,

        bot:
            false,

        name:
            String(
                data?.name ||
                "Player"
            ).slice(
                0,
                15
            ),

        x:
            spawn.x,

        y:
            spawn.y,

        hp:
            100,

        shield:
            50,

        alive:
            true,

        weapon,

        kills:
            0,

        skin:
            data?.skin ||
            "standard",

        cooldown:
            0
    };
}

function createBots(room) {

    room.bots = [];

    for (
        let i = 0;
        i < room.botCount;
        i++
    ) {
        const spawn =
            randomSpawn(room);

        room.bots.push({
            id:
                "bot-" +
                i +
                "-" +
                Math.random()
                    .toString(36)
                    .substring(2, 7),

            ws:
                null,

            bot:
                true,

            name:
                "BOT " +
                (i + 1),

            x:
                spawn.x,

            y:
                spawn.y,

            hp:
                100,

            shield:
                50,

            alive:
                true,

            weapon:
                randomWeapon(),

            kills:
                0,

            skin:
                i % 2 === 0
                    ? "rare1"
                    : "rare3",

            cooldown:
                Math.floor(
                    Math.random() * 30
                ),

            target:
                null
        });
    }
}

/* =========================================
   PUBLIC STATE
========================================= */

function publicEntity(entity) {
    return {
        id:
            entity.id,

        name:
            entity.name,

        x:
            Math.round(
                entity.x
            ),

        y:
            Math.round(
                entity.y
            ),

        hp:
            Math.max(
                0,
                Math.round(
                    entity.hp
                )
            ),

        shield:
            Math.max(
                0,
                Math.round(
                    entity.shield || 0
                )
            ),

        alive:
            entity.alive,

        weapon:
            entity.weapon,

        skin:
            entity.skin,

        kills:
            entity.kills || 0,

        bot:
            !!entity.bot
    };
}

function sendState(room) {
    broadcast(
        room,
        {
            type:
                "state",

            map:
                MAP,

            walls:
                WALLS,

            players:
                Object.values(
                    room.players
                ).map(
                    publicEntity
                ),

            bots:
                room.bots.map(
                    publicEntity
                )
        }
    );
}

/* =========================================
   DAMAGE
========================================= */

function applyDamage(
    room,
    target,
    damage,
    attacker
) {
    if (
        !target ||
        !target.alive
    ) {
        return;
    }

    let remaining =
        damage;

    if (
        target.shield > 0
    ) {
        const blocked =
            Math.min(
                target.shield,
                remaining
            );

        target.shield -=
            blocked;

        remaining -=
            blocked;
    }

    target.hp -=
        remaining;

    broadcast(
        room,
        {
            type:
                "hitEffect",

            target:
                target.id,

            damage:
                damage
        }
    );

    if (
        target.hp > 0
    ) {
        return;
    }

    target.hp = 0;
    target.alive = false;

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

    sendState(room);
}

/* =========================================
   BULLETS
========================================= */

function createBullet(
    room,
    owner,
    angle,
    weapon
) {
    room.bullets.push({
        owner:
            owner.id,

        x:
            owner.x,

        y:
            owner.y,

        dx:
            Math.cos(angle),

        dy:
            Math.sin(angle),

        speed:
            weapon.speed,

        damage:
            weapon.damage,

        range:
            weapon.range,

        travel:
            0,

        color:
            "#facc15"
    });

    broadcast(
        room,
        {
            type:
                "bulletSpawn",

            x:
                owner.x,

            y:
                owner.y,

            dx:
                Math.cos(angle),

            dy:
                Math.sin(angle),

            speed:
                weapon.speed,

            color:
                "#facc15"
        }
    );
}

/* =========================================
   ATTACK
========================================= */

function attack(
    room,
    attacker,
    angle
) {
    const weapon =
        WEAPONS[
            attacker.weapon
        ];

    if (!weapon) {
        return;
    }

    if (
        attacker.cooldown > 0
    ) {
        return;
    }

    attacker.cooldown =
        weapon.cooldown;

    if (
        weapon.melee
    ) {
        const targets = [
            ...Object.values(
                room.players
            ),
            ...room.bots
        ];

        for (
            const target
            of targets
        ) {
            if (
                !target.alive ||
                target.id ===
                    attacker.id
            ) {
                continue;
            }

            const d =
                distance(
                    attacker,
                    target
                );

            if (
                d >
                weapon.range
            ) {
                continue;
            }

            if (
                lineHitsWall(
                    attacker.x,
                    attacker.y,
                    target.x,
                    target.y
                )
            ) {
                continue;
            }

            const targetAngle =
                Math.atan2(
                    target.y -
                        attacker.y,
                    target.x -
                        attacker.x
                );

            const diff =
                Math.atan2(
                    Math.sin(
                        targetAngle -
                            angle
                    ),
                    Math.cos(
                        targetAngle -
                            angle
                    )
                );

            if (
                Math.abs(diff)
                <= 0.9
            ) {
                applyDamage(
                    room,
                    target,
                    weapon.damage,
                    attacker
                );
            }
        }

        broadcast(
            room,
            {
                type:
                    "meleeEffect",

                x:
                    attacker.x,

                y:
                    attacker.y,

                angle
            }
        );

        return;
    }

    const pellets =
        weapon.pellets ||
        1;

    for (
        let i = 0;
        i < pellets;
        i++
    ) {
        const spread =
            weapon.spread ||
            0;

        const shotAngle =
            angle +
            (
                Math.random() -
                0.5
            ) *
                spread;

        createBullet(
            room,
            attacker,
            shotAngle,
            weapon
        );
    }
}

/* =========================================
   BULLET PHYSICS
========================================= */

function updateBullets() {

    for (
        const room of
        Object.values(rooms)
    ) {
        for (
            let i =
                room.bullets.length -
                1;

            i >= 0;

            i--
        ) {
            const bullet =
                room.bullets[i];

            const oldX =
                bullet.x;

            const oldY =
                bullet.y;

            bullet.x +=
                bullet.dx *
                bullet.speed;

            bullet.y +=
                bullet.dy *
                bullet.speed;

            bullet.travel +=
                bullet.speed;

            /*
            Wand
            */

            if (
                lineHitsWall(
                    oldX,
                    oldY,
                    bullet.x,
                    bullet.y
                )
            ) {
                broadcast(
                    room,
                    {
                        type:
                            "bulletImpact",

                        x:
                            bullet.x,

                        y:
                            bullet.y
                    }
                );

                room.bullets.splice(
                    i,
                    1
                );

                continue;
            }

            /*
            Gegner
            */

            const targets = [
                ...Object.values(
                    room.players
                ),
                ...room.bots
            ];

            let hit = false;

            for (
                const target
                of targets
            ) {
                if (
                    !target.alive ||
                    target.id ===
                        bullet.owner
                ) {
                    continue;
                }

                const d =
                    Math.hypot(
                        target.x -
                            bullet.x,
                        target.y -
                            bullet.y
                    );

                if (
                    d >
                    24
                ) {
                    continue;
                }

                /*
                Sicherheitsprüfung:
                keine Wand zwischen Kugel
                und Ziel.
                */

                if (
                    lineHitsWall(
                        oldX,
                        oldY,
                        target.x,
                        target.y
                    )
                ) {
                    continue;
                }

                const attacker =
                    findEntity(
                        room,
                        bullet.owner
                    );

                applyDamage(
                    room,
                    target,
                    bullet.damage,
                    attacker
                );

                broadcast(
                    room,
                    {
                        type:
                            "bulletHit",

                        x:
                            target.x,

                        y:
                            target.y,

                        damage:
                            bullet.damage
                    }
                );

                room.bullets.splice(
                    i,
                    1
                );

                hit = true;

                break;
            }

            if (hit) {
                continue;
            }

            if (
                bullet.travel >=
                bullet.range
            ) {
                room.bullets.splice(
                    i,
                    1
                );
            }
        }
    }
}

function findEntity(
    room,
    id
) {
    if (
        room.players[id]
    ) {
        return room.players[id];
    }

    return room.bots.find(
        bot =>
            bot.id === id
    ) || null;
}

/* =========================================
   BOT AI
========================================= */

function updateBots() {

    for (
        const room of
        Object.values(rooms)
    ) {
        for (
            const bot of
            room.bots
        ) {
            if (
                !bot.alive
            ) {
                continue;
            }

            if (
                bot.cooldown > 0
            ) {
                bot.cooldown--;
            }

            const targets = [
                ...Object.values(
                    room.players
                ),
                ...room.bots
            ].filter(
                entity =>
                    entity.alive &&
                    entity.id !==
                        bot.id
            );

            if (
                targets.length === 0
            ) {
                continue;
            }

            targets.sort(
                (a,b) =>
                    distance(
                        bot,
                        a
                    ) -
                    distance(
                        bot,
                        b
                    )
            );

            const target =
                targets[0];

            bot.target =
                target.id;

            const dx =
                target.x -
                bot.x;

            const dy =
                target.y -
                bot.y;

            const d =
                Math.hypot(
                    dx,
                    dy
                ) || 1;

            const angle =
                Math.atan2(
                    dy,
                    dx
                );

            const weapon =
                WEAPONS[
                    bot.weapon
                ];

            if (!weapon) {
                continue;
            }

            const blocked =
                lineHitsWall(
                    bot.x,
                    bot.y,
                    target.x,
                    target.y
                );

            /*
            Kein Schuss durch Wände.
            */

            if (
                blocked ||
                d > 130
            ) {
                moveEntity(
                    bot,
                    dx / d,
                    dy / d
                );
            }

            if (
                !blocked &&
                d <=
                    weapon.range &&
                bot.cooldown <=
                    0
            ) {
                attack(
                    room,
                    bot,
                    angle
                );
            }
        }
    }
}

function moveEntity(
    entity,
    dx,
    dy
) {
    const length =
        Math.hypot(
            dx,
            dy
        );

    if (
        length === 0
    ) {
        return;
    }

    dx /= length;
    dy /= length;

    const speed =
        entity.bot
            ? 3
            : 5;

    const nextX =
        entity.x +
        dx *
            speed;

    const nextY =
        entity.y +
        dy *
            speed;

    /*
    X-Kollision
    */

    if (
        !circleHitsWall(
            nextX,
            entity.y,
            20
        )
    ) {
        entity.x =
            nextX;
    }

    /*
    Y-Kollision
    */

    if (
        !circleHitsWall(
            entity.x,
            nextY,
            20
        )
    ) {
        entity.y =
            nextY;
    }

    entity.x =
        clamp(
            entity.x,
            20,
            MAP.width - 20
        );

    entity.y =
        clamp(
            entity.y,
            20,
            MAP.height - 20
        );
}

/* =========================================
   WEBSOCKET
========================================= */

wss.on(
    "connection",
    ws => {

        const id =
            Math.random()
                .toString(36)
                .substring(
                    2,
                    10
                );

        ws.clientId =
            id;

        send(
            ws,
            {
                type:
                    "connected",
                id,
                map:
                    MAP,
                walls:
                    WALLS,
                weapons:
                    WEAPON_NAMES,
                tutorial: [
                    {
                        title:
                            "Bewegen",
                        text:
                            "PC/Laptop: nur die Pfeiltasten. Handy/iPad: linker Joystick."
                    },
                    {
                        title:
                            "Zielen",
                        text:
                            "PC: Maus. Handy/iPad: rechter Bereich."
                    },
                    {
                        title:
                            "Schießen",
                        text:
                            "PC: Linksklick. Handy/iPad: roter Button."
                    },
                    {
                        title:
                            "Wände",
                        text:
                            "Spieler, Bots und Kugeln können nicht durch Wände."
                    }
                ]
            }
        );

        ws.on(
            "message",
            raw => {

                let data;

                try {
                    data =
                        JSON.parse(
                            raw.toString()
                        );
                } catch {
                    return;
                }

                /*
                ==================================
                RAUM ERSTELLEN
                ==================================
                */

                if (
                    data.type ===
                    "createRoom"
                ) {

                    const code =
                        createRoomCode();

                    const botCount =
                        clamp(
                            Number(
                                data.bots
                            ) || 0,
                            0,
                            5
                        );

                    const room = {
                        code,
                        players: {},
                        bots: [],
                        bullets: [],
                        botCount
                    };

                    rooms[code] =
                        room;

                    const player =
                        createPlayer(
                            ws,
                            room,
                            data
                        );

                    /*
                    Wichtig:
                    eigener Schlüssel entspricht
                    ws.clientId
                    */

                    player.id =
                        ws.clientId;

                    room.players[
                        ws.clientId
                    ] =
                        player;

                    createBots(
                        room
                    );

                    ws.room =
                        code;

                    send(
                        ws,
                        {
                            type:
                                "roomCreated",

                            code,

                            weapon:
                                player.weapon
                        }
                    );

                    sendState(
                        room
                    );

                    return;
                }

                /*
                ==================================
                RAUM BEITRETEN
                ==================================
                */

                if (
                    data.type ===
                    "joinRoom"
                ) {

                    const code =
                        String(
                            data.code ||
                            ""
                        )
                            .trim()
                            .toUpperCase();

                    const room =
                        rooms[code];

                    if (!room) {

                        send(
                            ws,
                            {
                                type:
                                    "errorMessage",

                                message:
                                    "Lobby nicht gefunden."
                            }
                        );

                        return;
                    }

                    const player =
                        createPlayer(
                            ws,
                            room,
                            data
                        );

                    player.id =
                        ws.clientId;

                    room.players[
                        ws.clientId
                    ] =
                        player;

                    ws.room =
                        code;

                    send(
                        ws,
                        {
                            type:
                                "joinedRoom",

                            code,

                            weapon:
                                player.weapon
                        }
                    );

                    sendState(
                        room
                    );

                    return;
                }

                /*
                ==================================
                BEWEGUNG
                ==================================
                */

                if (
                    data.type ===
                    "moveIntent"
                ) {

                    const room =
                        rooms[
                            ws.room
                        ];

                    if (!room)
                        return;

                    const player =
                        room.players[
                            ws.clientId
                        ];

                    if (
                        !player ||
                        !player.alive
                    ) {
                        return;
                    }

                    moveEntity(
                        player,
                        Number(
                            data.dx
                        ) || 0,
                        Number(
                            data.dy
                        ) || 0
                    );

                    sendState(
                        room
                    );

                    return;
                }

                /*
                ==================================
                SCHIESSEN
                ==================================
                */

                if (
                    data.type ===
                    "shoot"
                ) {

                    const room =
                        rooms[
                            ws.room
                        ];

                    if (!room)
                        return;

                    const player =
                        room.players[
                            ws.clientId
                        ];

                    if (
                        !player ||
                        !player.alive
                    ) {
                        return;
                    }

                    const dx =
                        Number(
                            data.dx
                        );

                    const dy =
                        Number(
                            data.dy
                        );

                    if (
                        !Number.isFinite(
                            dx
                        ) ||
                        !Number.isFinite(
                            dy
                        )
                    ) {
                        return;
                    }

                    const angle =
                        Math.atan2(
                            dy,
                            dx
                        );

                    attack(
                        room,
                        player,
                        angle
                    );

                    return;
                }
            }
        );

        ws.on(
            "close",
            () => {

                const room =
                    rooms[
                        ws.room
                    ];

                if (!room)
                    return;

                delete room.players[
                    ws.clientId
                ];

                if (
                    Object.keys(
                        room.players
                    ).length ===
                    0
                ) {
                    delete rooms[
                        ws.room
                    ];
                } else {
                    sendState(
                        room
                    );
                }
            }
        );
    }
);

/* =========================================
   SERVER TICK
========================================= */

setInterval(
    () => {

        updateBots();
        updateBullets();

        for (
            const room of
            Object.values(rooms)
        ) {

            for (
                const player of
                Object.values(
                    room.players
                )
            ) {

                if (
                    player.cooldown >
                    0
                ) {
                    player.cooldown--;
                }
            }

            sendState(
                room
            );
        }

    },
    1000 / 30
);

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "Battle Zone Server läuft auf Port " +
            PORT
        );
    }
);

     
