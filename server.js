const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 10000;

app.use(express.static(path.join(__dirname)));

const MAP = {
    width: 1200,
    height: 700
};

const rooms = {};

const weapons = [
    {
        name: "Pistole",
        damage: 12,
        speed: 14,
        cooldown: 20,
        range: 700,
        color: "#ffffff"
    },
    {
        name: "SMG",
        damage: 6,
        speed: 17,
        cooldown: 7,
        range: 550,
        color: "#22d3ee"
    },
    {
        name: "Gewehr",
        damage: 18,
        speed: 18,
        cooldown: 30,
        range: 850,
        color: "#facc15"
    },
    {
        name: "Schrotflinte",
        damage: 8,
        speed: 13,
        cooldown: 55,
        range: 350,
        pellets: 5,
        color: "#fb923c"
    },
    {
        name: "Bogen",
        damage: 28,
        speed: 11,
        cooldown: 50,
        range: 900,
        color: "#a78bfa"
    },
    {
        name: "Schwert",
        damage: 25,
        speed: 0,
        cooldown: 35,
        range: 80,
        melee: true,
        color: "#ffffff"
    }
];

const skins = [
    "standard",

    "rare1",
    "rare2",
    "rare3",
    "rare4",
    "rare5",

    "super1",
    "super2",
    "super3",
    "super4",
    "super5",

    "epic1",
    "epic2",
    "epic3",
    "epic4",
    "epic5",

    "mythic1",
    "mythic2",
    "mythic3",
    "mythic4",
    "mythic5",

    "legend1",
    "legend2",
    "legend3"
];

const tutorial = [
    {
        title: "Willkommen!",
        text: "Willkommen bei Battle Zone!"
    },
    {
        title: "Bewegen",
        text: "PC/Laptop: Benutze die Pfeiltasten."
    },
    {
        title: "Handy & iPad",
        text: "Benutze den Joystick unten links."
    },
    {
        title: "Schießen",
        text: "Benutze den roten Knopf unten rechts."
    },
    {
        title: "Waffen",
        text: "Du bekommst eine zufällige Waffe."
    },
    {
        title: "Wände",
        text: "Wände blockieren Spieler und Schüsse."
    },
    {
        title: "Bots",
        text: "Du kannst 0 bis 5 Bots auswählen."
    },
    {
        title: "Skins",
        text: "Sammle Kills und schalte Skins frei."
    },
    {
        title: "Lobbys",
        text: "Erstelle eine Lobby und teile den Code."
    }
];

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

function randomWeapon() {

    return weapons[
        Math.floor(
            Math.random() * weapons.length
        )
    ];
}

function distance(a, b) {

    return Math.hypot(
        a.x - b.x,
        a.y - b.y
    );
}

function clamp(value, min, max) {

    return Math.max(
        min,
        Math.min(max, value)
    );
}

function createBots(room) {

    room.bots = [];

    for (
        let i = 0;
        i < room.botCount;
        i++
    ) {

        const weapon =
            randomWeapon();

        room.bots.push({

            id:
                "bot-" +
                i +
                "-" +
                Math.random(),

            name:
                "BOT " +
                (i + 1),

            x:
                150 +
                Math.random() * 900,

            y:
                100 +
                Math.random() * 500,

            hp: 100,

            maxHp: 100,

            alive: true,

            skin:
                i % 2 === 0
                    ? "rare1"
                    : "rare3",

            weapon:
                weapon.name,

            cooldown: 0,

            kills: 0
        });
    }
}

function sendState(roomCode) {

    const room =
        rooms[roomCode];

    if (!room)
        return;

    io.to(roomCode).emit(
        "state",
        {
            players:
                room.players,

            bots:
                room.bots
        }
    );
}

