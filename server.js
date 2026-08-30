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

const wss = new WebSocket.Server({ server });

const MAP = {
  width: 1600,
  height: 900
};

const PLAYER_RADIUS = 20;
const MIN_SPAWN_DISTANCE = 180;
const MAX_PLAYERS = 8;
const TICK_MS = 1000 / 30;

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

const DIFFICULTIES = {
  easy: {
    name: "Leicht",
    botSpeed: 2.0,
    aim: 0.78,
    fireChance: 0.55,
    reaction: 0.92,
    damage: 0.85
  },

  medium: {
    name: "Mittel",
    botSpeed: 2.8,
    aim: 0.90,
    fireChance: 0.78,
    reaction: 0.97,
    damage: 1.00
  },

  hard: {
    name: "Schwer",
    botSpeed: 3.4,
    aim: 0.97,
    fireChance: 0.92,
    reaction: 1.00,
    damage: 1.12
  }
};

const WEAPONS = {
  Pistole: {
    damage: 12,
    speed: 18,
    cooldown: 10,
    range: 760,
    pellets: 1,
    spread: 0,
    melee: false,
    ammo: 12,
    reload: 32
  },

  SMG: {
    damage: 6,
    speed: 20,
    cooldown: 4,
    range: 560,
    pellets: 1,
    spread: 0.08,
    melee: false,
    ammo: 28,
    reload: 36
  },

  Gewehr: {
    damage: 19,
    speed: 22,
    cooldown: 16,
    range: 900,
    pellets: 1,
    spread: 0.02,
    melee: false,
    ammo: 8,
    reload: 42
  },

  Schrotflinte: {
    damage: 7,
    speed: 15,
    cooldown: 30,
    range: 380,
    pellets: 6,
    spread: 0.28,
    melee: false,
    ammo: 5,
    reload: 50
  },

  Bogen: {
    damage: 30,
    speed: 14,
    cooldown: 28,
    range: 950,
    pellets: 1,
    spread: 0,
    melee: false,
    ammo: 6,
    reload: 45
  },

  Schwert: {
    damage: 35,
    speed: 0,
    cooldown: 18,
    range: 88,
    pellets: 1,
    spread: 0,
    melee: true,
    ammo: Infinity,
    reload: 0
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
    super: "Kein Super",
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
    super: "Feuerstoß",
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
    super: "Eisstoß",
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
    super: "Blitz",
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
    super: "Giftwelle",
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
    super: "Rotorkanone",
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
    super: "Teleport-Klinge",
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
    super: "Cyber-Salve",
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
    super: "Eissturm",
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
    super: "Feuerkreis",
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
    super: "Giftregen",
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
    super: "Galaxiestrahl",
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
    super: "Neon-Sturm",
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
    super: "Gewitter",
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
    super: "Magma-Welle",
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
    super: "Void-Schlag",
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
    super: "Drachenatem",
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
    super: "Dämonensprung",
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
    super: "Titanen-Schuss",
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
    super: "Phönix-Flamme",
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
    super: "Kosmischer Sturm",
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
    super: "Legendärer Strahl",
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
    super: "Königsschlag",
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
    super: "Götterhagel",
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
    super: "Omega-Zerstörer",
    healthBonus: 120,
    shieldBonus: 90
  }
];

