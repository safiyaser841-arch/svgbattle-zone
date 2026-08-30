const http = require("http");
const express = require("express");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("Battle Zone Server läuft!");
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = new Map();

const MAP = {
  width: 1600,
  height: 900
};

const WALLS = [
  { x: 250, y: 180, w: 260, h: 35 },
  { x: 700, y: 120, w: 35, h: 250 },
  { x: 1050, y: 220, w: 300, h: 35 },
  { x: 420, y: 550, w: 35, h: 220 },
  { x: 800, y: 500, w: 300, h: 35 },
  { x: 1250, y: 520, w: 35, h: 220 }
];

const SKINS = [
  {
    id: "standard",
    name: "Rookie",
    rarity: "Standard",
    color: "#38bdf8",
    weapon: "Pistole",
    damageBonus: 0,
    healthBonus: 0,
    shieldBonus: 0,
    price: 0,
    super: "Power Shot",
    superNeed: 500
  },
  {
    id: "rare1",
    name: "Shadow",
    rarity: "Rare",
    color: "#64748b",
    weapon: "SMG",
    damageBonus: 8,
    healthBonus: 10,
    shieldBonus: 10,
    price: 25,
    super: "Shadow Burst",
    superNeed: 700
  },
  {
    id: "rare2",
    name: "Forest",
    rarity: "Rare",
    color: "#22c55e",
    weapon: "AR",
    damageBonus: 10,
    healthBonus: 15,
    shieldBonus: 5,
    price: 50,
    super: "Nature Shot",
    superNeed: 750
  },
  {
    id: "rare3",
    name: "Ocean",
    rarity: "Rare",
    color: "#06b6d4",
    weapon: "SMG",
    damageBonus: 7,
    healthBonus: 10,
    shieldBonus: 20,
    price: 75,
    super: "Wave Blast",
    superNeed: 800
  },
  {
    id: "rare4",
    name: "Flame",
    rarity: "Rare",
    color: "#f97316",
    weapon: "Shotgun",
    damageBonus: 15,
    healthBonus: 5,
    shieldBonus: 5,
    price: 100,
    super: "Fire Burst",
    superNeed: 850
  },
  {
    id: "rare5",
    name: "Frost",
    rarity: "Rare",
    color: "#93c5fd",
    weapon: "AR",
    damageBonus: 10,
    healthBonus: 20,
    shieldBonus: 10,
    price: 125,
    super: "Ice Storm",
    superNeed: 900
  },
  {
    id: "super1",
    name: "Crimson",
    rarity: "Super Rare",
    color: "#ef4444",
    weapon: "AR",
    damageBonus: 18,
    healthBonus: 20,
    shieldBonus: 15,
    price: 175,
    super: "Crimson Strike",
    superNeed: 1000
  },
  {
    id: "super2",
    name: "Violet",
    rarity: "Super Rare",
    color: "#8b5cf6",
    weapon: "SMG",
    damageBonus: 20,
    healthBonus: 15,
    shieldBonus: 20,
    price: 225,
    super: "Void Blast",
    superNeed: 1050
  },
  {
    id: "super3",
    name: "Gold",
    rarity: "Super Rare",
    color: "#facc15",
    weapon: "AR",
    damageBonus: 22,
    healthBonus: 25,
    shieldBonus: 10,
    price: 275,
    super: "Golden Shot",
    superNeed: 1100
  },
  {
    id: "super4",
    name: "Cyber",
    rarity: "Super Rare",
    color: "#14b8a6",
    weapon: "SMG",
    damageBonus: 20,
    healthBonus: 20,
    shieldBonus: 20,
    price: 325,
    super: "Cyber Beam",
    superNeed: 1150
  },
  {
    id: "super5",
    name: "Storm",
    rarity: "Super Rare",
    color: "#60a5fa",
    weapon: "AR",
    damageBonus: 24,
    healthBonus: 15,
    shieldBonus: 25,
    price: 375,
    super: "Thunder",
    superNeed: 1200
  },
  {
    id: "epic1",
    name: "Galaxy",
    rarity: "Epic",
    color: "#a855f7",
    weapon: "AR",
    damageBonus: 28,
    healthBonus: 30,
    shieldBonus: 25,
    price: 450,
    super: "Galaxy Explosion",
    superNeed: 1300
  },
  {
    id: "epic2",
    name: "Inferno",
    rarity: "Epic",
    color: "#dc2626",
    weapon: "Shotgun",
    damageBonus: 32,
    healthBonus: 25,
    shieldBonus: 20,
    price: 550,
    super: "Inferno",
    superNeed: 1400
  },
  {
    id: "epic3",
    name: "Phantom",
    rarity: "Epic",
    color: "#475569",
    weapon: "SMG",
    damageBonus: 30,
    healthBonus: 35,
    shieldBonus: 30,
    price: 650,
    super: "Phantom Dash",
    superNeed: 1500
  },
  {
    id: "epic4",
    name: "Emerald",
    rarity: "Epic",
    color: "#10b981",
    weapon: "AR",
    damageBonus: 35,
    healthBonus: 30,
    shieldBonus: 25,
    price: 750,
    super: "Emerald Wave",
    superNeed: 1600
  },
  {
    id: "epic5",
    name: "Solar",
    rarity: "Epic",
    color: "#fb923c",
    weapon: "AR",
    damageBonus: 36,
    healthBonus: 35,
    shieldBonus: 25,
    price: 850,
    super: "Solar Blast",
    superNeed: 1700
  },
  {
    id: "mythic1",
    name: "Dragon",
    rarity: "Mythical",
    color: "#b91c1c",
    weapon: "Shotgun",
    damageBonus: 42,
    healthBonus: 45,
    shieldBonus: 35,
    price: 1000,
    super: "Dragon Rage",
    superNeed: 1800
  },
  {
    id: "mythic2",
    name: "Titan",
    rarity: "Mythical",
    color: "#78716c",
    weapon: "AR",
    damageBonus: 45,
    healthBonus: 60,
    shieldBonus: 40,
    price: 1200,
    super: "Titan Smash",
    superNeed: 1900
  },
  {
    id: "mythic3",
    name: "Neon",
    rarity: "Mythical",
    color: "#ec4899",
    weapon: "SMG",
    damageBonus: 48,
    healthBonus: 40,
    shieldBonus: 45,
    price: 1400,
    super: "Neon Storm",
    superNeed: 2000
  },
  {
    id: "mythic4",
    name: "Shadow King",
    rarity: "Mythical",
    color: "#1e1b4b",
    weapon: "AR",
    damageBonus: 50,
    healthBonus: 50,
    shieldBonus: 50,
    price: 1600,
    super: "Darkness",
    superNeed: 2200
  },
  {
    id: "mythic5",
    name: "Phoenix",
    rarity: "Mythical",
    color: "#f43f5e",
    weapon: "Shotgun",
    damageBonus: 52,
    healthBonus: 55,
    shieldBonus: 45,
    price: 1800,
    super: "Phoenix Fire",
    superNeed: 2400
  },
  {
    id: "legend1",
    name: "Legend",
    rarity: "Legendary",
    color: "#f59e0b",
    weapon: "AR",
    damageBonus: 60,
    healthBonus: 70,
    shieldBonus: 60,
    price: 2001,
    super: "Legendary Strike",
    superNeed: 2600
  },
  {
    id: "legend2",
    name: "Destroyer",
    rarity: "Legendary",
    color: "#7f1d1d",
    weapon: "Shotgun",
    damageBonus: 65,
    healthBonus: 80,
    shieldBonus: 65,
    price: 2500,
    super: "Destroyer",
    superNeed: 2800
  },
  {
    id: "legend3",
    name: "God",
    rarity: "Legendary",
    color: "#fde047",
    weapon: "AR",
    damageBonus: 70,
    healthBonus: 100,
    shieldBonus: 80,
    price: 3000,
    super: "God Strike",
    superNeed: 3000
  }
];

