"use strict";

const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

const PORT = Number(process.env.PORT) || 10000;

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

/* =====================================================
   MAP
===================================================== */

const MAP = {
    width: 1600,
    height: 900
};

const PLAYER_RADIUS = 20;
const MIN_SPAWN_DISTANCE = 180;
const MAX_PLAYERS = 8;

/* =====================================================
   WÄNDE
===================================================== */

const WALLS = [
    { x: 80, y: 80, w: 300, h: 45 },
    { x: 500, y: 80, w: 280, h: 45 },
    { x: 860, y: 80, w: 300, h: 45 },
    { x: 1260, y: 80, w: 250, h: 45 },

    { x: 150, y: 290, w: 260, h: 45 },
    { x: 570, y: 255, w: 360, h: 45 },
    { x: 1090, y: 290, w: 300, h: 45 },

    { x: 680, y: 405, w: 240, h: 70 },

    { x: 80, y: 700, w: 300, h: 45 },
    { x: 470, y: 725, w: 300, h: 45 },
    { x: 900, y: 700, w: 300, h: 45 },
    { x: 1290, y: 725, w: 230, h: 45 }
];

/* =====================================================
   SCHWIERIGKEIT
===================================================== */

const DIFFICULTIES = {
    easy: {
        name: "Leicht",
        botSpeed: 1.8,
        accuracy: 0.72,
        fireChance: 0.45,
        damage: 0.8
    },

    medium: {
        name: "Mittel",
        botSpeed: 2.5,
        accuracy: 0.86,
        fireChance: 0.7,
        damage: 1
    },

    hard: {
        name: "Schwer",
        botSpeed: 3.2,
        accuracy: 0.95,
        fireChance: 0.9,
        damage: 1.1
    }
};

/* =====================================================
   WAFFEN
===================================================== */

const WEAPONS = {
    Pistole: {
        damage: 12,
        speed: 18,
        cooldown: 10,
        range: 760,
        pellets: 1,
        spread: 0,
        melee: false
    },

    SMG: {
        damage: 6,
        speed: 20,
        cooldown: 4,
        range: 560,
        pellets: 1,
        spread: 0.08,
        melee: false
    },

    Gewehr: {
        damage: 19,
        speed: 22,
        cooldown: 16,
        range: 900,
        pellets: 1,
        spread: 0.02,
        melee: false
    },

    Schrotflinte: {
        damage: 7,
        speed: 15,
        cooldown: 30,
        range: 380,
        pellets: 6,
        spread: 0.28,
        melee: false
    },

    Bogen: {
        damage: 30,
        speed: 14,
        cooldown: 28,
        range: 950,
        pellets: 1,
        spread: 0,
        melee: false
    },

    Schwert: {
        damage: 35,
        speed: 0,
        cooldown: 18,
        range: 88,
        pellets: 1,
        spread: 0,
        melee: true
    }
};

/* =====================================================
   SKINS
===================================================== */

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
        healthBonus: 0,
        shieldBonus: 0
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
        healthBonus: 10,
        shieldBonus: 10
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
        healthBonus: 10,
        shieldBonus: 10
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
        healthBonus: 10,
        shieldBonus: 10
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
        healthBonus: 10,
        shieldBonus: 10
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
        healthBonus: 10,
        shieldBonus: 10
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
        healthBonus: 45,
        shieldBonus: 35
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
        healthBonus: 20,
        shieldBonus: 20
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
        healthBonus: 20,
        shieldBonus: 20
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
        healthBonus: 20,
        shieldBonus: 20
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
        healthBonus: 20,
        shieldBonus: 20
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
        healthBonus: 30,
        shieldBonus: 25
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
        healthBonus: 30,
        shieldBonus: 25
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
        healthBonus: 30,
        shieldBonus: 25
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
        healthBonus: 30,
        shieldBonus: 25
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
        healthBonus: 55,
        shieldBonus: 45
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
        healthBonus: 40,
        shieldBonus: 35
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
        healthBonus: 70,
        shieldBonus: 55
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
        healthBonus: 40,
        shieldBonus: 35
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
        healthBonus: 40,
        shieldBonus: 35
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
        healthBonus: 40,
        shieldBonus: 35
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
        healthBonus: 50,
        shieldBonus: 45
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
        healthBonus: 90,
        shieldBonus: 70
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
        healthBonus: 50,
        shieldBonus: 45
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
        healthBonus: 120,
        shieldBonus: 90
    }
];

const rooms = {};