const TUTORIAL = [
  {
    title: "Bewegen",
    text:
      "PC/Laptop: nur die Pfeiltasten. Handy/Tablet: linker Joystick."
  },
  {
    title: "Zielen",
    text:
      "PC: Maus. Handy/Tablet: rechter Bereich."
  },
  {
    title: "Schießen",
    text:
      "PC: Linksklick. Handy/Tablet: Schusstaste."
  },
  {
    title: "Nahkampf",
    text:
      "Nahkampf-Skins haben mehr Leben und Schutz."
  },
  {
    title: "Heilen",
    text:
      "Nach einer kurzen Zeit ohne Treffer regenerierst du Leben."
  },
  {
    title: "Schüsse",
    text:
      "Du bestimmst die Richtung deiner Schüsse und Schläge selbst."
  },
  {
    title: "Schwierigkeit",
    text:
      "Leicht, Mittel und Schwer verändern Bot-Geschwindigkeit, Reaktion und Genauigkeit."
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

function distance(a, b) {
  return Math.hypot(
    a.x - b.x,
    a.y - b.y
  );
}

function getSkin(id) {
  return (
    SKINS.find(
      skin => skin.id === id
    ) ||
    SKINS[0]
  );
}

function randomWeapon() {
  const names =
    Object.keys(WEAPONS);

  return names[
    Math.floor(
      Math.random() *
      names.length
    )
  ];
}

function randomCode() {
  return Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase();
}

function createRoomCode() {
  let code =
    randomCode();

  while (
    rooms[code]
  ) {
    code =
      randomCode();
  }

  return code;
}

/* =========================================
   WALLS
========================================= */

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
    Math.max(
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
        x <= wall.x +
          wall.w &&
        y >= wall.y &&
        y <= wall.y +
          wall.h
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

    if (
      !tooClose
    ) {
      return {
        x,
        y
      };
    }
  }

  return {
    x:
      MAP.width / 2,

    y:
      MAP.height / 2
  };
}

/* =========================================
   COMBATANT
========================================= */

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
    0;

  entity.botDamage =
    0;

  entity.superReady =
    false;

  entity.ammo =
    WEAPONS[
      entity.weapon
    ].ammo;

  if (
    !Number.isFinite(
      entity.ammo
    )
  ) {
    entity.ammo =
      999999;
  }
}

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

    bot: false,

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

    maxHp:
      100,

    shield:
      50,

    maxShield:
      50,

    alive:
      true,

    skin:
      skin.id,

    weapon:
      skin.weapon,

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
      0,

    trophies:
      0
  };

  resetCombatant(
    player
  );

  return player;
}

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
          i % 5
        )
      ];

    const bot = {

      id:
        "bot-" +
        i +
        "-" +
        Math.random()
          .toString(36)
          .slice(
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

      skin:
        skin.id,

      weapon:
        skin.weapon,

      kills:
        0,

      botDamage:
        0,

      superReady:
        false,

      cooldown:
        Math.floor(
          Math.random() *
          20
        ),

      reloadTimer:
        0,

      healCooldown:
        0,

      healTimer:
        0,

      lastHitAt:
        0,

      target:
        null
    };

    /*
    Bots bekommen nacheinander
    sichere Positionen.
    */

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

/* =========================================
   PUBLIC STATE
========================================= */

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
          entity.shield ||
          0
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
      entity.kills ||
      0,

    botDamage:
      entity.botDamage ||
      0,

    superReady:
      Boolean(
        entity.superReady
      ),

    ammo:
      entity.ammo,

    reloadTimer:
      entity.reloadTimer ||
      0,

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

      difficulty:
        room.difficulty,

      difficultyName:
        DIFFICULTIES[
          room.difficulty
        ].name,

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
   RELOAD
========================================= */

function finishReload(
  entity
) {
  const weapon =
    WEAPONS[
      entity.weapon
    ];

  if (!weapon)
    return;

  entity.ammo =
    weapon.ammo;

  entity.reloadTimer =
    0;
}

function tryReload(
  entity
) {
  const weapon =
    WEAPONS[
      entity.weapon
    ];

  if (
    !weapon ||
    weapon.melee ||
    entity.reloadTimer > 0 ||
    entity.ammo >=
      weapon.ammo
  ) {
    return;
  }

  entity.reloadTimer =
    weapon.reload;
}

/* =========================================
   HEALING
========================================= */

function manualHeal(
  entity
) {
  if (
    !entity.alive ||
    entity.healCooldown > 0
  ) {
    return false;
  }

  entity.healCooldown =
    150;

  entity.healTimer =
    0;

  entity.hp =
    Math.min(
      entity.maxHp,
      entity.hp + 28
    );

  entity.shield =
    Math.min(
      entity.maxShield,
      entity.shield + 12
    );

  return true;
}

/* =========================================
   DAMAGE
========================================= */

function damageMultiplier(
  attacker,
  room
) {
  const skin =
    getSkin(
      attacker?.skin
    );

  const base =
    1 +
    skin.damageBonus /
      100;

  if (
    attacker?.bot
  ) {
    const difficulty =
      DIFFICULTIES[
        room.difficulty
      ] ||
      DIFFICULTIES.medium;

    return (
      base *
      difficulty.damage
    );
  }

  return base;
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
    Math.max(
      1,
      Math.round(
        rawDamage *
        damageMultiplier(
          attacker,
          room
        )
      )
    );

  target.lastHitAt =
    Date.now();

  target.healTimer =
    0;

  let remaining =
    finalDamage;

  if (
    target.shield >
    0
  ) {
    const absorbed =
      Math.min(
        target.shield,
        remaining
      );

    target.shield -=
      absorbed;

    remaining -=
      absorbed;
  }

  if (
    remaining >
    0
  ) {
    target.hp -=
      remaining;
  }

  if (
    attacker &&
    target.bot
  ) {

    attacker.botDamage =
      (
        attacker.botDamage ||
        0
      ) +
      finalDamage;

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

      damage:
        finalDamage
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
      ) +
      1;
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

/* =========================================
   BULLETS
========================================= */

function spawnBullet(
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
      0
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
        getSkin(
          owner.skin
        ).color
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
    attacker.cooldown >
      0 ||
    attacker.reloadTimer >
      0
  ) {
    return;
  }

  if (
    !weapon.melee &&
    attacker.ammo <= 0
  ) {

    tryReload(
      attacker
    );

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
        Math.abs(diff) <=
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

        angle,

        weapon:
          attacker.weapon
      }
    );

    return;
  }

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

    spawnBullet(
      room,
      attacker,
      shotAngle,
      weapon
    );
  }

  if (
    attacker.ammo <=
    0
  ) {

    tryReload(
      attacker
    );
  }
}

