"use strict";

const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

const PORT = Number(process.env.PORT) || 10000;

/* =====================================================
   SERVER
===================================================== */

app.use(express.static(path.join(__dirname)));

app.get("/health", (req, res) => {
    res.json({
        ok: true,
        game: "Battle Zone",
        players: getTotalPlayers()
    });
});

const wss = new WebSocket.Server({ server });

/* =====================================================
   GAME SETTINGS
===================================================== */

const MAP = {
    width: 1600,
    height: 900
};

const PLAYER_RADIUS = 20;
const MAX_PLAYERS = 8;
const MAX_BOTS = 5;
const TICK_RATE = 30;

/* =====================================================
   WALLS
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
   DIFFICULTY
===================================================== */

const DIFFICULTIES = {
    easy: {
        name: "Leicht",
        botSpeed: 1.8,
        accuracy: 0.65,
        fireChance: 0.35,
        damageMultiplier: 0.75
    },

    medium: {
        name: "Mittel",
        botSpeed: 2.5,
        accuracy: 0.82,
        fireChance: 0.60,
        damageMultiplier: 1
    },

    hard: {
        name: "Schwer",
        botSpeed: 3.2,
        accuracy: 0.95,
        fireChance: 0.85,
        damageMultiplier: 1.15
    }
};

/* =====================================================
   WEAPONS
===================================================== */

const WEAPONS = {

    Pistole: {
        damage: 12,
        cooldown: 10,
        speed: 18,
        range: 760,
        ammo: 12,
        reload: 45,
        pellets: 1,
        spread: 0,
        melee: false
    },

    SMG: {
        damage: 6,
        cooldown: 4,
        speed: 20,
        range: 560,
        ammo: 30,
        reload: 50,
        pellets: 1,
        spread: 0.08,
        melee: false
    },

    Gewehr: {
        damage: 19,
        cooldown: 16,
        speed: 22,
        range: 900,
        ammo: 8,
        reload: 55,
        pellets: 1,
        spread: 0.02,
        melee: false
    },

    Schrotflinte: {
        damage: 7,
        cooldown: 30,
        speed: 15,
        range: 380,
        ammo: 5,
        reload: 60,
        pellets: 6,
        spread: 0.28,
        melee: false
    },

    Bogen: {
        damage: 30,
        cooldown: 28,
        speed: 14,
        range: 950,
        ammo: 6,
        reload: 65,
        pellets: 1,
        spread: 0,
        melee: false
    },

    Schwert: {
        damage: 35,
        cooldown: 18,
        speed: 0,
        range: 90,
        ammo: 999999,
        reload: 0,
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
        id: "rookie",
        name: "Rookie",
        rarity: "Standard",
        color: "#38bdf8",
        weapon: "Pistole",
        health: 100,
        shield: 50,
        bonusDamage: 0
    },

    {
        id: "blaze",
        name: "Blaze",
        rarity: "Selten",
        color: "#ef4444",
        weapon: "SMG",
        health: 110,
        shield: 60,
        bonusDamage: 5
    },

    {
        id: "frost",
        name: "Frost",
        rarity: "Selten",
        color: "#67e8f9",
        weapon: "Bogen",
        health: 110,
        shield: 60,
        bonusDamage: 5
    },

    {
        id: "shadow",
        name: "Shadow",
        rarity: "Superselten",
        color: "#111827",
        weapon: "Schwert",
        health: 145,
        shield: 85,
        bonusDamage: 10
    },

    {
        id: "cyber",
        name: "Cyber",
        rarity: "Superselten",
        color: "#06b6d4",
        weapon: "SMG",
        health: 120,
        shield: 70,
        bonusDamage: 10
    },

    {
        id: "galaxy",
        name: "Galaxy",
        rarity: "Episch",
        color: "#8b5cf6",
        weapon: "Gewehr",
        health: 130,
        shield: 75,
        bonusDamage: 15
    },

    {
        id: "void",
        name: "Void",
        rarity: "Episch",
        color: "#312e81",
        weapon: "Schwert",
        health: 155,
        shield: 95,
        bonusDamage: 15
    },

    {
        id: "dragon",
        name: "Dragon",
        rarity: "Mythisch",
        color: "#f59e0b",
        weapon: "Bogen",
        health: 140,
        shield: 85,
        bonusDamage: 25
    },

    {
        id: "demon",
        name: "Demon",
        rarity: "Mythisch",
        color: "#7f1d1d",
        weapon: "Schwert",
        health: 170,
        shield: 105,
        bonusDamage: 25
    },

    {
        id: "legend",
        name: "Legend",
        rarity: "Legendär",
        color: "#facc15",
        weapon: "Gewehr",
        health: 150,
        shield: 95,
        bonusDamage: 35
    },

    {
        id: "king",
        name: "King",
        rarity: "Legendär",
        color: "#fde68a",
        weapon: "Schwert",
        health: 190,
        shield: 120,
        bonusDamage: 35
    }
];

