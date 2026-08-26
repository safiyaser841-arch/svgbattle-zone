const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 10000;

app.use(express.static(path.join(__dirname)));

app.get("/health", (req, res) => {
    res.json({
        ok: true,
        game: "Battle Zone"
    });
});

const wss = new WebSocket.Server({
    server
});

const MAP = {
    width: 1600,
    height: 900
};

const PLAYER_RADIUS = 20;

const WALLS = [
    { x: 100, y: 100, w: 300, h: 45 },
    { x: 520, y: 100, w: 260, h: 45 },
    { x: 900, y: 100, w: 300, h: 45 },
    { x: 1320, y: 100, w: 200, h: 45 },

    { x: 180, y: 300, w: 260, h: 45 },
    { x: 620, y: 270, w: 350, h: 45 },
    { x: 1130, y: 300, w: 280, h: 45 },

    { x: 700, y: 420, w: 220, h: 55 },

    { x: 100, y: 700, w: 320, h: 45 },
    { x: 520, y: 720, w: 270, h: 45 },
    { x: 920, y: 690, w: 300, h: 45 },
    { x: 1320, y: 720, w: 200, h: 45 }
];

const WEAPONS = {
    Pistole: {
        damage: 12,
        speed: 18,
        cooldown: 220,
        range: 700,
        pellets: 1,
        spread: 0
    },

    SMG: {
        damage: 6,
        speed: 20,
        cooldown: 85,
        range: 560,
        pellets: 1,
        spread: 0.06
    },

    Gewehr: {
        damage: 19,
        speed: 22,
        cooldown: 320,
        range: 900,
        pellets: 1,
        spread: 0.015
    },

    Schrotflinte: {
        damage: 7,
        speed: 15,
        cooldown: 720,
        range: 370,
        pellets: 6,
        spread: 0.28
    },

    Bogen: {
        damage: 30,
        speed: 13,
        cooldown: 900,
        range: 920,
        pellets: 1,
        spread: 0
    },

    Schwert: {
        damage: 35,
        speed: 0,
        cooldown: 500,
        range: 90,
        pellets: 1,
        spread: 0,
        melee: true
    }
};