const TUTORIAL = [
  {
    title: "🎮 Bewegung",
    text: "PC: Benutze die Pfeiltasten. Handy: Benutze den Joystick."
  },
  {
    title: "🔥 Schießen",
    text: "PC: Halte die linke Maustaste. Handy: Benutze den roten Feuerknopf."
  },
  {
    title: "💚 Heilen",
    text: "Benutze HEILEN, wenn dein Leben nicht voll ist."
  },
  {
    title: "⚡ Super",
    text: "Verursache genug Schaden an Bots, um deine Super-Fähigkeit aufzuladen."
  },
  {
    title: "🏆 Gewinnen",
    text: "Besiege alle Gegner, um die Runde zu gewinnen."
  }
];

const WEAPONS = {
  pistol: {
    name: "Pistole",
    damage: 18,
    speed: 12,
    cooldown: 350,
    range: 700,
    type: "ranged"
  },
  smg: {
    name: "SMG",
    damage: 10,
    speed: 14,
    cooldown: 120,
    range: 650,
    type: "ranged"
  },
  ar: {
    name: "AR",
    damage: 23,
    speed: 15,
    cooldown: 220,
    range: 800,
    type: "ranged"
  },
  shotgun: {
    name: "Shotgun",
    damage: 9,
    speed: 13,
    cooldown: 700,
    range: 360,
    type: "shotgun"
  },
  melee: {
    name: "Nahkampf",
    damage: 34,
    speed: 0,
    cooldown: 500,
    range: 75,
    type: "melee"
  }
};

