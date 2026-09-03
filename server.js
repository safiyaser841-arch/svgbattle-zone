const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;

const MAP = {
    width: 1200,
    height: 700
};

const PLAYER_RADIUS = 18;
const MAX_HP = 100;
const BULLET_SPEED = 850;
const BULLET_DAMAGE = 25;
const FIRE_COOLDOWN = 250;

const walls = [
    { x: 250, y: 120, w: 180, h: 30 },
    { x: 770, y: 120, w: 180, h: 30 },

    { x: 250, y: 550, w: 180, h: 30 },
    { x: 770, y: 550, w: 180, h: 30 },

    { x: 560, y: 220, w: 80, h: 260 },

    { x: 80, y: 300, w: 180, h: 30 },
    { x: 940, y: 300, w: 180, h: 30 }
];

const players = new Map();
const bots = new Map();
const bullets = [];

let nextBotId = 1;

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function circleRectCollision(x, y, radius, rect) {
    const closestX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(y, rect.y + rect.h));

    const dx = x - closestX;
    const dy = y - closestY;

    return dx * dx + dy * dy < radius * radius;
}

function insideWall(x, y) {
    for (const wall of walls) {
        if (circleRectCollision(x, y, PLAYER_RADIUS, wall)) {
            return true;
        }
    }

    return false;
}

function validPosition(x, y) {
    if (
        x < PLAYER_RADIUS ||
        y < PLAYER_RADIUS ||
        x > MAP.width - PLAYER_RADIUS ||
        y > MAP.height - PLAYER_RADIUS
    ) {
        return false;
    }

    return !insideWall(x, y);
}

function getSpawn() {
    for (let i = 0; i < 100; i++) {
        const x = random(50, MAP.width - 50);
        const y = random(50, MAP.height - 50);

        if (!validPosition(x, y)) continue;

        let occupied = false;

        for (const p of players.values()) {
            if (distance({ x, y }, p) < 100) {
                occupied = true;
                break;
            }
        }

        if (!occupied) {
            for (const b of bots.values()) {
                if (distance({ x, y }, b) < 100) {
                    occupied = true;
                    break;
                }
            }
        }

        if (!occupied) {
            return { x, y };
        }
    }

    return { x: 100, y: 100 };
}

function createPlayer(ws) {
    const spawn = getSpawn();

    const player = {
        id: "p_" + Math.random().toString(36).slice(2),
        type: "player",
        x: spawn.x,
        y: spawn.y,
        angle: 0,
        hp: MAX_HP,
        kills: 0,
        input: {
            up: false,
            down: false,
            left: false,
            right: false
        },
        lastShot: 0,
        ws
    };

    players.set(player.id, player);

    return player;
}

function createBot() {
    const spawn = getSpawn();

    const bot = {
        id: "b_" + nextBotId++,
        type: "bot",
        x: spawn.x,
        y: spawn.y,
        angle: random(0, Math.PI * 2),
        hp: MAX_HP,
        kills: 0,
        speed: 125,
        lastShot: 0,
        target: null,
        changeDirection: 0
    };

    bots.set(bot.id, bot);
}

for (let i = 0; i < 5; i++) {
    createBot();
}

function moveEntity(entity, dx, dy) {
    let newX = entity.x + dx;
    let newY = entity.y + dy;

    if (validPosition(newX, entity.y)) {
        entity.x = newX;
    }

    if (validPosition(entity.x, newY)) {
        entity.y = newY;
    }
}

function shoot(shooter, angle) {
    const now = Date.now();

    if (now - shooter.lastShot < FIRE_COOLDOWN) {
        return;
    }

    shooter.lastShot = now;

    bullets.push({
        x: shooter.x + Math.cos(angle) * 25,
        y: shooter.y + Math.sin(angle) * 25,
        vx: Math.cos(angle) * BULLET_SPEED,
        vy: Math.sin(angle) * BULLET_SPEED,
        owner: shooter.id,
        life: 1.5
    });
}

function damageTarget(target, bullet) {
    target.hp -= BULLET_DAMAGE;

    if (target.hp <= 0) {
        const killer =
            players.get(bullet.owner) ||
            bots.get(bullet.owner);

        if (killer) {
            killer.kills++;
        }

        respawn(target);
    }
}

function respawn(entity) {
    const spawn = getSpawn();

    entity.x = spawn.x;
    entity.y = spawn.y;
    entity.hp = MAX_HP;
    entity.angle = random(0, Math.PI * 2);
}

function updatePlayers(dt) {
    for (const player of players.values()) {
        let dx = 0;
        let dy = 0;

        if (player.input.up) dy -= 1;
        if (player.input.down) dy += 1;
        if (player.input.left) dx -= 1;
        if (player.input.right) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const length = Math.hypot(dx, dy);

            dx /= length;
            dy /= length;

            const speed = 260;

            moveEntity(
                player,
                dx * speed * dt,
                dy * speed * dt
            );
        }
    }
}

