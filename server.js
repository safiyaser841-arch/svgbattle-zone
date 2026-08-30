"use strict";

const http = require("http");
const express = require("express");
const WebSocket = require("ws");

const app = express();

app.get("/", (req, res) => {
    res.send("⚡ Battle Zone Server läuft!");
});

app.get("/health", (req, res) => {
    res.json({
        ok: true,
        game: "Battle Zone",
        version: "2.0.0"
    });
});

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const wss = new WebSocket.Server({
    server
});

/* =====================================================
   GAME DATA
===================================================== */

const MAP = {
    width: 1600,
    height: 900
};

const WALLS = [
    { x: 250, y: 180, w: 220, h: 55 },
    { x: 650, y: 120, w: 60, h: 240 },
    { x: 950, y: 250, w: 250, h: 55 },
    { x: 350, y: 600, w: 300, h: 55 },
    { x: 850, y: 600, w: 70, h: 190 },
    { x: 1150, y: 500, w: 220, h: 55 },
    { x: 700, y: 400, w: 180, h: 55 }
];

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
        damageBonus: 0,
        healthBonus: 0,
        shieldBonus: 0,
        price: 0,
        superNeed: 500
    },

    {
        id: "rare1",
        name: "Blue Storm",
        rarity: "Rare",
        color: "#2563eb",
        weapon: "SMG",
        damageBonus: 5,
        healthBonus: 10,
        shieldBonus: 10,
        price: 50,
        superNeed: 600
    },

    {
        id: "rare2",
        name: "Green Hunter",
        rarity: "Rare",
        color: "#22c55e",
        weapon: "SMG",
        damageBonus: 7,
        healthBonus: 15,
        shieldBonus: 10,
        price: 100,
        superNeed: 650
    },

    {
        id: "rare3",
        name: "Red Flash",
        rarity: "Rare",
        color: "#ef4444",
        weapon: "Shotgun",
        damageBonus: 10,
        healthBonus: 20,
        shieldBonus: 10,
        price: 150,
        superNeed: 700
    },

    {
        id: "epic1",
        name: "Shadow",
        rarity: "Epic",
        color: "#7c3aed",
        weapon: "Rifle",
        damageBonus: 15,
        healthBonus: 25,
        shieldBonus: 20,
        price: 300,
        superNeed: 800
    },

    {
        id: "epic2",
        name: "Cyber",
        rarity: "Epic",
        color: "#ec4899",
        weapon: "Rifle",
        damageBonus: 18,
        healthBonus: 30,
        shieldBonus: 25,
        price: 500,
        superNeed: 900
    },

    {
        id: "mythic",
        name: "Mythic Warrior",
        rarity: "Mythical",
        color: "#f59e0b",
        weapon: "Heavy Rifle",
        damageBonus: 25,
        healthBonus: 45,
        shieldBonus: 35,
        price: 1000,
        superNeed: 1000
    },

    {
        id: "legendary",
        name: "Legend",
        rarity: "Legendary",
        color: "#facc15",
        weapon: "Legend Rifle",
        damageBonus: 30,
        healthBonus: 60,
        shieldBonus: 50,
        price: 2001,
        superNeed: 1200
    }
];

/* =====================================================
   DIFFICULTY
===================================================== */

const DIFFICULTIES = {

    easy: {
        botSpeed: 1.2,
        botDamage: 7,
        botFireRate: 1400
    },

    medium: {
        botSpeed: 1.8,
        botDamage: 10,
        botFireRate: 950
    },

    hard: {
        botSpeed: 2.5,
        botDamage: 14,
        botFireRate: 650
    }

};

/* =====================================================
   ROOMS
===================================================== */

const rooms = new Map();

function randomCode(){

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for(let i=0;i<4;i++){

        code += chars[
            Math.floor(
                Math.random()*chars.length
            )
        ];

    }

    if(rooms.has(code))
        return randomCode();

    return code;
}

/* =====================================================
   PLAYER
===================================================== */

function createPlayer(ws,name,skinId){

    const skin =
        SKINS.find(s=>s.id===skinId)
        ||SKINS[0];

    return {

        id: randomId(),

        ws,

        name:
        String(name||"Player")
        .substring(0,15),

        skin: skin.id,

        x: 0,
        y: 0,

        hp: 100+skin.healthBonus,

        maxHp: 100+skin.healthBonus,

        shield: 50+skin.shieldBonus,

        maxShield: 50+skin.shieldBonus,

        kills: 0,

        alive: true,

        weapon: skin.weapon,

        damageBonus: skin.damageBonus,

        facing: 0,

        moveX: 0,
        moveY: 0,

        lastShot: 0,

        lastHeal: 0,

        superCharge: 0,

        started: false

    };

}