const DIFFICULTY = {
  easy: {
    botSpeed: 1.35,
    botDamage: 0.75,
    botFire: 0.025
  },
  medium: {
    botSpeed: 1.8,
    botDamage: 1,
    botFire: 0.045
  },
  hard: {
    botSpeed: 2.35,
    botDamage: 1.25,
    botFire: 0.07
  }
};

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  do {
    code = "";

    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (rooms.has(code));

  return code;
}

function randomSpawn() {
  let p;

  for (let i = 0; i < 100; i++) {
    p = {
      x: 100 + Math.random() * (MAP.width - 200),
      y: 100 + Math.random() * (MAP.height - 200)
    };

    if (!wallCollision(p.x, p.y, 24)) {
      return p;
    }
  }

  return {
    x: MAP.width / 2,
    y: MAP.height / 2
  };
}

function getSkin(id) {
  return SKINS.find(s => s.id === id) || SKINS[0];
}

function wallCollision(x, y, radius = 20) {
  for (const w of WALLS) {
    const closestX = Math.max(w.x, Math.min(x, w.x + w.w));
    const closestY = Math.max(w.y, Math.min(y, w.y + w.h));

    const dx = x - closestX;
    const dy = y - closestY;

    if (dx * dx + dy * dy < radius * radius) {
      return true;
    }
  }

  return false;
}

function moveEntity(e, dx, dy) {
  const len = Math.hypot(dx, dy);

  if (len > 1) {
    dx /= len;
    dy /= len;
  }

  const nx = e.x + dx * e.speed;
  const ny = e.y + dy * e.speed;

  if (
    nx > 25 &&
    nx < MAP.width - 25 &&
    !wallCollision(nx, e.y, 22)
  ) {
    e.x = nx;
  }

  if (
    ny > 25 &&
    ny < MAP.height - 25 &&
    !wallCollision(e.x, ny, 22)
  ) {
    e.y = ny;
  }
}

function send(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(room, data) {
  for (const player of room.players.values()) {
    send(player.ws, data);
  }
}

function publicPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    x: p.x,
    y: p.y,
    hp: Math.round(p.hp),
    maxHp: p.maxHp,
    shield: Math.round(p.shield),
    weapon: p.weapon.name,
    skin: p.skin,
    kills: p.kills,
    alive: p.alive,
    facing: p.facing || 0,
    botDamage: p.botDamage,
    superReady: p.superReady
  };
}

function publicBot(b) {
  return {
    id: b.id,
    name: b.name,
    x: b.x,
    y: b.y,
    hp: Math.round(b.hp),
    maxHp: b.maxHp,
    shield: Math.round(b.shield),
    weapon: b.weapon.name,
    skin: b.skin,
    kills: b.kills || 0,
    alive: b.alive,
    facing: b.facing || 0
  };
}

function createPlayer(ws, data) {
  const skin = getSkin(data.skin);
  const spawn = randomSpawn();

  const melee =
    skin.weapon === "Shotgun"
      ? WEAPONS.shotgun
      : skin.weapon === "SMG"
        ? WEAPONS.smg
        : skin.weapon === "AR"
          ? WEAPONS.ar
          : WEAPONS.pistol;

  return {
    id: "p_" + Math.random().toString(36).slice(2, 10),
    ws,
    name: String(data.name || "Player").slice(0, 15),
    x: spawn.x,
    y: spawn.y,
    speed: 4,
    hp: 100 + skin.healthBonus,
    maxHp: 100 + skin.healthBonus,
    shield: 50 + skin.shieldBonus,
    maxShield: 50 + skin.shieldBonus,
    skin: skin.id,
    weapon: melee,
    kills: 0,
    alive: true,
    facing: 0,
    lastShot: 0,
    lastHeal: 0,
    botDamage: 0,
    superReady: false,
    moveX: 0,
    moveY: 0,
    isBot: false
  };
}

