"use strict";

const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;

const wss = new WebSocket.Server({
    port: PORT
});

console.log("================================");
console.log("BATTLE ZONE SERVER");
console.log("Port:", PORT);
console.log("Server gestartet!");
console.log("================================");


/* ================= MAP ================= */

const MAP = {
    width: 1600,
    height: 900
};


const WALLS = [

    {
        x:350,
        y:200,
        w:250,
        h:50
    },

    {
        x:1000,
        y:200,
        w:250,
        h:50
    },

    {
        x:350,
        y:650,
        w:250,
        h:50
    },

    {
        x:1000,
        y:650,
        w:250,
        h:50
    },

    {
        x:750,
        y:350,
        w:100,
        h:200
    }

];


/* ================= ROOMS ================= */

const rooms = new Map();


/* ================= WEAPON ================= */

const WEAPON = {

    name: "Pistole",

    damage: 20,

    cooldown: 350,

    speed: 18,

    range: 900

};


/* ================= HELPERS ================= */

function randomCode(){

    const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    let code = "";

    for(let i=0;i<4;i++){

        code +=
            chars[
                Math.floor(
                    Math.random()*chars.length
                )
            ];

    }

    return code;

}


function createCode(){

    let code;

    do{

        code = randomCode();

    }while(rooms.has(code));

    return code;

}


function distance(a,b){

    return Math.hypot(
        a.x-b.x,
        a.y-b.y
    );

}


function normalize(x,y){

    const length =
        Math.hypot(x,y);

    if(length === 0){

        return {
            x:0,
            y:0
        };

    }

    return {
        x:x/length,
        y:y/length
    };

}


function insideWall(x,y,radius){

    for(const wall of WALLS){

        if(

            x + radius > wall.x &&
            x - radius < wall.x + wall.w &&
            y + radius > wall.y &&
            y - radius < wall.y + wall.h

        ){

            return true;

        }

    }

    return false;

}


function validPosition(x,y){

    const radius = 22;

    if(
        x < radius ||
        y < radius ||
        x > MAP.width-radius ||
        y > MAP.height-radius
    ){

        return false;

    }

    if(
        insideWall(
            x,
            y,
            radius
        )
    ){

        return false;

    }

    return true;

}


function randomSpawn(){

    for(let i=0;i<100;i++){

        const x =
            100 +
            Math.random() *
            (MAP.width-200);

        const y =
            100 +
            Math.random() *
            (MAP.height-200);

        if(validPosition(x,y)){

            return {
                x:x,
                y:y
            };

        }

    }

    return {
        x:800,
        y:450
    };

}


/* ================= PLAYER ================= */

function createPlayer(
    ws,
    name
){

    const spawn =
        randomSpawn();

    return {

        id:
            "p_" +
            Math.random()
            .toString(36)
            .substring(2,10),

        ws:ws,

        name:
            name || "Player",

        x:spawn.x,

        y:spawn.y,

        hp:100,

        maxHp:100,

        shield:50,

        alive:true,

        kills:0,

        weapon:"Pistole",

        lastShot:0,

        room:null

    };

}


/* ================= BOT ================= */

function createBot(){

    const spawn =
        randomSpawn();

    return {

        id:
            "bot_" +
            Math.random()
            .toString(36)
            .substring(2,10),

        name:
            "Bot",

        x:spawn.x,

        y:spawn.y,

        hp:100,

        maxHp:100,

        shield:50,

        alive:true,

        kills:0,

        weapon:"Pistole",

        lastShot:0,

        target:null,

        moveTimer:0,

        moveX:0,

        moveY:0

    };

}


/* ================= ROOM STATE ================= */

function roomState(room){

    const players =
        room.players.map(
            player => ({
                id:player.id,
                name:player.name,
                x:player.x,
                y:player.y,
                hp:player.hp,
                maxHp:player.maxHp,
                shield:player.shield,
                alive:player.alive,
                kills:player.kills,
                weapon:player.weapon
            })
        );

    const bots =
        room.bots.map(
            bot => ({
                id:bot.id,
                name:bot.name,
                x:bot.x,
                y:bot.y,
                hp:bot.hp,
                maxHp:bot.maxHp,
                shield:bot.shield,
                alive:bot.alive,
                kills:bot.kills,
                weapon:bot.weapon
            })
        );

    return {

        type:"state",

        players:players,

        bots:bots,

        map:MAP,

        walls:WALLS

    };

}