/* =====================================================
   BASIC
===================================================== */

function send(ws, data) {
    if (
        ws &&
        ws.readyState ===
            WebSocket.OPEN
    ) {
        ws.send(
            JSON.stringify(data)
        );
    }
}

function broadcast(room, data) {
    for (
        const player
        of Object.values(room.players)
    ) {
        send(
            player.ws,
            data
        );
    }
}

function clamp(
    value,
    min,
    max
) {
    return Math.max(
        min,
        Math.min(
            max,
            value
        )
    );
}

function distance(a, b) {
    return Math.hypot(
        a.x - b.x,
        a.y - b.y
    );
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

function randomWeapon() {
    const names =
        Object.keys(
            WEAPONS
        );

    return names[
        Math.floor(
            Math.random() *
            names.length
        )
    ];
}

function createRoomCode() {
    let code;

    do {
        code =
            Math.random()
                .toString(36)
                .substring(
                    2,
                    6
                )
                .toUpperCase();
    } while (
        rooms[code]
    );

    return code;
}

/* =====================================================
   COLLISION
===================================================== */

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
                    wall.x +
                        wall.w
                )
            );

        const closestY =
            Math.max(
                wall.y,
                Math.min(
                    y,
                    wall.y +
                        wall.h
                )
            );

        const dx =
            x - closestX;

        const dy =
            y - closestY;

        if (
            dx * dx +
                dy * dy <
            radius *
                radius
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
        Math.max(
            1,
            Math.ceil(
                d / 4
            )
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
                x <=
                    wall.x +
                    wall.w &&
                y >= wall.y &&
                y <=
                    wall.y +
                    wall.h
            ) {
                return true;
            }
        }
    }

    return false;
}

/* =====================================================
   SPAWN
===================================================== */

function safeSpawn(room) {

    for (
        let attempt = 0;
        attempt < 3000;
        attempt++
    ) {
        const x =
            50 +
            Math.random() *
                (
                    MAP.width -
                    100
                );

        const y =
            50 +
            Math.random() *
                (
                    MAP.height -
                    100
                );

        if (
            circleHitsWall(
                x,
                y,
                PLAYER_RADIUS
            )
        ) {
            continue;
        }

        let tooClose =
            false;

        for (
            const entity of [
                ...Object.values(
                    room.players
                ),
                ...room.bots
            ]
        ) {
            if (
                !entity ||
                !entity.alive
            ) {
                continue;
            }

            if (
                Math.hypot(
                    entity.x - x,
                    entity.y - y
                ) <
                MIN_SPAWN_DISTANCE
            ) {
                tooClose =
                    true;
                break;
            }
        }

        if (!tooClose) {
            return {
                x,
                y
            };
        }
    }

    return {
        x:
            MAP.width /
            2,

        y:
            MAP.height /
            2
    };
}

/* =====================================================
   RESET
===================================================== */

function resetCombatant(
    entity
) {
    const skin =
        getSkin(
            entity.skin
        );

    entity.maxHp =
        100 +
        skin.healthBonus;

    entity.maxShield =
        50 +
        skin.shieldBonus;

    entity.hp =
        entity.maxHp;

    entity.shield =
        entity.maxShield;

    entity.alive =
        true;

    entity.cooldown =
        0;

    entity.reloadTimer =
        0;

    entity.healCooldown =
        0;

    entity.healTimer =
        0;

    entity.lastHitAt =
        Date.now();

    entity.botDamage =
        0;

    entity.superReady =
        false;

    entity.ammo =
        WEAPONS[
            entity.weapon
        ].melee
            ? 999999
            : WEAPONS[
                  entity.weapon
              ].ammo;

    entity.input = {
        dx: 0,
        dy: 0
    };
}

/* =====================================================
   PLAYER
===================================================== */

function createPlayer(
    ws,
    room,
    data
) {
    const skin =
        getSkin(
            data?.skin
        );

    const spawn =
        safeSpawn(room);

    const player = {
        id:
            ws.clientId,

        ws,

        bot:
            false,

        name:
            String(
                data?.name ||
                    "Player"
            ).substring(
                0,
                15
            ),

        x:
            spawn.x,

        y:
            spawn.y,

        skin:
            skin.id,

        weapon:
            skin.weapon,

        hp:
            100,

        maxHp:
            100,

        shield:
            50,

        maxShield:
            50,

        alive:
            true,

        kills:
            0,

        botDamage:
            0,

        superReady:
            false,

        cooldown:
            0,

        reloadTimer:
            0,

        healCooldown:
            0,

        healTimer:
            0,

        lastHitAt:
            Date.now(),

        ammo:
            0,

        input: {
            dx: 0,
            dy: 0
        }
    };

    resetCombatant(
        player
    );

    return player;
}

