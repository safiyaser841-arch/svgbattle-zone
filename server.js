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
    spread: 0.07,
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
    title: "Bewegen",
    text: "PC/Laptop: nur die Pfeiltasten. Handy/iPad: linker Joystick."
  },
  {
    title: "Zielen",
    text: "PC: Maus. Handy/iPad: rechter Bereich."
  },
  {
    title: "Schießen",
    text: "PC: Linksklick. Handy/iPad: roter Schussknopf."
  },
  {
    title: "Wände",
    text: "Spieler, Bots und Kugeln können nicht durch Wände."
  },
  {
    title: "Bots",
    text: "Du kannst 0 bis 5 Bots wählen."
  },
  {
    title: "Lobby",
    text: "Teile den Raumcode mit deinen Freunden."
  },
  {
    title: "Skins",
    text: "Skins haben eigene Namen, Waffen, Preise und Schadensboni."
  }
];

const rooms = {};

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

function getSkin(id) {
  return (
    SKINS.find(
      skin => skin.id === id
    ) || SKINS[0]
  );
}

function randomWeapon() {
  const names =
    Object.keys(WEAPONS);

  return names[
    Math.floor(
      Math.random() * names.length
    )
  ];
}

/* =========================================
   WALL COLLISIONS
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
   SPAWNS
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

    let tooClose = false;

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
        tooClose = true;
        break;
      }
    }

    if (!tooClose) {
      return { x, y };
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
   MOVE
========================================= */

function moveEntity(
  entity,
  dx,
  dy
) {
  const len =
    Math.hypot(dx, dy);

  if (!len) {
    return;
  }

  dx /= len;
  dy /= len;

  const speed =
    entity.bot
      ? 2.8
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
    entity.x =
      nextX;
  }

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

/* =========================================
   CREATE PLAYER / BOT
========================================= */

function createPlayer(
  ws,
  room,
  data
) {
  const skin =
    getSkin(data?.skin);

  const spawn =
    safeSpawn(room);

  return {
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

    hp: 100,
    shield: 50,

    alive: true,

    skin:
      skin.id,

    weapon:
      skin.weapon,

    kills: 0,

    botDamage: 0,

    superReady: false,

    cooldown: 0,

    trophyRewardGiven: false
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
        "bot-" +
        i +
        "-" +
        Math.random()
          .toString(36)
          .substring(
            2,
            8
          ),

      ws: null,

      bot: true,

      name:
        "BOT " +
        (i + 1),

      x:
        spawn.x,

      y:
        spawn.y,

      hp: 100,
      shield: 50,

      alive: true,

      skin:
        skin.id,

      weapon:
        skin.weapon,

      kills: 0,

      botDamage: 0,

      superReady: false,

      cooldown:
        Math.floor(
          Math.random() * 20
        ),

      target: null
    });
  }
}

/* =========================================
   STATE
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
          entity.shield ||
          0
        )
      ),

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

/* =========================================
   DAMAGE
========================================= */

function damageMultiplier(
  attacker
) {
  if (!attacker) {
    return 1;
  }

  const skin =
    getSkin(
      attacker.skin
    );

  return (
    1 +
    skin.damageBonus /
    100
  );
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
    Math.max(
      1,
      Math.round(
        rawDamage *
        damageMultiplier(
          attacker
        )
      )
    );

  let remaining =
    finalDamage;

  if (
    target.shield > 0
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

  target.hp = 0;
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

  sendState(
    room
  );
}

/* =========================================
   BULLETS
========================================= */

function spawnBullet(
  room,
  attacker,
  angle,
  weapon
) {
  room.bullets.push({

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
        0.9
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
          attacker.y
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
      Wand getroffen
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
      Gegner getroffen
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
          PLAYER_RADIUS + 5
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
   BOT AI
========================================= */

function updateBots() {

  for (
    const room of
    Object.values(
      rooms
    )
  ) {

    for (
      const bot
      of room.bots
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
        target =>
          target.alive &&
          target.id !==
            bot.id
      );

      if (
        !targets.length
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
      Nicht durch Wände gehen.
      */

      if (
        blocked ||
        d > 145
      ) {

        moveEntity(
          bot,
          dx,
          dy
        );
      }

      /*
      Nicht durch Wände schießen.
      */

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

  const alive =
    [
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
          alive.length === 1
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

  /*
  Alle alten Bots entfernen.
  */

  room.bots =
    [];

  /*
  Alle Spieler vor dem Spawning
  auf "nicht aktiv" setzen.
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
  mit Abstand spawnen.
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

    player.hp =
      100;

    player.shield =
      50;

    player.alive =
      true;

    player.cooldown =
      0;

    player.weapon =
      getSkin(
        player.skin
      ).weapon;

    player.botDamage =
      0;

    player.superReady =
      false;
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
   WEBSOCKET
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

        /*
        -----------------------------------------
        CREATE ROOM
        -----------------------------------------
        */

        if (
          data.type ===
          "createRoom"
        ) {

          const code =
            createRoomCode();

          const room = {

            code,

            players: {},

            bots: [],

            bullets: [],

            botCount:
              clamp(
                Number(
                  data.bots
                ) || 0,
                0,
                5
              ),

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

              code
            }
          );

          sendState(
            room
          );

          return;
        }

        /*
        -----------------------------------------
        JOIN ROOM
        -----------------------------------------
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
                  "Diese Lobby existiert nicht."
              }
            );

            return;
          }

          const playerCount =
            Object.keys(
              room.players
            ).length;

          if (
            playerCount >=
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

              code
            }
          );

          sendState(
            room
          );

          return;
        }

        /*
        -----------------------------------------
        MOVE
        -----------------------------------------
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
        -----------------------------------------
        SHOOT
        -----------------------------------------
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

        /*
        -----------------------------------------
        NEW ROUND
        -----------------------------------------
        */

        if (
          data.type ===
          "newRound"
        ) {

          const room =
            rooms[
              ws.room
            ];

          if (!room)
            return;

          restartRound(
            room
          );

          return;
        }

        /*
        -----------------------------------------
        SUPER
        -----------------------------------------
        */

        if (
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

          sendState(
            room
          );

          return;
        }

        /*
        -----------------------------------------
        SKIN
        -----------------------------------------
        */

        if (
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
              ws.clientId
            ];

          if (!player)
            return;

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

          sendState(
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

          sendState(
            room
          );

          checkRoundEnd(
            room
          );
        }
      }
    );
  }
);

/* =========================================
   SERVER LOOP
========================================= */

setInterval(
  () => {

    updateBots();

    updateBullets();

    for (
      const room of
      Object.values(
        rooms
      )
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