const SKINS = [
    {
        id: "standard",
        name: "Rookie",
        rarity: "Standard",
        color: "#38bdf8",
        weapon: "Pistole",
        price: 0,
        damageBonus: 0,
        superNeed: 0,
        super: "Kein Super"
    },

    {
        id: "rare1",
        name: "Blaze",
        rarity: "Selten",
        color: "#ef4444",
        weapon: "SMG",
        price: 50,
        damageBonus: 5,
        superNeed: 500,
        super: "Feuerstoß"
    },

    {
        id: "rare2",
        name: "Frost",
        rarity: "Selten",
        color: "#67e8f9",
        weapon: "Bogen",
        price: 100,
        damageBonus: 5,
        superNeed: 500,
        super: "Eisstoß"
    },

    {
        id: "rare3",
        name: "Volt",
        rarity: "Selten",
        color: "#facc15",
        weapon: "Pistole",
        price: 150,
        damageBonus: 5,
        superNeed: 500,
        super: "Blitz"
    },

    {
        id: "rare4",
        name: "Venom",
        rarity: "Selten",
        color: "#22c55e",
        weapon: "SMG",
        price: 200,
        damageBonus: 5,
        superNeed: 500,
        super: "Giftwelle"
    },

    {
        id: "rare5",
        name: "Crimson",
        rarity: "Selten",
        color: "#dc2626",
        weapon: "Schrotflinte",
        price: 250,
        damageBonus: 5,
        superNeed: 500,
        super: "Rotorkanone"
    },

    {
        id: "super1",
        name: "Shadow",
        rarity: "Superselten",
        color: "#111827",
        weapon: "Schwert",
        price: 350,
        damageBonus: 10,
        superNeed: 1000,
        super: "Teleport-Klinge"
    },

    {
        id: "super2",
        name: "Cyber",
        rarity: "Superselten",
        color: "#06b6d4",
        weapon: "SMG",
        price: 400,
        damageBonus: 10,
        superNeed: 1000,
        super: "Cyber-Salve"
    },

    {
        id: "super3",
        name: "Iceberg",
        rarity: "Superselten",
        color: "#bae6fd",
        weapon: "Bogen",
        price: 450,
        damageBonus: 10,
        superNeed: 1000,
        super: "Eissturm"
    },

    {
        id: "super4",
        name: "Inferno",
        rarity: "Superselten",
        color: "#f97316",
        weapon: "Schrotflinte",
        price: 500,
        damageBonus: 10,
        superNeed: 1000,
        super: "Feuerkreis"
    },

    {
        id: "super5",
        name: "Toxic",
        rarity: "Superselten",
        color: "#84cc16",
        weapon: "Gewehr",
        price: 550,
        damageBonus: 10,
        superNeed: 1000,
        super: "Giftregen"
    },

    {
        id: "epic1",
        name: "Galaxy",
        rarity: "Episch",
        color: "#8b5cf6",
        weapon: "Gewehr",
        price: 650,
        damageBonus: 15,
        superNeed: 1500,
        super: "Galaxiestrahl"
    },

    {
        id: "epic2",
        name: "Neon",
        rarity: "Episch",
        color: "#ec4899",
        weapon: "SMG",
        price: 700,
        damageBonus: 15,
        superNeed: 1500,
        super: "Neon-Sturm"
    },

    {
        id: "epic3",
        name: "Storm",
        rarity: "Episch",
        color: "#60a5fa",
        weapon: "Bogen",
        price: 750,
        damageBonus: 15,
        superNeed: 1500,
        super: "Gewitter"
    },

    {
        id: "epic4",
        name: "Inferno X",
        rarity: "Episch",
        color: "#f43f5e",
        weapon: "Schrotflinte",
        price: 800,
        damageBonus: 15,
        superNeed: 1500,
        super: "Magma-Welle"
    },

    {
        id: "epic5",
        name: "Void",
        rarity: "Episch",
        color: "#312e81",
        weapon: "Schwert",
        price: 850,
        damageBonus: 15,
        superNeed: 1500,
        super: "Void-Schlag"
    },

    {
        id: "mythic1",
        name: "Dragon",
        rarity: "Mythisch",
        color: "#f59e0b",
        weapon: "Bogen",
        price: 1000,
        damageBonus: 25,
        superNeed: 2000,
        super: "Drachenatem"
    },

    {
        id: "mythic2",
        name: "Demon",
        rarity: "Mythisch",
        color: "#7f1d1d",
        weapon: "Schwert",
        price: 1100,
        damageBonus: 25,
        superNeed: 2000,
        super: "Dämonensprung"
    },

    {
        id: "mythic3",
        name: "Titan",
        rarity: "Mythisch",
        color: "#64748b",
        weapon: "Gewehr",
        price: 1200,
        damageBonus: 25,
        superNeed: 2000,
        super: "Titanen-Schuss"
    },

    {
        id: "mythic4",
        name: "Phoenix",
        rarity: "Mythisch",
        color: "#fb923c",
        weapon: "Schrotflinte",
        price: 1300,
        damageBonus: 25,
        superNeed: 2000,
        super: "Phönix-Flamme"
    },

    {
        id: "mythic5",
        name: "Cosmic",
        rarity: "Mythisch",
        color: "#6366f1",
        weapon: "SMG",
        price: 1400,
        damageBonus: 25,
        superNeed: 2000,
        super: "Kosmischer Sturm"
    },

    {
        id: "legend1",
        name: "Legend",
        rarity: "Legendär",
        color: "#facc15",
        weapon: "Gewehr",
        price: 1500,
        damageBonus: 35,
        superNeed: 2500,
        super: "Legendärer Strahl"
    },

    {
        id: "legend2",
        name: "King",
        rarity: "Legendär",
        color: "#fde68a",
        weapon: "Schwert",
        price: 1750,
        damageBonus: 35,
        superNeed: 2500,
        super: "Königsschlag"
    },

    {
        id: "legend3",
        name: "Battle God",
        rarity: "Legendär",
        color: "#ffffff",
        weapon: "Schrotflinte",
        price: 2000,
        damageBonus: 35,
        superNeed: 2500,
        super: "Götterhagel"
    },

    {
        id: "omega",
        name: "Omega",
        rarity: "Spezial",
        color: "#ffffff",
        weapon: "Schwert",
        price: 2001,
        damageBonus: 50,
        superNeed: 3000,
        super: "Omega-Zerstörer"
    }
];