function broadcast(
    room,
    data
){

    const message =
        JSON.stringify(data);

    for(const player of room.players){

        if(
            player.ws &&
            player.ws.readyState ===
            WebSocket.OPEN
        ){

            player.ws.send(message);

        }

    }

}


/* ================= CREATE ROOM ================= */

function createRoom(
    ws,
    data
){

    const code =
        createCode();

    const room = {

        code:code,

        difficulty:
            data.difficulty || "medium",

        players:[],

        bots:[],

        started:false

    };

    const player =
        createPlayer(
            ws,
            data.name
        );

    player.room = code;

    room.players.push(player);


    const botCount =
        Math.max(
            0,
            Math.min(
                5,
                Number(data.bots) || 0
            )
        );


    for(
        let i=0;
        i<botCount;
        i++
    ){

        room.bots.push(
            createBot()
        );

    }


    rooms.set(
        code,
        room
    );


    ws.player = player;

    ws.room = room;


    ws.send(
        JSON.stringify({

            type:"roomCreated",

            code:code

        })
    );


    sendState(room);

}


/* ================= JOIN ROOM ================= */

function joinRoom(
    ws,
    data
){

    const code =
        String(
            data.code || ""
        ).toUpperCase();


    const room =
        rooms.get(code);


    if(!room){

        ws.send(
            JSON.stringify({

                type:"error",

                message:
                    "Raum nicht gefunden."

            })
        );

        return;

    }


    if(room.players.length >= 8){

        ws.send(
            JSON.stringify({

                type:"error",

                message:
                    "Der Raum ist voll."

            })
        );

        return;

    }


    const player =
        createPlayer(
            ws,
            data.name
        );

    player.room = code;

    room.players.push(player);


    ws.player = player;

    ws.room = room;


    ws.send(
        JSON.stringify({

            type:"joinedRoom",

            code:code

        })
    );


    sendState(room);

}


/* ================= SEND STATE ================= */

function sendState(room){

    broadcast(
        room,
        roomState(room)
    );

}


/* ================= MOVE ================= */

function movePlayer(
    player,
    dx,
    dy
){

    if(!player.alive)
        return;


    const direction =
        normalize(dx,dy);


    const speed = 7;


    const newX =
        player.x +
        direction.x * speed;

    const newY =
        player.y +
        direction.y * speed;


    if(
        validPosition(
            newX,
            player.y
        )
    ){

        player.x =
            newX;

    }


    if(
        validPosition(
            player.x,
            newY
        )
    ){

        player.y =
            newY;

    }

}


/* ================= DAMAGE ================= */