function updateBots(dt) {
    const targets = [
        ...players.values(),
        ...bots.values()
    ];

    for (const bot of bots.values()) {
        let closest = null;
        let closestDistance = Infinity;

        for (const target of targets) {
            if (target.id === bot.id) continue;

            const d = distance(bot, target);

            if (d < closestDistance) {
                closestDistance = d;
                closest = target;
            }
        }

        if (!closest) continue;

        bot.target = closest;

        const dx = closest.x - bot.x;
        const dy = closest.y - bot.y;

        const angle = Math.atan2(dy, dx);

        bot.angle = angle;

        if (closestDistance > 250) {
            moveEntity(
                bot,
                Math.cos(angle) * bot.speed * dt,
                Math.sin(angle) * bot.speed * dt
            );
        } else if (closestDistance < 150) {
            moveEntity(
                bot,
                -Math.cos(angle) * bot.speed * dt,
                -Math.sin(angle) * bot.speed * dt
            );
        }

        if (closestDistance < 600) {
            shoot(bot, angle);
        }
    }
}

function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;

        bullet.life -= dt;

        let remove = false;

        if (
            bullet.life <= 0 ||
            bullet.x < 0 ||
            bullet.y < 0 ||
            bullet.x > MAP.width ||
            bullet.y > MAP.height
        ) {
            remove = true;
        }

        for (const wall of walls) {
            if (
                bullet.x >= wall.x &&
                bullet.x <= wall.x + wall.w &&
                bullet.y >= wall.y &&
                bullet.y <= wall.y + wall.h
            ) {
                remove = true;
                break;
            }
        }

        if (!remove) {
            for (const target of players.values()) {
                if (target.id === bullet.owner) continue;

                if (distance(bullet, target) < PLAYER_RADIUS) {
                    damageTarget(target, bullet);
                    remove = true;
                    break;
                }
            }
        }

        if (!remove) {
            for (const target of bots.values()) {
                if (target.id === bullet.owner) continue;

                if (distance(bullet, target) < PLAYER_RADIUS) {
                    damageTarget(target, bullet);
                    remove = true;
                    break;
                }
            }
        }

        if (remove) {
            bullets.splice(i, 1);
        }
    }
}

function gameState() {
    return {
        type: "state",
        map: MAP,
        walls,
        players: [
            ...players.values(),
            ...bots.values()
        ].map(p => ({
            id: p.id,
            type: p.type,
            x: p.x,
            y: p.y,
            angle: p.angle,
            hp: p.hp,
            kills: p.kills
        })),
        bullets: bullets.map(b => ({
            x: b.x,
            y: b.y
        }))
    };
}

function broadcast() {
    const data = JSON.stringify(gameState());

    for (const player of players.values()) {
        if (player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(data);
        }
    }
}

const server = http.createServer((req, res) => {
    let file = req.url === "/" ? "index.html" : req.url.slice(1);

    file = path.join(__dirname, file);

    if (!file.startsWith(__dirname)) {
        res.writeHead(403);
        res.end();
        return;
    }

    fs.readFile(file, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end("Not found");
            return;
        }

        let contentType = "text/html";

        if (file.endsWith(".js")) {
            contentType = "text/javascript";
        }

        if (file.endsWith(".css")) {
            contentType = "text/css";
        }

        res.writeHead(200, {
            "Content-Type": contentType
        });

        res.end(data);
    });
});

const wss = new WebSocket.Server({ server });

wss.on("connection", ws => {
    const player = createPlayer(ws);

    ws.send(JSON.stringify({
        type: "welcome",
        id: player.id
    }));

    ws.on("message", message => {
        try {
            const data = JSON.parse(message);

            if (data.type === "input") {
                player.input = {
                    up: !!data.up,
                    down: !!data.down,
                    left: !!data.left,
                    right: !!data.right
                };
            }

            if (data.type === "angle") {
                player.angle = Number(data.angle) || 0;
            }

            if (data.type === "shoot") {
                shoot(player, Number(data.angle) || 0);
            }

        } catch (error) {
            console.log("Invalid message");
        }
    });

    ws.on("close", () => {
        players.delete(player.id);
    });
});

let lastTime = Date.now();

setInterval(() => {
    const now = Date.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);

    lastTime = now;

    updatePlayers(dt);
    updateBots(dt);
    updateBullets(dt);

    broadcast();
}, 1000 / 60);

server.listen(PORT, () => {
    console.log("=================================");
    console.log("BATTLE ZONE SERVER");
    console.log("Port:", PORT);
    console.log("Server is running!");
    console.log("=================================");
});