const TUTORIAL = [
    {
        title: "Willkommen",
        text: "Willkommen in Battle Zone."
    },

    {
        title: "Bewegen",
        text: "PC/Laptop: Benutze nur die Pfeiltasten. Auf Handy/iPad benutzt du den Joystick."
    },

    {
        title: "Zielen",
        text: "Auf PC ziehst du mit der Maus. Auf Handy/iPad benutzt du den rechten Zielbereich."
    },

    {
        title: "Waffen",
        text: "Jeder Skin besitzt seine eigene Signaturwaffe."
    },

    {
        title: "Schaden",
        text: "Seltenere Skins verursachen mehr Schaden."
    },

    {
        title: "Super",
        text: "Dein Super lädt sich durch Schaden an Bots auf."
    },

    {
        title: "Bots",
        text: "Beim Erstellen kannst du zwischen 0 und 5 Bots wählen."
    },

    {
        title: "Lobby",
        text: "Teile deinen vierstelligen Raumcode mit deinen Freunden."
    },

    {
        title: "Skins",
        text: "Im Skin-Menü siehst du Vorschau, Name, Preis, Waffe und Super."
    }
];

const rooms = {};

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

function createCode() {
    let code;

    do {
        code =
            Math.random()
                .toString(36)
                .substring(2, 6)
                .toUpperCase();
    } while (rooms[code]);

    return code;
}

function getSkin(id) {
    return (
        SKINS.find(
            skin =>
                skin.id === id
        ) ||
        SKINS[0]
    );
}