/* =====================================================
   BOTS
===================================================== */

function createBots(room) {

    room.bots =
        [];

    for (
        let i = 0;
        i < room.botCount;
        i++
    ) {
        const skin =
            SKINS[
                1 +
                (
                    i %
                    5
                )
            ];

        const bot = {

            id:
                "bot-" +
                i +
                "-" +
                Math.random()
                    .toString(36)
                    .substring(
                        2,
                        8
                    ),

            ws:
                null,

            bot:
                true,

            name:
                "BOT " +
                (
                    i + 1
                ),

            x:
                0,

            y:
                0,

            skin:
                skin.id,

            weapon:
                skin.weapon,

            hp:
                100,

            maxHp:
                100,

            shield:
                50,

            maxShield:
                50,

            alive:
                true,

            kills:
                0,

            botDamage:
                0,

            superReady:
                false,

            cooldown:
                0,

            reloadTimer:
                0,

            healCooldown:
                0,

            healTimer:
                0,

            lastHitAt:
                Date.now(),

            ammo:
                0,

            target:
                null,

            input: {
                dx: 0,
                dy: 0
            }
        };

        const spawn =
            safeSpawn(
                room
            );

        bot.x =
            spawn.x;

        bot.y =
            spawn.y;

        resetCombatant(
            bot
        );

        room.bots.push(
            bot
        );
    }
}

/* =====================================================
   STATE
===================================================== */