function createBot(room, index) {
  const skin = SKINS[index % SKINS.length];
  const spawn = randomSpawn();

  let weapon;

  if (index % 4 === 0) {
    weapon = WEAPONS.melee;
  } else if (index % 3 === 0) {
    weapon = WEAPONS.shotgun;
  } else if (index % 2 === 0) {
    weapon = WEAPONS.ar;
  } else {
    weapon = WEAPONS.smg;
  }

  return {
    id: `bot_${room.code}_${index}_${Date.now()}`,
    name: `Bot ${index + 1}`,
    x: spawn.x,
    y: spawn.y,
    speed: DIFFICULTY[room.difficulty].botSpeed,
    hp: 100 + skin.healthBonus,
    maxHp: 100 + skin.healthBonus,
    shield: 50 + skin.shieldBonus,
    maxShield: 50 + skin.shieldBonus,
    skin: skin.id,
    weapon,
    kills: 0,
    alive: true,
    facing: 0,
    lastShot: 0,
    isBot: true,
    targetId: null
  };
}

function damageTarget(room, attacker, target, amount) {
  if (!target || !target.alive) return;

  let damage = amount;

  if (target.shield > 0) {
    const shieldDamage = Math.min(target.shield, damage);

    target.shield -= shieldDamage;
    damage -= shieldDamage;
  }

  if (damage > 0) {
    target.hp -= damage;
  }

  if (attacker && !attacker.isBot && target.isBot) {
    attacker.botDamage += amount;

    const skin = getSkin(attacker.skin);

    if (
      skin.superNeed &&
      attacker.botDamage >= skin.superNeed
    ) {
      attacker.superReady = true;
    }
  }

  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;

    if (attacker) {
      attacker.kills = (attacker.kills || 0) + 1;
    }

    broadcast(room, {
      type: "elimination",
      killer: attacker?.id || null,
      victim: target.id
    });

    checkRound(room);
  }
}

function shoot(room, attacker, dx, dy) {
  if (!attacker || !attacker.alive) return;

  const now = Date.now();

  if (now - attacker.lastShot < attacker.weapon.cooldown) {
    return;
  }

  attacker.lastShot = now;

  const length = Math.hypot(dx, dy);

  if (!length) return;

  dx /= length;
  dy /= length;

  attacker.facing = Math.atan2(dy, dx);

  if (attacker.weapon.type === "melee") {
    meleeAttack(room, attacker, dx, dy);
    return;
  }

  if (attacker.weapon.type === "shotgun") {
    for (let i = -2; i <= 2; i++) {
      const spread = i * 0.09;

      const c = Math.cos(spread);
      const s = Math.sin(spread);

      const bx = dx * c - dy * s;
      const by = dx * s + dy * c;

      createBullet(room, attacker, bx, by);
    }

    return;
  }

  createBullet(room, attacker, dx, dy);
}

function createBullet(room, attacker, dx, dy) {
  broadcast(room, {
    type: "bulletSpawn",
    x: attacker.x + dx * 30,
    y: attacker.y + dy * 30,
    dx,
    dy,
    speed: attacker.weapon.speed,
    color: getSkin(attacker.skin).color
  });

  const maxDistance = attacker.weapon.range;
  const step = 10;

  let x = attacker.x;
  let y = attacker.y;

  for (let d = 0; d < maxDistance; d += step) {
    x += dx * step;
    y += dy * step;

    if (wallCollision(x, y, 4)) {
      broadcast(room, {
        type: "bulletImpact",
        x,
        y
      });

      return;
    }

    const targets = [
      ...room.players.values(),
      ...room.bots
    ];

    for (const target of targets) {
      if (target.id === attacker.id || !target.alive) continue;

      if (Math.hypot(target.x - x, target.y - y) < 25) {
        let damage = attacker.weapon.damage;

        const skin = getSkin(attacker.skin);

        damage *= 1 + skin.damageBonus / 100;

        if (attacker.isBot) {
          damage *= DIFFICULTY[room.difficulty].botDamage;
        }

        damageTarget(room, attacker, target, damage);

        broadcast(room, {
          type: "bulletHit",
          x: target.x,
          y: target.y
        });

        return;
      }
    }
  }
}