/* =========================================
   FIND ENTITY
========================================= */

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
      bot.id ===
      id
  ) || null;
}

/* =========================================
   BULLET UPDATE
========================================= */

function updateBullets() {

  for (
    const room of
    Object.values(
      rooms
    )
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

      let hit =
        false;

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

/* =========================================
   BOT TARGET
========================================= */

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
    !targets.length
  ) {
    return null;
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

  return targets[0];
}

/* =========================================
   BOT MOVEMENT
========================================= */

function updateBot(
  room,
  bot
) {

  if (
    !bot.alive
  ) {
    return;
  }

  const difficulty =
    DIFFICULTIES[
      room.difficulty
    ] ||
    DIFFICULTIES.medium;

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
      finishReload(
        bot
      );
    }
  }

  if (
    bot.healCooldown >
      0
  ) {
    bot.healCooldown--;
  }

  const target =
    chooseTarget(
      room,
      bot
    );

  if (!target) {
    return;
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

  const trueAngle =
    Math.atan2(
      dy,
      dx
    );

  const blocked =
    lineHitsWall(
      bot.x,
      bot.y,
      target.x,
      target.y
    );

  const weapon =
    WEAPONS[
      bot.weapon
    ];

  if (!weapon) {
    return;
  }

  /*
  Bot heilt,
  wenn es sicher ist.
  */

  if (
    bot.hp <
      bot.maxHp * 0.35 &&
    bot.healCooldown <=
      0 &&
    d > 220 &&
    !blocked
  ) {

    bot.healCooldown =
      150;

    bot.hp =
      Math.min(
        bot.maxHp,
        bot.hp + 30
      );

    return;
  }

  /*
  Bewegung.
  */

  if (
    blocked ||
    d > 160
  ) {

    const speed =
      difficulty.botSpeed;

    moveEntity(
      bot,
      dx / d *
        speed,
      dy / d *
        speed
    );
  }

  /*
  Angriff.
  */

  if (
    !blocked &&
    d <=
      weapon.range &&
    bot.cooldown <=
      0
  ) {

    const accuracy =
      difficulty.aim;

    const randomOffset =
      (
        Math.random() -
        0.5
      ) *
      (
        1 -
        accuracy
      ) *
      0.9;

    const angle =
      trueAngle +
      randomOffset;

    const shouldFire =
      Math.random() <=
      difficulty.fireChance *
      difficulty.reaction;

    if (
      shouldFire
    ) {

      attack(
        room,
        bot,
        angle
      );
    }
  }
}