function randomId(){

    return Math.random()
        .toString(36)
        .substring(2,10)
        .toUpperCase();

}

/* =====================================================
   BOT
===================================================== */

function createBot(number,difficulty){

    return {

        id:"BOT_"+randomId(),

        name:"Bot "+number,

        skin:SKINS[
            Math.floor(
                Math.random()*SKINS.length
            )
        ].id,

        x:
        100+
        Math.random()*
        (MAP.width-200),

        y:
        100+
        Math.random()*
        (MAP.height-200),

        hp:100,

        maxHp:100,

        shield:50,

        maxShield:50,

        alive:true,

        kills:0,

        weapon:"SMG",

        facing:0,

        lastShot:0,

        target:null,

        difficulty

    };

}

/* =====================================================
   COLLISION
===================================================== */

function circleRectCollision(
    x,
    y,
    radius,
    rect
){

    const closestX=Math.max(
        rect.x,
        Math.min(x,rect.x+rect.w)
    );

    const closestY=Math.max(
        rect.y,
        Math.min(y,rect.y+rect.h)
    );

    const dx=x-closestX;
    const dy=y-closestY;

    return dx*dx+dy*dy<
           radius*radius;

}

function blocked(x,y){

    const radius=18;

    if(
        x<radius ||
        y<radius ||
        x>MAP.width-radius ||
        y>MAP.height-radius
    ){

        return true;

    }

    return WALLS.some(
        w=>circleRectCollision(
            x,
            y,
            radius,
            w
        )
    );

}

/* =====================================================
   SAFE MOVE
===================================================== */

function moveEntity(entity,dx,dy){

    const length=Math.hypot(dx,dy);

    if(length>1){

        dx/=length;
        dy/=length;

    }

    const speed=entity.isBot
        ?DIFFICULTIES[
            entity.difficulty
        ].botSpeed
        :4;

    const nx=
        entity.x+
        dx*speed;

    const ny=
        entity.y+
        dy*speed;

    if(!blocked(nx,entity.y))
        entity.x=nx;

    if(!blocked(entity.x,ny))
        entity.y=ny;

}

/* =====================================================
   DAMAGE
===================================================== */

function damage(target,amount,killer){

    if(!target.alive)
        return;

    let damageLeft=amount;

    if(target.shield>0){

        const shieldDamage=
            Math.min(
                target.shield,
                damageLeft
            );

        target.shield-=shieldDamage;

        damageLeft-=shieldDamage;

    }

    if(damageLeft>0){

        target.hp-=damageLeft;

    }

    if(killer){

        killer.superCharge+=amount;

        if(killer.superCharge>2000)
            killer.superCharge=2000;

    }

    if(target.hp<=0){

        target.hp=0;

        eliminate(target,killer);

    }

}

/* =====================================================
   ELIMINATION
===================================================== */

function eliminate(target,killer){

    if(!target.alive)
        return;

    target.alive=false;

    if(killer){

        killer.kills++;

        broadcastRoom(
            target.room,
            {
                type:"elimination",
                killer:killer.id,
                victim:target.id
            }
        );

    }

    checkRound(target.room);

}

/* =====================================================
   ROUND
===================================================== */

function checkRound(room){

    if(!room)
        return;

    const alivePlayers=
        room.players.filter(
            p=>p.alive
        );

    const aliveBots=
        room.bots.filter(
            b=>b.alive
        );

    const total=
        alivePlayers.length+
        aliveBots.length;

    if(total<=1){

        const winner=
            alivePlayers[0]||
            aliveBots[0];

        broadcastRoom(
            room,
            {
                type:"roundEnd",
                winner:winner?.id||null
            }
        );

    }

}

/* =====================================================
   BULLETS
===================================================== */

const bullets=[];