function meleeAttack(room, attacker, dx, dy) {
  const targets = [
    ...room.players.values(),
    ...room.bots
  ];

  const skin = getSkin(attacker.skin);

  for (const target of targets) {
    if (target.id === attacker.id || !target.alive) continue;

    const vx = target.x - attacker.x;
    const vy = target.y - attacker.y;

    const distance = Math.hypot(vx, vy);

    if (distance > 85) continue;

    const dot = (vx / Math.max(distance, 1)) * dx +
      (vy / Math.max(distance, 1)) * dy;

    if (dot < 0.25) continue;

    let damage = attacker.weapon.damage;

    damage *= 1 + skin.damageBonus / 100;

    damageTarget(room, attacker, target, damage);

    broadcast(room, {
      type: "meleeEffect",
      x: target.x,
      y: target.y
    });

    break;
  }
}

function heal(player, room) {
  if (!player || !player.alive) return;

  const now = Date.now();

  if (now - player.lastHeal < 6000) return;

  if (player.hp >= player.maxHp) return;

  player.lastHeal = now;

  player.hp = Math.min(
    player.maxHp,
    player.hp + 35
  );

  player.shield = Math.min(
    player.maxShield,
    player.shield + 10
  );

  broadcast(room, {
    type: "healEffect",
    x: player.x,
    y: player.y
  });
}

function useSuper(player, room) {
  if (!player || !player.alive) return;

  if (!player.superReady) return;

  player.superReady = false;
  player.botDamage = 0;

  const radius = 180;

  const targets = [
    ...room.players.values(),
    ...room.bots
  ];

  const skin = getSkin(player.skin);

  for (const target of targets) {
    if (target.id === player.id || !target.alive) continue;

    const distance = Math.hypot(
      target.x - player.x,
      target.y - player.y
    );

    if (distance <= radius) {
      let damage = 65 + skin.damageBonus;

      damageTarget(room, player, target, damage);
    }
  }

  broadcast(room, {
    type: "superEffect",
    x: player.x,
    y: player.y
  });
}

function nearestTarget(room, bot) {
  let best = null;
  let bestDistance = Infinity;

  for (const p of room.players.values()) {
    if (!p.alive) continue;

    const d = Math.hypot(
      p.x - bot.x,
      p.y - bot.y
    );

    if (d < bestDistance) {
      best = p;
      bestDistance = d;
    }
  }

  return best;
}

function updateBots(room) {
  const difficulty = DIFFICULTY[room.difficulty];

  for (const bot of room.bots) {
    if (!bot.alive) continue;

    const target = nearestTarget(room, bot);

    if (!target) continue;

    const dx = target.x - bot.x;
    const dy = target.y - bot.y;

    const distance = Math.hypot(dx, dy);

    if (!distance) continue;

    const nx = dx / distance;
    const ny = dy / distance;

    bot.facing = Math.atan2(ny, nx);

    if (bot.weapon.type === "melee") {
      if (distance > 65) {
        moveEntity(bot, nx, ny);
      } else {
        shoot(room, bot, nx, ny);
      }

      continue;
    }

    if (distance > 300) {
      moveEntity(bot, nx, ny);
    } else if (distance < 170) {
      moveEntity(bot, -nx, -ny);
    } else {
      const side = Math.sin(Date.now() / 700 + bot.id.length);

      moveEntity(
        bot,
        -ny * side,
        nx * side
      );
    }

    if (
      distance < bot.weapon.range &&
      Math.random() < difficulty.botFire
    ) {
      shoot(room, bot, nx, ny);
    }
  }
}

function checkRound(room) {
  const alivePlayers = [
    ...room.players.values()
  ].filter(p => p.alive);

  const aliveBots = room.bots.filter(
    b => b.alive
  );

  if (alivePlayers.length === 0) {
    broadcast(room, {
      type: "roundEnd",
      winner: null
    });

    room.roundOver = true;
    return;
  }

  if (aliveBots.length === 0) {
    broadcast(room, {
      type: "roundEnd",
      winner: alivePlayers[0].id
    });

    room.roundOver = true;
  }
}

function resetRound(room) {
  room.roundOver = false;

  for (const p of room.players.values()) {
    const skin = getSkin(p.skin);
    const spawn = randomSpawn();

    p.x = spawn.x;
    p.y = spawn.y;
    p.hp = 100 + skin.healthBonus;
    p.maxHp = 100 + skin.healthBonus;
    p.shield = 50 + skin.shieldBonus;
    p.maxShield = 50 + skin.shieldBonus;
    p.alive = true;
    p.botDamage = 0;
    p.superReady = false;
    p.lastShot = 0;
    p.lastHeal = 0;
  }

  room.bots = [];

  for (let i = 0; i < room.botCount; i++) {
    room.bots.push(createBot(room, i));
  }

  broadcast(room, {
    type: "newRound"
  });
}