io.on("connection", socket => {

    console.log(
        "Spieler verbunden:",
        socket.id
    );

    socket.emit(
        "tutorial",
        tutorial
    );

    /*
    CREATE ROOM
    */

    socket.on(
        "createRoom",
        data => {

            const roomCode =
                createCode();

            const botCount =
                clamp(
                    Number(data?.bots) || 0,
                    0,
                    5
                );

            rooms[roomCode] = {

                players: {},

                bots: [],

                botCount
            };

            const weapon =
                randomWeapon();

            rooms[
                roomCode
            ].players[
                socket.id
            ] = {

                id:
                    socket.id,

                name:
                    data?.name ||
                    "Player",

                x: 250,

                y: 350,

                hp: 100,

                maxHp: 100,

                alive: true,

                skin:
                    data?.skin ||
                    "standard",

                weapon:
                    weapon.name,

                cooldown: 0,

                kills: 0
            };

            createBots(
                rooms[roomCode]
            );

            socket.join(
                roomCode
            );

            socket.room =
                roomCode;

            socket.emit(
                "roomCreated",
                {
                    code:
                        roomCode
                }
            );

            sendState(
                roomCode
            );
        }
    );

    /*
    JOIN ROOM
    */

    socket.on(
        "joinRoom",
        data => {

            const roomCode =
                String(
                    data?.code || ""
                )
                .trim()
                .toUpperCase();

            const room =
                rooms[roomCode];

            if (!room) {

                socket.emit(
                    "errorMessage",
                    "Diese Lobby existiert nicht."
                );

                return;
            }

            const weapon =
                randomWeapon();

            room.players[
                socket.id
            ] = {

                id:
                    socket.id,

                name:
                    data?.name ||
                    "Player",

                x: 850,

                y: 350,

                hp: 100,

                maxHp: 100,

                alive: true,

                skin:
                    data?.skin ||
                    "standard",

                weapon:
                    weapon.name,

                cooldown: 0,

                kills: 0
            };

            socket.join(
                roomCode
            );

            socket.room =
                roomCode;

            socket.emit(
                "joinedRoom",
                {
                    code:
                        roomCode
                }
            );

            sendState(
                roomCode
            );
        }
    );

    /*
    MOVE
    */

    socket.on(
        "move",
        data => {

            const room =
                rooms[socket.room];

            if (!room)
                return;

            const player =
                room.players[
                    socket.id
                ];

            if (!player)
                return;

            if (!player.alive)
                return;

            const x =
                Number(data?.x);

            const y =
                Number(data?.y);

            if (
                !Number.isFinite(x) ||
                !Number.isFinite(y)
            )
                return;

            player.x =
                clamp(
                    x,
                    30,
                    MAP.width - 30
                );

            player.y =
                clamp(
                    y,
                    30,
                    MAP.height - 30
                );

            sendState(
                socket.room
            );
        }
    );

    /*
    SHOOT
    */

    socket.on(
        "shoot",
        data => {

            const room =
                rooms[socket.room];

            if (!room)
                return;

            const shooter =
                room.players[
                    socket.id
                ];

            if (!shooter)
                return;

            if (!shooter.alive)
                return;

            const weapon =
                weapons.find(
                    w =>
                        w.name ===
                        shooter.weapon
                );

            if (!weapon)
                return;

            if (
                shooter.cooldown > 0
            )
                return;

            shooter.cooldown =
                weapon.cooldown;

            let dx =
                Number(data?.dx);

            let dy =
                Number(data?.dy);

            const length =
                Math.hypot(
                    dx,
                    dy
                );

            if (!length)
                return;

            dx /= length;
            dy /= length;

            /*
            MELEE
            */

            if (weapon.melee) {

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
                        shooter.id
                    )
                        continue;

                    if (
                        distance(
                            shooter,
                            target
                        ) <=
                        weapon.range
                    ) {

                        target.hp -=
                            weapon.damage;

                        if (
                            target.hp <= 0
                        ) {

                            target.hp = 0;

                            target.alive =
                                false;

                            shooter.kills++;

                            io.to(
                                socket.room
                            ).emit(
                                "elimination",
                                {
                                    killer:
                                        shooter.name,

                                    victim:
                                        target.name
                                }
                            );
                        }
                    }
                }

                io.to(
                    socket.room
                ).emit(
                    "meleeEffect",
                    {
                        owner:
                            shooter.id,

                        x:
                            shooter.x,

                        y:
                            shooter.y
                    }
                );

                sendState(
                    socket.room
                );

                return;
            }

            /*
            BULLET
            */

            io.to(
                socket.room
            ).emit(
                "bullet",
                {
                    owner:
                        shooter.id,

                    x:
                        shooter.x,

                    y:
                        shooter.y,

                    dx,

                    dy,

                    speed:
                        weapon.speed,

                    damage:
                        weapon.damage,

                    color:
                        weapon.color
                }
            );
        }
    );

    /*
    SKIN
    */

    socket.on(
        "changeSkin",
        skin => {

            if (
                !skins.includes(skin)
            )
                return;

            const room =
                rooms[socket.room];

            if (!room)
                return;

            const player =
                room.players[
                    socket.id
                ];

            if (!player)
                return;

            player.skin =
                skin;

            sendState(
                socket.room
            );
        }
    );

    /*
    TUTORIAL
    */

    socket.on(
        "tutorialComplete",
        () => {

            socket.emit(
                "tutorialFinished"
            );
        }
    );

    /*
    DISCONNECT
    */

    socket.on(
        "disconnect",
        () => {

            const roomCode =
                socket.room;

            if (
                !roomCode ||
                !rooms[roomCode]
            )
                return;

            delete rooms[
                roomCode
            ].players[
                socket.id
            ];

            if (
                Object.keys(
                    rooms[
                        roomCode
                    ].players
                ).length === 0
            ) {

                delete rooms[
                    roomCode
                ];

            } else {

                sendState(
                    roomCode
                );
            }
        }
    );
});