function createBullet(
    owner,
    dx,
    dy
){

    const length=Math.hypot(dx,dy);

    if(length<0.01)
        return;

    dx/=length;
    dy/=length;

    const now=Date.now();

    if(
        now-owner.lastShot<
        getFireDelay(owner)
    ){

        return;

    }

    owner.lastShot=now;

    bullets.push({

        id:randomId(),

        owner,

        room:owner.room,

        x:owner.x,

        y:owner.y,

        dx,

        dy,

        speed:15,

        damage:
            getDamage(owner),

        life:100

    });

    broadcastRoom(
        owner.room,
        {
            type:"bulletSpawn",

            x:owner.x,
            y:owner.y,

            dx,
            dy,

            speed:15,

            color:
                getSkin(owner.skin)?.color
                ||"#facc15"
        }
    );

}

function getDamage(player){

    const skin=
        getSkin(player.skin);

    return 12*
        (1+(skin?.damageBonus||0)/100);

}

function getFireDelay(player){

    const skin=
        getSkin(player.skin);

    if(
        skin?.weapon==="Shotgun"
    )
        return 750;

    if(
        skin?.weapon==="Heavy Rifle"
    )
        return 500;

    if(
        skin?.weapon==="Legend Rifle"
    )
        return 400;

    return 350;

}

/* =====================================================
   UPDATE BULLETS
===================================================== */

function updateBullets(){

    for(let i=bullets.length-1;i>=0;i--){

        const b=bullets[i];

        b.x+=b.dx*b.speed;
        b.y+=b.dy*b.speed;

        b.life--;

        if(
            b.life<=0||
            blocked(b.x,b.y)
        ){

            bullets.splice(i,1);

            continue;

        }

        const room=b.room;

        if(!room)
            continue;

        const entities=[
            ...room.players,
            ...room.bots
        ];

        let hit=false;

        for(const target of entities){

            if(
                !target.alive||
                target===b.owner
            )
                continue;

            const distance=
                Math.hypot(
                    target.x-b.x,
                    target.y-b.y
                );

            if(distance<25){

                damage(
                    target,
                    b.damage,
                    b.owner
                );

                broadcastRoom(
                    room,
                    {
                        type:"effect",
                        effect:"hit",
                        x:b.x,
                        y:b.y
                    }
                );

                bullets.splice(i,1);

                hit=true;

                break;

            }

        }

        if(hit)
            continue;

    }

}

/* =====================================================
   BOTS
===================================================== */

function updateBots(){

    for(const room of rooms.values()){

        for(const bot of room.bots){

            if(!bot.alive)
                continue;

            const players=
                room.players.filter(
                    p=>p.alive
                );

            if(players.length===0)
                continue;

            let closest=null;
            let distance=Infinity;

            for(const p of players){

                const d=
                    Math.hypot(
                        p.x-bot.x,
                        p.y-bot.y
                    );

                if(d<distance){

                    distance=d;
                    closest=p;

                }

            }

            if(!closest)
                continue;

            bot.target=closest;

            const dx=
                closest.x-bot.x;

            const dy=
                closest.y-bot.y;

            const length=
                Math.hypot(dx,dy);

            if(length>170){

                moveEntity(
                    bot,
                    dx/length,
                    dy/length
                );

            }else{

                moveEntity(
                    bot,
                    -dy/length*.6,
                    dx/length*.6
                );

            }

            bot.facing=
                Math.atan2(dy,dx);

            const settings=
                DIFFICULTIES[
                    bot.difficulty
                ]||DIFFICULTIES.medium;

            if(
                distance<600 &&
                Date.now()-bot.lastShot>
                settings.botFireRate
            ){

                bot.lastShot=Date.now();

                createBullet(
                    bot,
                    dx,
                    dy
                );

            }

        }

    }

}

/* =====================================================
   HEAL
===================================================== */

function healPlayer(player){

    const now=Date.now();

    if(
        now-player.lastHeal<
        5000
    )
        return;

    if(
        player.hp>=player.maxHp
    )
        return;

    player.lastHeal=now;

    player.hp=Math.min(
        player.maxHp,
        player.hp+30
    );

    broadcastRoom(
        player.room,
        {
            type:"effect",
            effect:"heal",
            x:player.x,
            y:player.y
        }
    );

}

/* =====================================================
   SUPER
===================================================== */

function useSuper(player){

    const skin=
        getSkin(player.skin);

    const need=
        skin?.superNeed||500;

    if(
        player.superCharge<
        need
    )
        return;

    player.superCharge=0;

    const room=player.room;

    for(
        const target of [
            ...room.players,
            ...room.bots
        ]
    ){

        if(
            target===player||
            !target.alive
        )
            continue;

        const distance=
            Math.hypot(
                target.x-player.x,
                target.y-player.y
            );

        if(distance<220){

            damage(
                target,
                40+
                (skin.damageBonus||0),
                player
            );

        }

    }

    broadcastRoom(
        room,
        {
            type:"effect",
            effect:"super",
            x:player.x,
            y:player.y
        }
    );

}