/* =====================================================
   ROOMS
===================================================== */

const rooms = {};

/* =====================================================
   UTILITY
===================================================== */

function send(ws, data) {
    if (
        ws &&
        ws.readyState === WebSocket.OPEN
    ) {
        ws.send(JSON.stringify(data));
    }
}

function broadcast(room, data) {
    for (
        const player of Object.values(room.players)
    ) {
        send(player.ws, data);
    }
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

function getSkin(id) {
    return (
        SKINS.find(s => s.id === id) ||
        SKINS[0]
    );
}

function getWeapon(entity) {
    return WEAPONS[entity.weapon] ||
        WEAPONS.Pistole;
}

function getTotalPlayers() {
    let total = 0;

    for (const room of Object.values(rooms)) {
        total += Object.keys(room.players).length;
    }

    return total;
}

function createRoomCode() {
    let code;

    do {
        code = Math.random()
            .toString(36)
            .substring(2, 6)
            .toUpperCase();
    } while (rooms[code]);

    return code;
}

/* =====================================================
   COLLISION
===================================================== */

function circleHitsWall(x, y, radius) {

    for (const wall of WALLS) {

        const closestX = clamp(
            x,
            wall.x,
            wall.x + wall.w
        );

        const closestY = clamp(
            y,
            wall.y,
            wall.y + wall.h
        );

        const dx = x - closestX;
        const dy = y - closestY;

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

function lineHitsWall(x1, y1, x2, y2) {

    const distanceValue =
        Math.hypot(
            x2 - x1,
            y2 - y1
        );

    const steps = Math.max(
        1,
        Math.ceil(distanceValue / 5)
    );

    for (
        let i = 0;
        i <= steps;
        i++
    ) {

        const t = i / steps;

        const x =
            x1 +
            (x2 - x1) * t;

        const y =
            y1 +
            (y2 - y1) * t;

        for (const wall of WALLS) {

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

/* =====================================================
   SPAWN
===================================================== */

function findSpawn(room) {

    for (
        let attempt = 0;
        attempt < 1000;
        attempt++
    ) {

        const x =
            50 +
            Math.random() *
            (MAP.width - 100);

        const y =
            50 +
            Math.random() *
            (MAP.height - 100);

        if (
            circleHitsWall(
                x,
                y,
                PLAYER_RADIUS
            )
        ) {
            continue;
        }

        let safe = true;

        const entities = [
            ...Object.values(room.players),
            ...room.bots
        ];

        for (const entity of entities) {

            if (!entity.alive) continue;

            if (
                Math.hypot(
                    entity.x - x,
                    entity.y - y
                ) < 150
            ) {
                safe = false;
                break;
            }
        }

        if (safe) {
            return { x, y };
        }
    }

    return {
        x: MAP.width / 2,
        y: MAP.height / 2
    };
}

/* =====================================================
   RESET
===================================================== */

function resetEntity(entity, room) {

    const skin = getSkin(entity.skin);

    entity.maxHp = skin.health;
    entity.maxShield = skin.shield;

    entity.hp = entity.maxHp;
    entity.shield = entity.maxShield;

    entity.alive = true;

    entity.cooldown = 0;
    entity.reloadTimer = 0;
    entity.healCooldown = 0;

    entity.lastDamage = Date.now();

    entity.input = {
        dx: 0,
        dy: 0
    };

    const weapon = getWeapon(entity);

    entity.ammo = weapon.melee
        ? 999999
        : weapon.ammo;
}

/* =====================================================
   CREATE PLAYER
===================================================== */

function createPlayer(ws, room, data) {

    const skin = getSkin(data?.skin);
    const spawn = findSpawn(room);

    const player = {

        id: ws.clientId,

        ws,

        bot: false,

        name: String(
            data?.name || "Player"
        ).substring(0, 16),

        x: spawn.x,
        y: spawn.y,

        skin: skin.id,
        weapon: skin.weapon,

        hp: 100,
        maxHp: 100,

        shield: 50,
        maxShield: 50,

        alive: true,

        kills: 0,

        cooldown: 0,
        reloadTimer: 0,
        healCooldown: 0,

        lastDamage: Date.now(),

        ammo: 0,

        input: {
            dx: 0,
            dy: 0
        }
    };

    resetEntity(
        player,
        room
    );

    return player;
}

/* =====================================================
   CREATE BOTS
===================================================== */

function createBots(room) {

    room.bots = [];

    for (
        let i = 0;
        i < room.botCount;
        i++
    ) {

        const skin =
            SKINS[
                1 + (
                    i % (
                        SKINS.length - 1
                    )
                )
            ];

        const spawn = findSpawn(room);

        const bot = {

            id:
                "bot-" +
                Math.random()
                    .toString(36)
                    .substring(2, 9),

            ws: null,

            bot: true,

            name:
                "BOT " +
                (i + 1),

            x: spawn.x,
            y: spawn.y,

            skin: skin.id,
            weapon: skin.weapon,

            hp: 100,
            maxHp: 100,

            shield: 50,
            maxShield: 50,

            alive: true,

            kills: 0,

            cooldown: 0,
            reloadTimer: 0,
            healCooldown: 0,

            lastDamage: Date.now(),

            ammo: 0,

            target: null,

            moveSpeed:
                DIFFICULTIES[
                    room.difficulty
                ].botSpeed,

            input: {
                dx: 0,
                dy: 0
            }
        };

        resetEntity(
            bot,
            room
        );

        room.bots.push(bot);
    }
}

/* =====================================================
   MOVEMENT
===================================================== */

function moveEntity(entity, dx, dy) {

    const length =
        Math.hypot(dx, dy);

    if (length < 0.001) {
        return;
    }

    dx /= length;
    dy /= length;

    const speed = entity.bot
        ? entity.moveSpeed
        : 5;

    const nextX =
        entity.x +
        dx * speed;

    const nextY =
        entity.y +
        dy * speed;

    if (
        !circleHitsWall(
            nextX,
            entity.y,
            PLAYER_RADIUS
        )
    ) {
        entity.x = nextX;
    }

    if (
        !circleHitsWall(
            entity.x,
            nextY,
            PLAYER_RADIUS
        )
    ) {
        entity.y = nextY;
    }

    entity.x = clamp(
        entity.x,
        PLAYER_RADIUS,
        MAP.width - PLAYER_RADIUS
    );

    entity.y = clamp(
        entity.y,
        PLAYER_RADIUS,
        MAP.height - PLAYER_RADIUS
    );
}

/* =====================================================
   RELOAD
===================================================== */

function startReload(entity) {

    const weapon = getWeapon(entity);

    if (
        weapon.melee ||
        entity.reloadTimer > 0 ||
        entity.ammo >= weapon.ammo
    ) {
        return;
    }

    entity.reloadTimer =
        weapon.reload;
}

function finishReload(entity) {

    const weapon = getWeapon(entity);

    if (weapon.melee) {
        return;
    }

    entity.ammo = weapon.ammo;
    entity.reloadTimer = 0;
}

/* =====================================================
   DAMAGE
===================================================== */

function calculateDamage(
    attacker,
    room,
    baseDamage
) {

    const skin =
        getSkin(attacker.skin);

    let damage =
        baseDamage *
        (
            1 +
            skin.bonusDamage / 100
        );

    if (attacker.bot) {

        const difficulty =
            DIFFICULTIES[
                room.difficulty
            ];

        damage *=
            difficulty.damageMultiplier;
    }

    return Math.max(
        1,
        Math.round(damage)
    );
}

function damageEntity(
    room,
    target,
    baseDamage,
    attacker
) {

    if (
        !target ||
        !target.alive
    ) {
        return;
    }

    const damage =
        calculateDamage(
            attacker,
            room,
            baseDamage
        );

    target.lastDamage =
        Date.now();

    let remaining = damage;

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
        target.hp -= remaining;
    }

    broadcast(
        room,
        {
            type: "hitEffect",
            target: target.id,
            damage
        }
    );

    if (target.hp > 0) {
        return;
    }

    target.hp = 0;
    target.shield = 0;
    target.alive = false;

    if (attacker) {
        attacker.kills++;
    }

    broadcast(
        room,
        {
            type: "elimination",
            killer: attacker
                ? attacker.id
                : null,
            victim: target.id
        }
    );

    checkRoundEnd(room);
}

/* =====================================================
   ATTACK
===================================================== */

function attack(room, attacker, angle) {

    if (!attacker.alive) {
        return;
    }

    const weapon =
        getWeapon(attacker);

    if (
        attacker.cooldown > 0 ||
        attacker.reloadTimer > 0
    ) {
        return;
    }

    if (
        !weapon.melee &&
        attacker.ammo <= 0
    ) {

        startReload(attacker);

        return;
    }

    attacker.cooldown =
        weapon.cooldown;

    /* MELEE */

    if (weapon.melee) {

        const targets = [
            ...Object.values(room.players),
            ...room.bots
        ];

        for (const target of targets) {

            if (
                !target.alive ||
                target.id === attacker.id
            ) {
                continue;
            }

            const d =
                distance(
                    attacker,
                    target
                );

            if (d > weapon.range) {
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
                    target.y - attacker.y,
                    target.x - attacker.x
                );

            let difference =
                targetAngle - angle;

            while (difference > Math.PI) {
                difference -=
                    Math.PI * 2;
            }

            while (difference < -Math.PI) {
                difference +=
                    Math.PI * 2;
            }

            if (
                Math.abs(difference) <
                0.9
            ) {

                damageEntity(
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
                type: "meleeEffect",
                x: attacker.x,
                y: attacker.y,
                angle
            }
        );

        return;
    }

    /* RANGED */

    attacker.ammo--;

    for (
        let i = 0;
        i < weapon.pellets;
        i++
    ) {

        const shotAngle =
            angle +
            (
                Math.random() -
                0.5
            ) *
            weapon.spread;

        room.bullets.push({

            owner: attacker.id,

            x: attacker.x,
            y: attacker.y,

            dx: Math.cos(shotAngle),
            dy: Math.sin(shotAngle),

            speed: weapon.speed,

            damage: weapon.damage,

            range: weapon.range,

            travel: 0
        });

        broadcast(
            room,
            {
                type: "bulletSpawn",

                x: attacker.x,
                y: attacker.y,

                dx: Math.cos(shotAngle),
                dy: Math.sin(shotAngle),

                speed: weapon.speed,

                color:
                    getSkin(
                        attacker.skin
                    ).color
            }
        );
    }

    if (attacker.ammo <= 0) {
        startReload(attacker);
    }
}

/* =====================================================
   BULLETS
===================================================== */

function updateBullets(room) {

    for (
        let i =
            room.bullets.length - 1;
        i >= 0;
        i--
    ) {

        const bullet =
            room.bullets[i];

        const oldX = bullet.x;
        const oldY = bullet.y;

        bullet.x +=
            bullet.dx *
            bullet.speed;

        bullet.y +=
            bullet.dy *
            bullet.speed;

        bullet.travel +=
            bullet.speed;

        /* WALL */

        if (
            lineHitsWall(
                oldX,
                oldY,
                bullet.x,
                bullet.y
            )
        ) {

            room.bullets.splice(
                i,
                1
            );

            continue;
        }

        /* TARGET */

        const targets = [
            ...Object.values(room.players),
            ...room.bots
        ];

        let hit = false;

        for (const target of targets) {

            if (
                !target.alive ||
                target.id === bullet.owner
            ) {
                continue;
            }

            const d =
                Math.hypot(
                    target.x - bullet.x,
                    target.y - bullet.y
                );

            if (
                d >
                PLAYER_RADIUS + 6
            ) {
                continue;
            }

            const attacker =
                findEntity(
                    room,
                    bullet.owner
                );

            damageEntity(
                room,
                target,
                bullet.damage,
                attacker
            );

            broadcast(
                room,
                {
                    type: "bulletHit",
                    x: target.x,
                    y: target.y,
                    damage: bullet.damage
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

/* =====================================================
   FIND ENTITY
===================================================== */

function findEntity(room, id) {

    if (room.players[id]) {
        return room.players[id];
    }

    return (
        room.bots.find(
            bot => bot.id === id
        ) || null
    );
}

/* =====================================================
   BOT AI
===================================================== */

function chooseTarget(room, bot) {

    const targets = [
        ...Object.values(room.players),
        ...room.bots
    ].filter(
        entity =>
            entity.alive &&
            entity.id !== bot.id
    );

    if (!targets.length) {
        return null;
    }

    let best = targets[0];
    let bestDistance =
        distance(bot, best);

    for (
        let i = 1;
        i < targets.length;
        i++
    ) {

        const d =
            distance(
                bot,
                targets[i]
            );

        if (d < bestDistance) {

            best =
                targets[i];

            bestDistance = d;
        }
    }

    return best;
}

function updateBots(room) {

    const difficulty =
        DIFFICULTIES[
            room.difficulty
        ] ||
        DIFFICULTIES.medium;

    for (const bot of room.bots) {

        if (!bot.alive) {
            continue;
        }

        if (bot.cooldown > 0) {
            bot.cooldown--;
        }

        if (bot.reloadTimer > 0) {

            bot.reloadTimer--;

            if (
                bot.reloadTimer <= 0
            ) {
                finishReload(bot);
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
            target.x - bot.x;

        const dy =
            target.y - bot.y;

        const d =
            Math.hypot(dx, dy) || 1;

        const weapon =
            getWeapon(bot);

        const angle =
            Math.atan2(dy, dx);

        const blocked =
            lineHitsWall(
                bot.x,
                bot.y,
                target.x,
                target.y
            );

        /* MOVEMENT */

        if (
            blocked ||
            d > weapon.range * 0.55
        ) {

            moveEntity(
                bot,
                dx / d,
                dy / d
            );
        }

        /* ATTACK */

        if (
            !blocked &&
            d <= weapon.range &&
            bot.cooldown <= 0
        ) {

            if (
                Math.random() <
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
                    ) *
                    1.2;

                attack(
                    room,
                    bot,
                    angle + error
                );
            }
        }
    }
}

/* =====================================================
   PLAYER UPDATE
===================================================== */

function updatePlayers(room) {

    for (
        const player of
        Object.values(room.players)
    ) {

        if (!player.alive) {
            continue;
        }

        moveEntity(
            player,
            player.input.dx,
            player.input.dy
        );

        if (player.cooldown > 0) {
            player.cooldown--;
        }

        if (player.reloadTimer > 0) {

            player.reloadTimer--;

            if (
                player.reloadTimer <= 0
            ) {
                finishReload(player);
            }
        }

        if (player.healCooldown > 0) {
            player.healCooldown--;
        }

        /* Passive regeneration */

        if (
            Date.now() -
            player.lastDamage >
            5000 &&
            player.hp <
            player.maxHp
        ) {

            player.hp =
                Math.min(
                    player.maxHp,
                    player.hp + 0.15
                );
        }
    }
}

/* =====================================================
   HEAL
===================================================== */

function healPlayer(room, player) {

    if (
        !player ||
        !player.alive ||
        player.healCooldown > 0
    ) {
        return;
    }

    player.healCooldown = 180;

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
            type: "healEffect",
            player: player.id,
            x: player.x,
            y: player.y
        }
    );
}

/* =====================================================
   PUBLIC STATE
===================================================== */

function publicEntity(entity) {

    return {

        id: entity.id,

        name: entity.name,

        x: Math.round(entity.x),
        y: Math.round(entity.y),

        hp: Math.round(entity.hp),
        maxHp: entity.maxHp,

        shield: Math.round(entity.shield),
        maxShield: entity.maxShield,

        alive: entity.alive,

        skin: entity.skin,

        weapon: entity.weapon,

        kills: entity.kills,

        ammo: entity.ammo,

        reloadTimer:
            entity.reloadTimer,

        bot: entity.bot
    };
}

function sendState(room) {

    broadcast(
        room,
        {
            type: "state",

            map: MAP,

            walls: WALLS,

            players:
                Object.values(
                    room.players
                ).map(publicEntity),

            bots:
                room.bots.map(publicEntity)
        }
    );
}

/* =====================================================
   ROUND
===================================================== */

function checkRoundEnd(room) {

    if (!room.roundActive) {
        return;
    }

    const alive = [
        ...Object.values(room.players),
        ...room.bots
    ].filter(
        entity => entity.alive
    );

    if (alive.length <= 1) {

        room.roundActive = false;

        broadcast(
            room,
            {
                type: "roundEnd",

                winner:
                    alive.length
                        ? alive[0].id
                        : null
            }
        );
    }
}

function restartRound(room) {

    room.bullets = [];

    room.roundActive = true;

    for (
        const player of
        Object.values(room.players)
    ) {

        const spawn =
            findSpawn(room);

        player.x = spawn.x;
        player.y = spawn.y;

        const skin =
            getSkin(player.skin);

        player.weapon =
            skin.weapon;

        resetEntity(
            player,
            room
        );
    }

    createBots(room);

    broadcast(
        room,
        {
            type: "newRound"
        }
    );

    sendState(room);
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
                .substring(2, 10);

        send(
            ws,
            {
                type: "connected",

                id: ws.clientId,

                map: MAP,

                walls: WALLS,

                skins: SKINS,

                weapons: WEAPONS,

                difficulties:
                    DIFFICULTIES
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

                    send(
                        ws,
                        {
                            type:
                                "errorMessage",

                            message:
                                "Ungültige Nachricht."
                        }
                    );

                    return;
                }

                /* CREATE ROOM */

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

                    const botCount =
                        clamp(
                            Math.floor(
                                Number(
                                    data.bots
                                ) || 0
                            ),
                            0,
                            MAX_BOTS
                        );

                    const room = {

                        code,

                        players: {},

                        bots: [],

                        bullets: [],

                        botCount,

                        difficulty,

                        roundActive: true
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

                    ws.room = code;

                    createBots(room);

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

                    sendState(room);

                    return;
                }

                /* JOIN ROOM */

                if (
                    data.type ===
                    "joinRoom"
                ) {

                    const code =
                        String(
                            data.code || ""
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
                                    "Lobby ist voll."
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

                    ws.room = code;

                    send(
                        ws,
                        {
                            type:
                                "joinedRoom",

                            code,

                            difficulty:
                                room.difficulty
                        }
                    );

                    sendState(room);

                    return;
                }

                /* ROOM CHECK */

                const room =
                    rooms[ws.room];

                if (!room) {
                    return;
                }

                /* MOVEMENT */

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

                /* STOP */

                if (
                    data.type ===
                    "stopMove"
                ) {

                    const player =
                        room.players[
                            ws.clientId
                        ];

                    if (!player) {
                        return;
                    }

                    player.input.dx = 0;
                    player.input.dy = 0;

                    return;
                }

                /* SHOOT */

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
                        Number(data.dx);

                    const dy =
                        Number(data.dy);

                    if (
                        !Number.isFinite(dx) ||
                        !Number.isFinite(dy)
                    ) {
                        return;
                    }

                    if (
                        Math.hypot(dx, dy) <
                        0.001
                    ) {
                        return;
                    }

                    attack(
                        room,
                        player,
                        Math.atan2(dy, dx)
                    );

                    return;
                }

                /* RELOAD */

                if (
                    data.type ===
                    "reload"
                ) {

                    const player =
                        room.players[
                            ws.clientId
                        ];

                    if (player) {
                        startReload(player);
                    }

                    return;
                }

                /* HEAL */

                if (
                    data.type ===
                    "heal"
                ) {

                    const player =
                        room.players[
                            ws.clientId
                        ];

                    if (player) {
                        healPlayer(
                            room,
                            player
                        );
                    }

                    return;
                }

                /* NEW ROUND */

                if (
                    data.type ===
                    "newRound"
                ) {

                    restartRound(room);

                    return;
                }

                /* CHANGE SKIN */

                if (
                    data.type ===
                    "changeSkin"
                ) {

                    const player =
                        room.players[
                            ws.clientId
                        ];

                    if (!player) {
                        return;
                    }

                    const skin =
                        getSkin(
                            data.skin
                        );

                    player.skin =
                        skin.id;

                    player.weapon =
                        skin.weapon;

                    resetEntity(
                        player,
                        room
                    );

                    sendState(room);

                    return;
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

                delete room.players[
                    ws.clientId
                ];

                if (
                    Object.keys(
                        room.players
                    ).length === 0
                ) {

                    delete rooms[
                        ws.room
                    ];

                } else {

                    checkRoundEnd(room);

                    sendState(room);
                }
            }
        );
    }
);

/* =====================================================
   GAME LOOP
===================================================== */

setInterval(
    () => {

        for (
            const room of
            Object.values(rooms)
        ) {

            updatePlayers(room);

            updateBots(room);

            updateBullets(room);

            sendState(room);
        }

    },
    1000 / TICK_RATE
);

/* =====================================================
   START
===================================================== */

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Battle Zone Server läuft auf Port ${PORT}`
        );

        console.log(
            `Health: /health`
        );
    }
);

server.on(
    "error",
    error => {

        console.error(
            "SERVER ERROR:",
            error
        );
    }
);
```