function publicEntity(
    entity
) {
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

        maxHp:
            entity.maxHp,

        shield:
            Math.max(
                0,
                Math.round(
                    entity.shield
                )
            ),

        maxShield:
            entity.maxShield,

        alive:
            entity.alive,

        skin:
            entity.skin,

        weapon:
            entity.weapon,

        kills:
            entity.kills,

        botDamage:
            entity.botDamage,

        superReady:
            Boolean(
                entity.superReady
            ),

        ammo:
            entity.ammo,

        reloadTimer:
            entity.reloadTimer,

        bot:
            Boolean(
                entity.bot
            )
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

/* =====================================================
   MOVEMENT
===================================================== */

function updatePlayers(room) {

    for (
        const player of
        Object.values(
            room.players
        )
    ) {
        if (
            !player.alive
        ) {
            player.input.dx = 0;
            player.input.dy = 0;
            continue;
        }

        moveEntity(
            player,
            player.input.dx,
            player.input.dy
        );

        if (
            player.cooldown >
            0
        ) {
            player.cooldown--;
        }

        if (
            player.reloadTimer >
            0
        ) {
            player.reloadTimer--;

            if (
                player.reloadTimer <=
                0
            ) {
                reloadWeapon(
                    player
                );
            }
        }

        if (
            player.healCooldown >
            0
        ) {
            player.healCooldown--;
        }

        /*
        Automatische Regeneration
        nach etwas Ruhe.
        */

        if (
            Date.now() -
                player.lastHitAt >
                3000 &&
            player.hp <
                player.maxHp
        ) {
            player.healTimer++;

            if (
                player.healTimer >=
                30
            ) {
                player.hp =
                    Math.min(
                        player.maxHp,
                        player.hp + 3
                    );

                player.healTimer =
                    0;
            }
        } else {
            player.healTimer =
                0;
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
        length <= 0
    ) {
        return;
    }

    dx /=
        length;

    dy /=
        length;

    const speed =
        entity.bot
            ? 2.5
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
    X
    */

    if (
        !circleHitsWall(
            nextX,
            entity.y,
            PLAYER_RADIUS
        )
    ) {
        entity.x =
            nextX;
    }

    /*
    Y
    */

    if (
        !circleHitsWall(
            entity.x,
            nextY,
            PLAYER_RADIUS
        )
    ) {
        entity.y =
            nextY;
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

/* =====================================================
   RELOAD
===================================================== */

function reloadWeapon(
    entity
) {
    const weapon =
        WEAPONS[
            entity.weapon
        ];

    if (
        !weapon ||
        weapon.melee
    ) {
        return;
    }

    entity.ammo =
        weapon.ammo;

    entity.reloadTimer =
        0;
}

function startReload(
    entity
) {
    const weapon =
        WEAPONS[
            entity.weapon
        ];

    if (
        !weapon ||
        weapon.melee ||
        entity.reloadTimer >
            0 ||
        entity.ammo >=
            weapon.ammo
    ) {
        return;
    }

    entity.reloadTimer =
        weapon.reload;
}

/* =====================================================
   DAMAGE
===================================================== */

function getDamage(
    attacker,
    room,
    amount
) {
    const skin =
        getSkin(
            attacker?.skin
        );

    let multiplier =
        1 +
        skin.damageBonus /
            100;

    if (
        attacker?.bot
    ) {
        const difficulty =
            DIFFICULTIES[
                room.difficulty
            ];

        multiplier *=
            difficulty.damage;
    }

    return Math.max(
        1,
        Math.round(
            amount *
                multiplier
        )
    );
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

    const damage =
        getDamage(
            attacker,
            room,
            rawDamage
        );

    target.lastHitAt =
        Date.now();

    target.healTimer =
        0;

    let left =
        damage;

    if (
        target.shield >
        0
    ) {
        const blocked =
            Math.min(
                target.shield,
                left
            );

        target.shield -=
            blocked;

        left -=
            blocked;
    }

    if (
        left > 0
    ) {
        target.hp -=
            left;
    }

    /*
    Super-Ladung durch Bot-Schaden
    */

    if (
        attacker &&
        target.bot
    ) {

        attacker.botDamage =
            (
                attacker.botDamage ||
                0
            ) +
            damage;

        const skin =
            getSkin(
                attacker.skin
            );

        if (
            skin.superNeed >
                0 &&
            attacker.botDamage >=
                skin.superNeed
        ) {
            attacker.superReady =
                true;
        }
    }

    broadcast(
        room,
        {
            type:
                "hitEffect",

            target:
                target.id,

            damage
        }
    );

    if (
        target.hp > 0
    ) {
        return;
    }

    target.hp =
        0;

    target.alive =
        false;

    if (attacker) {
        attacker.kills =
            (
                attacker.kills ||
                0
            ) + 1;
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

    checkRoundEnd(
        room
    );
}

/* =====================================================
   ATTACK
===================================================== */

function attack(
    room,
    attacker,
    angle
) {
    if (
        !attacker.alive
    ) {
        return;
    }

    const weapon =
        WEAPONS[
            attacker.weapon
        ];

    if (!weapon) {
        return;
    }

    if (
        attacker.cooldown >
            0 ||
        attacker.reloadTimer >
            0
    ) {
        return;
    }

    if (
        !weapon.melee &&
        attacker.ammo <=
            0
    ) {
        startReload(
            attacker
        );

        return;
    }

    attacker.cooldown =
        weapon.cooldown;

    /*
    NAHKAMPF
    */

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

            /*
            Wand muss frei sein
            */

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

            const difference =
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
                Math.abs(
                    difference
                ) <=
                0.95
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

    /*
    SCHUSSWAFFE
    */

    attacker.ammo--;

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

        room.bullets.push({

            owner:
                attacker.id,

            x:
                attacker.x,

            y:
                attacker.y,

            dx:
                Math.cos(
                    shotAngle
                ),

            dy:
                Math.sin(
                    shotAngle
                ),

            speed:
                weapon.speed,

            damage:
                weapon.damage,

            range:
                weapon.range,

            travel:
                0
        });

        broadcast(
            room,
            {
                type:
                    "bulletSpawn",

                x:
                    attacker.x,

                y:
                    attacker.y,

                dx:
                    Math.cos(
                        shotAngle
                    ),

                dy:
                    Math.sin(
                        shotAngle
                    ),

                speed:
                    weapon.speed,

                color:
                    getSkin(
                        attacker.skin
                    ).color
            }
        );
    }

    if (
        attacker.ammo <=
            0
    ) {
        startReload(
            attacker
        );
    }
}

/* =====================================================
   BULLET UPDATE
===================================================== */

function updateBullets(
    room
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

        let hit =
            false;

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
                    PLAYER_RADIUS +
                    5
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

            hit =
                true;

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

/* =====================================================
   BOT KI
===================================================== */

function chooseTarget(
    room,
    bot
) {
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
        return null;
    }

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

    return targets[0];
}

function updateBots(
    room
) {

    const difficulty =
        DIFFICULTIES[
            room.difficulty
        ] ||
        DIFFICULTIES.medium;

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

        if (
            bot.reloadTimer >
                0
        ) {

            bot.reloadTimer--;

            if (
                bot.reloadTimer <=
                    0
            ) {
                reloadWeapon(
                    bot
                );
            }
        }

        const target =
            chooseTarget(
                room,
                bot
            );

        if (!target) {
            continue;
        }

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

        const targetAngle =
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
        Bewegung
        */

        if (
            blocked ||
            d > 150
        ) {

            const speed =
                difficulty.botSpeed;

            moveEntity(
                bot,
                dx /
                    d *
                    speed,
                dy /
                    d *
                    speed
            );
        }

        /*
        Angriff
        */

        if (
            !blocked &&
            d <=
                weapon.range &&
            bot.cooldown <=
                0
        ) {

            if (
                Math.random() <=
                difficulty.fireChance
            ) {

                const error =
                    (
                        Math.random() -
                            0.5
                    ) *
                    (
                        1 -
                        difficulty.accuracy
                    );

                attack(
                    room,
                    bot,
                    targetAngle +
                        error
                );
            }
        }
    }
}

/* =====================================================
   SUPER
===================================================== */

function useSuper(
    room,
    player
) {

    if (
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
                player.id
        ) {
            continue;
        }

        if (
            distance(
                player,
                target
            ) <=
            180 &&
            !lineHitsWall(
                player.x,
                player.y,
                target.x,
                target.y
            )
        ) {

            applyDamage(
                room,
                target,
                40,
                player
            );
        }
    }

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

/* =====================================================
   ROUND END
===================================================== */

function checkRoundEnd(
    room
) {

    if (
        !room.roundActive
    ) {
        return;
    }

    const alive = [
        ...Object.values(
            room.players
        ),
        ...room.bots
    ].filter(
        entity =>
            entity.alive
    );

    if (
        alive.length <=
        1
    ) {

        room.roundActive =
            false;

        broadcast(
            room,
            {
                type:
                    "roundEnd",

                winner:
                    alive.length
                        ? alive[0].id
                        : null
            }
        );
    }
}

/* =====================================================
   NEW ROUND
===================================================== */

function restartRound(
    room
) {

    room.bullets =
        [];

    room.bots =
        [];

    room.roundActive =
        true;

    /*
    Alle Spieler deaktivieren,
    damit Spawn-Abstand funktioniert.
    */

    for (
        const player
        of Object.values(
            room.players
        )
    ) {
        player.alive =
            false;
    }

    /*
    Spieler einzeln platzieren
    */

    for (
        const player
        of Object.values(
            room.players
        )
    ) {

        const spawn =
            safeSpawn(
                room
            );

        player.x =
            spawn.x;

        player.y =
            spawn.y;

        player.weapon =
            getSkin(
                player.skin
            ).weapon;

        resetCombatant(
            player
        );
    }

    /*
    Danach Bots.
    */

    createBots(
        room
    );

    broadcast(
        room,
        {
            type:
                "newRound"
        }
    );

    sendState(
        room
    );
}

/* =====================================================
   CONNECTION
===================================================== */

wss.on(
    "connection",
    ws => {

        ws.clientId =
            Math.random()
                .toString(36)
                .substring(
                    2,
                    10
                );

        send(
            ws,
            {
                type:
                    "connected",

                id:
                    ws.clientId,

                map:
                    MAP,

                walls:
                    WALLS,

                skins:
                    SKINS,

                difficulties:
                    DIFFICULTIES,

                tutorial:
                    TUTORIAL
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

                /* =================================
                   CREATE ROOM
                ================================= */

                if (
                    data.type ===
                    "createRoom"
                ) {

                    const code =
                        createRoomCode();

                    const difficulty =
                        DIFFICULTIES[
                            data.difficulty
                        ]
                            ? data.difficulty
                            : "medium";

                    const room = {

                        code,

                        players: {},

                        bots: [],

                        bullets: [],

                        botCount:
                            clamp(
                                Math.floor(
                                    Number(
                                        data.bots
                                    ) || 0
                                ),
                                0,
                                5
                            ),

                        difficulty,

                        roundActive:
                            true
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
                        ws.clientId
                    ] =
                        player;

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

                            code,

                            difficulty,

                            difficultyName:
                                DIFFICULTIES[
                                    difficulty
                                ].name
                        }
                    );

                    sendState(
                        room
                    );

                    return;
                }

                /* =================================
                   JOIN ROOM
                ================================= */

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
                                    "Diese Lobby existiert nicht."
                            }
                        );

                        return;
                    }

                    if (
                        Object.keys(
                            room.players
                        ).length >=
                        MAX_PLAYERS
                    ) {

                        send(
                            ws,
                            {
                                type:
                                    "errorMessage",

                                message:
                                    "Diese Lobby ist voll."
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

                            difficulty:
                                room.difficulty,

                            difficultyName:
                                DIFFICULTIES[
                                    room.difficulty
                                ].name
                        }
                    );

                    sendState(
                        room
                    );

                    return;
                }

                const room =
                    rooms[
                        ws.room
                    ];

                if (!room)
                    return;

                /* =================================
                   BEWEGUNG
                ================================= */

                if (
                    data.type ===
                    "moveIntent"
                ) {

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

                    player.input.dx =
                        clamp(
                            Number(
                                data.dx
                            ) || 0,
                            -1,
                            1
                        );

                    player.input.dy =
                        clamp(
                            Number(
                                data.dy
                            ) || 0,
                            -1,
                            1
                        );

                    return;
                }

                /* =================================
                   STOPP BEWEGUNG
                ================================= */

                if (
                    data.type ===
                    "stopMove"
                ) {

                    const player =
                        room.players[
                            ws.clientId
                        ];

                    if (!player)
                        return;

                    player.input.dx =
                        0;

                    player.input.dy =
                        0;

                    return;
                }

                /* =================================
                   SCHIESSEN
                ================================= */

                if (
                    data.type ===
                    "shoot"
                ) {

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

                    attack(
                        room,
                        player,
                        Math.atan2(
                            dy,
                            dx
                        )
                    );

                    return;
                }

                /* =================================
                   RELOAD
                ================================= */

                if (
                    data.type ===
                    "reload"
                ) {

                    const player =
                        room.players[
                            ws.clientId
                        ];

                    if (
                        player
                    ) {
                        startReload(
                            player
                        );
                    }

                    return;
                }

                /* =================================
                   HEILEN
                ================================= */

                if (
                    data.type ===
                    "heal"
                ) {

                    const player =
                        room.players[
                            ws.clientId
                        ];

                    if (
                        !player ||
                        !player.alive ||
                        player.healCooldown >
                            0
                    ) {
                        return;
                    }

                    player.healCooldown =
                        180;

                    player.hp =
                        Math.min(
                            player.maxHp,
                            player.hp + 30
                        );

                    player.shield =
                        Math.min(
                            player.maxShield,
                            player.shield + 15
                        );

                    broadcast(
                        room,
                        {
                            type:
                                "healEffect",

                            player:
                                player.id,

                            x:
                                player.x,

                            y:
                                player.y
                        }
                    );

                    return;
                }

                /* =================================
                   SUPER
                ================================= */

                if (
                    data.type ===
                    "useSuper"
                ) {

                    const player =
                        room.players[
                            ws.clientId
                        ];

                    if (
                        player
                    ) {
                        useSuper(
                            room,
                            player
                        );
                    }

                    return;
                }

                /* =================================
                   SKIN
                ================================= */

                if (
                    data.type ===
                    "changeSkin"
                ) {

                    const player =
                        room.players[
                            ws.clientId
                        ];

                    if (!player)
                        return;

                    const skin =
                        getSkin(
                            data.skin
                        );

                    /*
                    In deinem System werden
                    Kills momentan als
                    Freischaltwert benutzt.
                    */

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

                    resetCombatant(
                        player
                    );

                    sendState(
                        room
                    );

                    return;
                }

                /* =================================
                   NEUE RUNDE
                ================================= */

                if (
                    data.type ===
                    "newRound"
                ) {

                    restartRound(
                        room
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

                    checkRoundEnd(
                        room
                    );

                    sendState(
                        room
                    );
                }
            }
        );
    }
);

/* =====================================================
   HAUPT-GAME-LOOP
===================================================== */

setInterval(
    () => {

        for (
            const room of
            Object.values(
                rooms
            )
        ) {

            /*
            Spieler bewegen
            */

            updatePlayers(
                room
            );

            /*
            Bots bewegen + angreifen
            */

            updateBots(
                room
            );

            /*
            Kugeln bewegen + treffen
            */

            updateBullets(
                room
            );

            /*
            Zustand senden
            */

            sendState(
                room
            );
        }

    },
    1000 / 30
);

/* =====================================================
   SERVER START
===================================================== */

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

server.on(
    "error",
    error => {

        console.error(
            "Serverfehler:",
            error
        );
    }
);