/* =====================================================
   ROUND RESET
===================================================== */

function resetRound(room){

    if(!room)
        return;

    room.bullets=[];

    room.players.forEach((p,index)=>{

        const pos=spawnPosition(index);

        const skin=
            getSkin(p.skin);

        p.x=pos.x;
        p.y=pos.y;

        p.maxHp=
            100+
            (skin?.healthBonus||0);

        p.hp=p.maxHp;

        p.maxShield=
            50+
            (skin?.shieldBonus||0);

        p.shield=p.maxShield;

        p.alive=true;

        p.superCharge=0;

        p.started=true;

    });

    room.bots.forEach((b,index)=>{

        const pos=
            spawnPosition(
                room.players.length+index
            );

        b.x=pos.x;
        b.y=pos.y;

        b.hp=100;
        b.shield=50;
        b.alive=true;
        b.superCharge=0;

    });

    broadcastRoom(
        room,
        {
            type:"newRound"
        }
    );

}

function spawnPosition(index){

    const positions=[

        {x:150,y:150},
        {x:1450,y:150},
        {x:150,y:750},
        {x:1450,y:750},
        {x:800,y:150},
        {x:800,y:750},
        {x:400,y:450},
        {x:1200,y:450}

    ];

    return positions[
        index%positions.length
    ];

}

/* =====================================================
   WEBSOCKET
===================================================== */

wss.on("connection",ws=>{

    const id=randomId();

    ws.player=null;

    send(ws,{

        type:"connected",

        id,

        map:MAP,

        walls:WALLS,

        skins:SKINS

    });

    ws.on("message",raw=>{

        try{

            const data=
                JSON.parse(raw.toString());

            handleAction(ws,data);

        }catch(err){

            console.error(
                "Message error:",
                err
            );

        }

    });

    ws.on("close",()=>{

        const player=ws.player;

        if(!player)
            return;

        const room=player.room;

        if(room){

            room.players=
                room.players.filter(
                    p=>p!==player
                );

            broadcastRoom(
                room,
                {
                    type:"playerLeft",
                    id:player.id
                }
            );

        }

    });

});

/* =====================================================
   ACTIONS
===================================================== */

function handleAction(ws,data){

    if(data.type==="createRoom"){

        createRoom(ws,data);

        return;

    }

    if(data.type==="joinRoom"){

        joinRoom(ws,data);

        return;

    }

    const player=ws.player;

    if(!player)
        return;

    if(data.type==="move"){

        player.moveX=
            Number(data.dx)||0;

        player.moveY=
            Number(data.dy)||0;

        return;

    }

    if(data.type==="shoot"){

        createBullet(
            player,
            Number(data.dx)||0,
            Number(data.dy)||0
        );

        return;

    }

    if(data.type==="heal"){

        healPlayer(player);

        return;

    }

    if(data.type==="super"){

        useSuper(player);

        return;

    }

    if(data.type==="changeSkin"){

        changeSkin(
            player,
            data.skin
        );

        return;

    }

    if(data.type==="newRound"){

        resetRound(
            player.room
        );

        return;

    }

    if(data.type==="startGame"){

        player.started=true;

        return;

    }

    if(data.type==="reload"){

        return;

    }

}

/* =====================================================
   CREATE ROOM
===================================================== */

function createRoom(ws,data){

    const code=randomCode();

    const room={

        code,

        difficulty:
            DIFFICULTIES[data.difficulty]
            ?data.difficulty
            :"medium",

        players:[],

        bots:[],

        bullets:[],

        started:false

    };

    const player=
        createPlayer(
            ws,
            data.name,
            data.skin
        );

    player.id=
        ws.playerId||player.id;

    player.room=room;

    room.players.push(player);

    const botCount=
        Math.max(
            0,
            Math.min(
                5,
                Number(data.bots)||0
            )
        );

    for(
        let i=0;
        i<botCount;
        i++
    ){

        const bot=
            createBot(
                i+1,
                room.difficulty
            );

        bot.room=room;
        bot.isBot=true;

        room.bots.push(bot);

    }

    rooms.set(
        code,
        room
    );

    ws.player=player;

    send(ws,{

        type:"roomCreated",

        code,

        difficulty:
            room.difficulty

    });

    resetRound(room);

}