function damagePlayer(
    attacker,
    target,
    damage
){

    if(!target.alive)
        return;


    let remaining =
        damage;


    if(target.shield > 0){

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


    if(remaining > 0){

        target.hp -=
            remaining;

    }


    if(target.hp <= 0){

        target.hp = 0;

        target.alive = false;

        attacker.kills++;


        broadcast(
            attacker.room,
            {

                type:"eliminated",

                killer:attacker.id,

                target:target.id

            }
        );


        checkRound(
            attacker.room
        );

    }

}


/* ================= SHOOT ================= */

function shoot(
    player,
    dx,
    dy
){

    if(!player.alive)
        return;


    const now =
        Date.now();


    if(
        now-player.lastShot <
        WEAPON.cooldown
    ){

        return;

    }


    player.lastShot =
        now;


    const direction =
        normalize(dx,dy);


    broadcast(
        player.room,
        {

            type:"bullet",

            x:player.x,

            y:player.y,

            dx:direction.x,

            dy:direction.y

        }
    );


    let nearest = null;

    let nearestDistance =
        WEAPON.range;


    const targets = [

        ...player.room.players,
        ...player.room.bots

    ];


    for(const target of targets){

        if(
            target.id === player.id ||
            !target.alive
        ){

            continue;

        }


        const vx =
            target.x-player.x;

        const vy =
            target.y-player.y;


        const length =
            Math.hypot(vx,vy);


        if(length > WEAPON.range)
            continue;


        const dot =
            (
                vx*direction.x +
                vy*direction.y
            ) / length;


        if(dot < 0.94)
            continue;


        if(length < nearestDistance){

            nearest =
                target;

            nearestDistance =
                length;

        }

    }


    if(nearest){

        damagePlayer(
            player,
            nearest,
            WEAPON.damage
        );


        broadcast(
            player.room,
            {

                type:"hit",

                x:nearest.x,

                y:nearest.y

            }
        );

    }

}


/* ================= BOT AI ================= */

function updateBots(room){

    for(const bot of room.bots){

        if(!bot.alive){

            continue;

        }


        let target = null;

        let bestDistance =
            Infinity;


        for(const player of room.players){

            if(!player.alive)
                continue;


            const d =
                distance(
                    bot,
                    player
                );


            if(d < bestDistance){

                bestDistance =
                    d;

                target =
                    player;

            }

        }


        if(target){

            const dx =
                target.x-bot.x;

            const dy =
                target.y-bot.y;


            const direction =
                normalize(dx,dy);


            /* einfache Bewegung */

            if(bestDistance > 180){

                movePlayer(
                    bot,
                    direction.x,
                    direction.y
                );

            }


            /* Bot schießt nur aus Nähe */

            if(
                bestDistance < 450
            ){

                shoot(
                    bot,
                    dx,
                    dy
                );

            }

        }else{

            /* Zufällige Bewegung */

            bot.moveTimer--;

            if(bot.moveTimer <= 0){

                bot.moveTimer =
                    60 +
                    Math.floor(
                        Math.random()*100
                    );

                const angle =
                    Math.random() *
                    Math.PI * 2;

                bot.moveX =
                    Math.cos(angle);

                bot.moveY =
                    Math.sin(angle);

            }


            movePlayer(
                bot,
                bot.moveX,
                bot.moveY
            );

        }

    }

}


/* ================= ROUND ================= */

function checkRound(room){

    const alivePlayers =
        room.players.filter(
            player =>
                player.alive
        );


    const aliveBots =
        room.bots.filter(
            bot =>
                bot.alive
        );


    const alive =
        [
            ...alivePlayers,
            ...aliveBots
        ];


    if(alive.length > 1)
        return;


    if(alive.length === 1){

        broadcast(
            room,
            {

                type:"roundEnd",

                winner:
                    alive[0].id

            }
        );

    }

}


function newRound(room){

    for(const player of room.players){

        const spawn =
            randomSpawn();

        player.x =
            spawn.x;

        player.y =
            spawn.y;

        player.hp =
            player.maxHp;

        player.shield =
            50;

        player.alive =
            true;

    }


    for(const bot of room.bots){

        const spawn =
            randomSpawn();

        bot.x =
            spawn.x;

        bot.y =
            spawn.y;

        bot.hp =
            bot.maxHp;

        bot.shield =
            50;

        bot.alive =
            true;

    }


    broadcast(
        room,
        {

            type:"newRound"

        }
    );


    sendState(room);

}


/* ================= CONNECTION ================= */

wss.on(
    "connection",
    function(ws){

        ws.send(
            JSON.stringify({

                type:"connected",

                id:
                    "server_" +
                    Math.random()
                    .toString(36)
                    .substring(2,8),

                map:MAP,

                walls:WALLS

            })
        );


        ws.on(
            "message",
            function(raw){

                try{

                    const data =
                        JSON.parse(
                            raw.toString()
                        );


                    if(data.type === "createRoom"){

                        createRoom(
                            ws,
                            data
                        );

                        return;

                    }


                    if(data.type === "joinRoom"){

                        joinRoom(
                            ws,
                            data
                        );

                        return;

                    }


                    if(!ws.player){

                        return;

                    }


                    if(data.type === "move"){

                        movePlayer(
                            ws.player,
                            Number(data.dx) || 0,
                            Number(data.dy) || 0
                        );

                        return;

                    }


                    if(data.type === "shoot"){

                        shoot(
                            ws.player,
                            Number(data.dx) || 0,
                            Number(data.dy) || 0
                        );

                        return;

                    }


                    if(data.type === "newRound"){

                        if(ws.room){

                            newRound(
                                ws.room
                            );

                        }

                        return;

                    }

                }catch(error){

                    console.error(
                        "Message error:",
                        error
                    );

                }

            }
        );


        ws.on(
            "close",
            function(){

                if(
                    !ws.player ||
                    !ws.room
                ){

                    return;

                }


                const room =
                    ws.room;


                room.players =
                    room.players.filter(
                        player =>
                            player !== ws.player
                    );


                if(room.players.length === 0){

                    rooms.delete(
                        room.code
                    );

                }else{

                    sendState(room);

                }

            }
        );

    }
);


/* ================= GAME LOOP ================= */

setInterval(
    function(){

        for(const room of rooms.values()){

            updateBots(room);

            sendState(room);

        }

    },
    100
);


/* ================= KEEP ALIVE ================= */

setInterval(
    function(){

        console.log(
            "Battle Zone läuft | Räume:",
            rooms.size
        );

    },
    30000
);