function randomPosition() {
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
            !circleHitsWall(
                x,
                y,
                PLAYER_RADIUS
            )
        ) {
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

function collidesWithSomeone(
    room,
    x,
    y,
    radius = 45
) {
    const targets = [
        ...Object.values(
            room.players
        ),
        ...room.bots
    ];

    return targets.some(
        target =>
            target.alive &&
            Math.hypot(
                target.x - x,
                target.y - y
            ) < radius
    );
}

function safeSpawn(room) {
    for (
        let i = 0;
        i < 1000;
        i++
    ) {
        const p =
            randomPosition();

        if (
            !collidesWithSomeone(
                room,
                p.x,
                p.y
            )
        ) {
            return p;
        }
    }

    return randomPosition();
}

function circleHitsWall(
    x,
    y,
    radius
) {
    for (
        const wall of WALLS
    ) {
        const closestX =
            Math.max(
                wall.x,
                Math.min(
                    x,
                    wall.x + wall.w
                )
            );

        const closestY =
            Math.max(
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
    const d =
        Math.hypot(
            x2 - x1,
            y2 - y1
        );

    const steps =
        Math.ceil(
            d / 5
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
            (x2 - x1) *
                t;

        const y =
            y1 +
            (y2 - y1) *
                t;

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

function distance(a, b) {
    return Math.hypot(
        a.x - b.x,
        a.y - b.y
    );
}

function clamp(
    value,
    min,
    max
) {
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
        const p =
            safeSpawn(room);

        const skin =
            SKINS[
                1 +
                (
                    i %
                    5
                )
            ];

        room.bots.push({
            id:
                `bot-${i}-${Math.random()
                    .toString(36)
                    .substring(2, 7)}`,

            name:
                `BOT ${i + 1}`,

            ws: null,

            bot: true,

            x: p.x,
            y: p.y,

            hp: 100,
            shield: 0,

            alive: true,

            kills: 0,

            botDamage: 0,

            skin: skin.id,

            weapon: skin.weapon,

            cooldown: 0,

            target: null
        });
    }
}

function createPlayer(
    socket,
    room,
    data
) {
    const p =
        safeSpawn(room);

    const skin =
        getSkin(
            data.skin
        );

    return {
        id:
            socket.id,

        name:
            String(
                data.name ||
                "Player"
            ).slice(
                0,
                15
            ),

        ws:
            socket,

        bot:
            false,

        x: p.x,
        y: p.y,

        hp: 100,
        shield: 50,

        alive: true,

        kills: 0,

        botDamage: 0,

        superReady: false,

        skin:
            skin.id,

        weapon:
            skin.weapon,

        cooldown: 0
    };
}

function publicEntity(entity) {
    return {
        id: entity.id,
        name: entity.name,
        x: entity.x,
        y: entity.y,
        hp: entity.hp,
        shield: entity.shield || 0,
        alive: entity.alive,
        kills: entity.kills || 0,
        botDamage: entity.botDamage || 0,
        superReady:
            !!entity.superReady,
        skin: entity.skin,
        weapon: entity.weapon,
        bot:
            !!entity.bot
    };
}

function sendState(room) {
    broadcast(
        room,
        {
            type: "state",
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

function damageMultiplier(entity) {
    const skin =
        getSkin(
            entity.skin
        );

    return 1 +
        skin.damageBonus /
        100;
}

function addBotDamage(
    attacker,
    target,
    amount
) {
    if (
        !attacker ||
        !target ||
        !target.bot
    ) {
        return;
    }

    attacker.botDamage =
        (
            attacker.botDamage ||
            0
        ) + amount;

    const skin =
        getSkin(
            attacker.skin
        );

    if (
        skin.superNeed > 0 &&
        attacker.botDamage >=
            skin.superNeed
    ) {
        attacker.superReady =
            true;
    }
}

function applyDamage(
    room,
    target,
    rawDamage,
    attacker
) {
    if (
        !target ||
        !target.alive
    ) {
        return;
    }

    const finalDamage =
        Math.round(
            rawDamage *
            damageMultiplier(
                attacker || {}
            )
        );

    let remaining =
        finalDamage;

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

    if (
        remaining > 0
    ) {
        target.hp -=
            remaining;
    }

    addBotDamage(
        attacker,
        target,
        finalDamage
    );

    broadcast(
        room,
        {
            type: "hitEffect",
            target:
                target.id,
            damage:
                finalDamage,
            botDamage:
                attacker
                    ?.botDamage || 0
        }
    );

    if (
        target.hp > 0
    ) {
        return;
    }

    target.hp = 0;
    target.alive = false;

    if (
        attacker
    ) {
        attacker.kills =
            (
                attacker.kills ||
                0
            ) + 1;
    }

    broadcast(
        room,
        {
            type: "elimination",
            killer:
                attacker
                    ? attacker.id
                    : null,
            victim:
                target.id
        }
    );
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

    const nx =
        entity.x +
        dx *
            speed;

    const ny =
        entity.y +
        dy *
            speed;

    if (
        !circleHitsWall(
            nx,
            entity.y,
            PLAYER_RADIUS
        )
    ) {
        entity.x = nx;
    }

    if (
        !circleHitsWall(
            entity.x,
            ny,
            PLAYER_RADIUS
        )
    ) {
        entity.y = ny;
    }

    entity.x =
        clamp(
            entity.x,
            PLAYER_RADIUS,
            MAP.width -
                PLAYER_RADIUS
        );

    entity.y =
        clamp(
            entity.y,
            PLAYER_RADIUS,
            MAP.height -
                PLAYER_RADIUS
        );
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
    );
}

function spawnBullet(
    room,
    attacker,
    angle,
    weapon
) {
    room.bullets.push({
        id:
            Math.random()
                .toString(36)
                .substring(2),

        owner:
            attacker.id,

        x:
            attacker.x,

        y:
            attacker.y,

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

        travel: 0
    });

    broadcast(
        room,
        {
            type: "bulletSpawn",
            x:
                attacker.x,
            y:
                attacker.y,
            dx:
                Math.cos(angle),
            dy:
                Math.sin(angle),
            speed:
                weapon.speed,
            color:
                getSkin(
                    attacker.skin
                ).color
        }
    );
}

function attack(
    room,
    attacker,
    angle
) {
    const weapon =
        WEAPONS[
            attacker.weapon
        ];

    if (
        !weapon
    ) {
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
        for (
            const target of [
                ...Object.values(
                    room.players
                ),
                ...room.bots
            ]
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

            const ta =
                Math.atan2(
                    target.y -
                        attacker.y,
                    target.x -
                        attacker.x
                );

            const diff =
                Math.atan2(
                    Math.sin(
                        ta -
                            angle
                    ),
                    Math.cos(
                        ta -
                            angle
                    )
                );

            if (
                Math.abs(diff)
                > 0.9
            ) {
                continue;
            }

            applyDamage(
                room,
                target,
                weapon.damage,
                attacker
            );
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

        spawnBullet(
            room,
            attacker,
            shotAngle,
            weapon
        );
    }
}

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

            let hit = false;

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
                    d > 24
                ) {
                    continue;
                }

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

            if (
                hit
            ) {
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
                bot.cooldown >
                0
            ) {
                bot.cooldown--;
            }

            const targets = [
                ...Object.values(
                    room.players
                ),
                ...room.bots
            ].filter(
                target =>
                    target.alive &&
                    target.id !==
                        bot.id
            );

            if (
                targets.length ===
                0
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

            if (
                blocked ||
                d > 140
            ) {
                moveEntity(
                    bot,
                    dx,
                    dy
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

wss.on(
    "connection",
    ws => {

        ws.send(
            JSON.stringify({
                type:
                    "tutorial",
                tutorial:
                    TUTORIAL,
                skins:
                    SKINS,
                map:
                    MAP
            })
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

                if (
                    data.type ===
                    "createRoom"
                ) {
                    const code =
                        createCode();

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

                    room.players[
                        ws.id ||
                        Math.random()
                            .toString(36)
                            .substring(
                                2
                            )
                    ] =
                        player;

                    ws.id =
                        Object.keys(
                            room.players
                        )[0];

                    ws.room =
                        code;

                    createBots(
                        room
                    );

                    send(
                        ws,
                        {
                            type:
                                "roomCreated",
                            code
                        }
                    );

                    sendState(
                        room
                    );
                }

                else if (
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

                    ws.id =
                        Math.random()
                            .toString(36)
                            .substring(
                                2,
                                10
                            );

                    const player =
                        createPlayer(
                            ws,
                            room,
                            data
                        );

                    room.players[
                        ws.id
                    ] =
                        player;

                    ws.room =
                        code;

                    send(
                        ws,
                        {
                            type:
                                "joinedRoom",
                            code
                        }
                    );

                    sendState(
                        room
                    );
                }

                else if (
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
                            ws.id
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
                }

                else if (
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
                            ws.id
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

                    attack(
                        room,
                        player,
                        Math.atan2(
                            dy,
                            dx
                        )
                    );
                }

                else if (
                    data.type ===
                    "changeSkin"
                ) {
                    const room =
                        rooms[
                            ws.room
                        ];

                    if (!room)
                        return;

                    const player =
                        room.players[
                            ws.id
                        ];

                    if (!player)
                        return;

                    const skin =
                        getSkin(
                            data.skin
                        );

                    if (
                        player.kills <
                            skin.price
                    ) {
                        send(
                            ws,
                            {
                                type:
                                    "errorMessage",
                                message:
                                    `Du brauchst ${skin.price} Kills.`
                            }
                        );

                        return;
                    }

                    player.skin =
                        skin.id;

                    player.weapon =
                        skin.weapon;

                    sendState(
                        room
                    );
                }

                else if (
                    data.type ===
                    "useSuper"
                ) {
                    const room =
                        rooms[
                            ws.room
                        ];

                    if (!room)
                        return;

                    const player =
                        room.players[
                            ws.id
                        ];

                    if (
                        !player ||
                        !player.alive ||
                        !player.superReady
                    ) {
                        return;
                    }

                    const skin =
                        getSkin(
                            player.skin
                        );

                    player.superReady =
                        false;

                    player.botDamage =
                        0;

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
                                player.id
                        ) {
                            continue;
                        }

                        if (
                            distance(
                                player,
                                target
                            ) <= 180
                        ) {
                            applyDamage(
                                room,
                                target,
                                40,
                                player
                            );
                        }
                    }

                    sendState(
                        room
                    );

                    broadcast(
                        room,
                        {
                            type:
                                "superEffect",
                            x:
                                player.x,
                            y:
                                player.y,
                            name:
                                skin.super
                        }
                    );
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
                    ws.id
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
            "Battle Zone läuft auf Port " +
            PORT
        );
    }
);

     