/* =====================================================
   JOIN ROOM
===================================================== */

function joinRoom(ws,data){

    const code=
        String(
            data.code||""
        )
        .toUpperCase();

    const room=
        rooms.get(code);

    if(!room){

        send(ws,{

            type:"error",

            message:"Raum nicht gefunden."

        });

        return;

    }

    if(room.players.length>=8){

        send(ws,{

            type:"error",

            message:"Der Raum ist voll."

        });

        return;

    }

    const player=
        createPlayer(
            ws,
            data.name,
            data.skin
        );

    player.room=room;

    ws.player=player;

    room.players.push(player);

    send(ws,{

        type:"joinedRoom",

        code:room.code,

        difficulty:
            room.difficulty

    });

    resetRound(room);

}

/* =====================================================
   SKIN
===================================================== */

function changeSkin(player,skinId){

    const skin=
        getSkin(skinId);

    if(!skin)
        return;

    player.skin=skin.id;

    player.weapon=skin.weapon;

    player.damageBonus=
        skin.damageBonus;

    player.maxHp=
        100+skin.healthBonus;

    player.maxShield=
        50+skin.shieldBonus;

    player.hp=
        Math.min(
            player.hp,
            player.maxHp
        );

    player.shield=
        Math.min(
            player.shield,
            player.maxShield
        );

}

/* =====================================================
   GET SKIN
===================================================== */

function getSkin(id){

    return SKINS.find(
        s=>s.id===id
    )||SKINS[0];

}

/* =====================================================
   SEND
===================================================== */

function send(ws,data){

    if(
        ws &&
        ws.readyState===
        WebSocket.OPEN
    ){

        ws.send(
            JSON.stringify(data)
        );

    }

}

function broadcastRoom(room,data){

    if(!room)
        return;

    for(
        const player of room.players
    ){

        send(
            player.ws,
            data
        );

    }

}

/* =====================================================
   STATE
===================================================== */

function cleanPlayer(player){

    return {

        id:player.id,

        name:player.name,

        skin:player.skin,

        x:Math.round(player.x),

        y:Math.round(player.y),

        hp:Math.round(player.hp),

        maxHp:player.maxHp,

        shield:Math.round(player.shield),

        maxShield:player.maxShield,

        alive:player.alive,

        kills:player.kills,

        weapon:player.weapon,

        facing:player.facing,

        superCharge:
            Math.round(
                player.superCharge
            )

    };

}

function cleanBot(bot){

    return {

        id:bot.id,

        name:bot.name,

        skin:bot.skin,

        x:Math.round(bot.x),

        y:Math.round(bot.y),

        hp:Math.round(bot.hp),

        maxHp:bot.maxHp,

        shield:Math.round(bot.shield),

        maxShield:bot.maxShield,

        alive:bot.alive,

        kills:bot.kills,

        weapon:bot.weapon,

        facing:bot.facing,

        superCharge:
            Math.round(
                bot.superCharge||0
            )

    };

}

/* =====================================================
   GAME LOOP
===================================================== */

setInterval(()=>{

    for(const room of rooms.values()){

        for(const player of room.players){

            if(
                player.alive &&
                player.started
            ){

                moveEntity(
                    player,
                    player.moveX,
                    player.moveY
                );

            }

        }

    }

    updateBots();
    updateBullets();

},1000/30);

/* =====================================================
   STATE LOOP
===================================================== */

setInterval(()=>{

    for(const room of rooms.values()){

        const state={

            type:"state",

            players:
                room.players.map(
                    cleanPlayer
                ),

            bots:
                room.bots.map(
                    cleanBot
                ),

            walls:WALLS,

            map:MAP,

            difficulty:
                room.difficulty

        };

        broadcastRoom(
            room,
            state
        );

    }

},1000/15);

/* =====================================================
   CLEAN EMPTY ROOMS
===================================================== */

setInterval(()=>{

    for(
        const [code,room]
        of rooms
    ){

        if(room.players.length===0){

            rooms.delete(code);

        }

    }

},30000);

/* =====================================================
   START SERVER
===================================================== */

server.listen(
    PORT,
    "0.0.0.0",
    ()=>{
        console.log(
            `⚡ Battle Zone Server läuft auf Port ${PORT}`
        );
    }
);