/*
BOT AI
*/

setInterval(() => {

    for (
        const roomCode
        in rooms
    ) {

        const room =
            rooms[
                roomCode
            ];

        /*
        Player cooldowns
        */

        for (
            const player
            of Object.values(
                room.players
            )
        ) {

            if (
                player.cooldown > 0
            ) {

                player.cooldown--;
            }
        }

        /*
        BOT AI
        */

        for (
            const bot
            of room.bots
        ) {

            if (!bot.alive)
                continue;

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
                p =>
                    p.alive &&
                    p.id !== bot.id
            );

            if (
                targets.length === 0
            )
                continue;

            targets.sort(
                (a, b) =>
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

            /*
            Bewegung
            */

            if (
                d > 120
            ) {

                bot.x +=
                    dx /
                    d *
                    1.4;

                bot.y +=
                    dy /
                    d *
                    1.4;
            }

            /*
            Angriff
            */

            const weapon =
                weapons.find(
                    w =>
                        w.name ===
                        bot.weapon
                );

            if (!weapon)
                continue;

            if (
                bot.cooldown <= 0 &&
                d <= weapon.range
            ) {

                bot.cooldown =
                    weapon.cooldown;

                if (
                    weapon.melee
                ) {

                    target.hp -=
                        weapon.damage;

                    if (
                        target.hp <= 0
                    ) {

                        target.hp = 0;

                        target.alive =
                            false;

                        io.to(
                            roomCode
                        ).emit(
                            "elimination",
                            {
                                killer:
                                    bot.name,

                                victim:
                                    target.name
                            }
                        );
                    }

                } else {

                    io.to(
                        roomCode
                    ).emit(
                        "bullet",
                        {
                            owner:
                                bot.id,

                            x:
                                bot.x,

                            y:
                                bot.y,

                            dx:
                                dx / d,

                            dy:
                                dy / d,

                            speed:
                                weapon.speed,

                            damage:
                                weapon.damage,

                            color:
                                weapon.color
                        }
                    );
                }
            }
        }

        sendState(
            roomCode
        );
    }

}, 1000 / 30);

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