function updateBots() {

  for (
    const room of
    Object.values(
      rooms
    )
  ) {

    for (
      const bot of
      room.bots
    ) {

      updateBot(
        room,
        bot
      );
    }
  }
}

/* =========================================
   ROUND
========================================= */

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
          alive.length ===
            1
            ? alive[0].id
            : null
      }
    );
  }
}

function restartRound(
  room
) {

  room.bullets =
    [];

  room.roundActive =
    true;

  room.bots =
    [];

  /*
  Alle Spieler zunächst
  deaktivieren.
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
  Spieler nacheinander
  mit Mindestabstand.
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
  Bots danach.
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

/* =========================================
   CONNECTION
========================================= */

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

        weapons:
          Object.keys(
            WEAPONS
          ),

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

        /* =================================
           RESTLICHE EVENTS
        ================================= */

        const room =
          rooms[
            ws.room
          ];

        if (!room) {
          return;
        }

        /* MOVE */

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

          moveEntity(
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
            tryReload(
              player
            );
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

          if (
            !player ||
            !player.alive
          ) {
            return;
          }

          if (
            manualHeal(
              player
            )
          ) {

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
          }

          return;
        }

        /* SUPER */

        if (
          data.type ===
          "useSuper"
        ) {

          const player =
            room.players[
              ws.clientId
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
              ) <= 180 &&
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

          return;
        }

        /* NEW ROUND */

        if (
          data.type ===
          "newRound"
        ) {

          restartRound(
            room
          );

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

          if (
            (
              player.kills ||
              0
            ) <
            skin.price
          ) {

            send(
              ws,
              {
                type:
                  "errorMessage",

                message:
                  `Du brauchst ${skin.price} Kills für diesen Skin.`
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

        if (!room) {
          return;
        }

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

/* =========================================
   GAME LOOP
========================================= */

setInterval(
  () => {

    for (
      const room of
      Object.values(
        rooms
      )
    ) {

      updatePlayers(
        room
      );

      updateBotsForRoom(
        room
      );

      updateBulletsForRoom(
        room
      );

      sendState(
        room
      );
    }

  },
  TICK_MS
);

/*
Hilfswrapper für den Game Loop,
damit pro Raum gearbeitet wird.
*/

function updatePlayers(room) {

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

    if (
      player.healCooldown >
      0
    ) {

      player.healCooldown--;
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

        finishReload(
          player
        );
      }
    }

    if (
      !player.alive
    ) {
      continue;
    }

    /*
    Automatische langsame Heilung,
    wenn längere Zeit kein Treffer kam.
    */

    const safeTime =
      Date.now() -
      player.lastHitAt >
      3500;

    if (
      safeTime &&
      player.hp <
        player.maxHp &&
      player.healCooldown <=
        0
    ) {

      player.healTimer++;

      if (
        player.healTimer >=
        24
      ) {

        player.hp =
          Math.min(
            player.maxHp,
            player.hp + 4
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

function updateBotsForRoom(
  room
) {

  for (
    const bot of
    room.bots
  ) {

    updateBot(
      room,
      bot
    );
  }
}

function updateBulletsForRoom(
  room
) {

  /*
  Da updateBullets bereits alle
  Räume verarbeitet, wird hier
  nichts doppelt ausgeführt.
  */

}

server.on(
  "error",
  error => {
    console.error(
      "Server error:",
      error
    );
  }
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