function sendState(room) {
  broadcast(room, {
    type: "state",
    players: [...room.players.values()].map(publicPlayer),
    bots: room.bots.map(publicBot),
    walls: WALLS,
    map: MAP,
    difficulty: room.difficulty
  });
}

setInterval(() => {
  for (const room of rooms.values()) {
    if (!room.roundOver) {
      updateBots(room);
      sendState(room);
    }
  }
}, 1000 / 20);

wss.on("connection", ws => {
  const client = {
    ws,
    room: null,
    player: null
  };

  send(ws, {
    type: "connected",
    id: "pending",
    map: MAP,
    walls: WALLS,
    skins: SKINS,
    tutorial: TUTORIAL
  });

  ws.on("message", raw => {
    let data;

    try {
      data = JSON.parse(raw.toString());
    } catch {
      send(ws, {
        type: "errorMessage",
        message: "Ungültige Nachricht."
      });

      return;
    }

    if (data.type === "createRoom") {
      if (client.room) return;

      const code = randomCode();

      const room = {
        code,
        difficulty:
          ["easy", "medium", "hard"].includes(data.difficulty)
            ? data.difficulty
            : "medium",
        botCount: Math.max(
          0,
          Math.min(5, Number(data.bots) || 0)
        ),
        players: new Map(),
        bots: [],
        roundOver: false
      };

      const player = createPlayer(ws, data);

      client.room = room;
      client.player = player;

      room.players.set(player.id, player);
      rooms.set(code, room);

      for (let i = 0; i < room.botCount; i++) {
        room.bots.push(createBot(room, i));
      }

      send(ws, {
        type: "connected",
        id: player.id,
        map: MAP,
        walls: WALLS,
        skins: SKINS,
        tutorial: TUTORIAL
      });

      send(ws, {
        type: "roomCreated",
        code,
        difficulty: room.difficulty
      });

      sendState(room);

      return;
    }

    if (data.type === "joinRoom") {
      if (client.room) return;

      const code = String(data.code || "").toUpperCase();
      const room = rooms.get(code);

      if (!room) {
        send(ws, {
          type: "errorMessage",
          message: "Lobby nicht gefunden."
        });

        return;
      }

      const player = createPlayer(ws, data);

      client.room = room;
      client.player = player;

      room.players.set(player.id, player);

      send(ws, {
        type: "connected",
        id: player.id,
        map: MAP,
        walls: WALLS,
        skins: SKINS,
        tutorial: TUTORIAL
      });

      send(ws, {
        type: "joinedRoom",
        code: room.code,
        difficulty: room.difficulty
      });

      sendState(room);

      return;
    }

    if (!client.room || !client.player) {
      return;
    }

    const room = client.room;
    const player = client.player;

    if (data.type === "moveIntent") {
      if (!player.alive || room.roundOver) return;

      let dx = Number(data.dx) || 0;
      let dy = Number(data.dy) || 0;

      dx = Math.max(-1, Math.min(1, dx));
      dy = Math.max(-1, Math.min(1, dy));

      player.moveX = dx;
      player.moveY = dy;

      moveEntity(player, dx, dy);

      if (dx || dy) {
        player.facing = Math.atan2(dy, dx);
      }

      return;
    }

    if (data.type === "shoot") {
      if (room.roundOver) return;

      const dx = Number(data.dx) || 0;
      const dy = Number(data.dy) || 0;

      shoot(room, player, dx, dy);

      return;
    }

    if (data.type === "heal") {
      heal(player, room);
      return;
    }

    if (data.type === "useSuper") {
      useSuper(player, room);
      return;
    }

    if (data.type === "reload") {
      player.lastShot = 0;
      return;
    }

    if (data.type === "changeSkin") {
      const skin = getSkin(data.skin);

      player.skin = skin.id;

      player.hp = Math.min(
        player.hp,
        100 + skin.healthBonus
      );

      player.maxHp = 100 + skin.healthBonus;
      player.maxShield = 50 + skin.shieldBonus;
      player.shield = Math.min(
        player.shield,
        player.maxShield
      );

      return;
    }

    if (data.type === "newRound") {
      if (!room.roundOver) return;

      resetRound(room);

      return;
    }
  });

  ws.on("close", () => {
    if (!client.room || !client.player) return;

    const room = client.room;

    room.players.delete(client.player.id);

    if (room.players.size === 0) {
      rooms.delete(room.code);
    } else {
      checkRound(room);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Battle Zone Server läuft auf Port ${PORT}`);
});
