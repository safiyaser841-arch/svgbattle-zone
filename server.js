const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;

const html = `
<!DOCTYPE html>
<html>
<body style="background:black;color:white;text-align:center;">
<h1>Battle Zone Server läuft ✅</h1>
<p>Spiel funktioniert.</p>
</body>
</html>
`;

const server = http.createServer((req,res)=>{

    res.writeHead(200,{
        "Content-Type":"text/html"
    });

    res.end(html);
});

const wss = new WebSocket.Server({
    server,
    path:"/ws"
});

let players = {};
let nextId = 1;

wss.on("connection",(ws)=>{

    let id = String(nextId++);

    players[id]={
        id:id,
        x:200+Math.random()*400,
        y:200+Math.random()*300,
        name:"Player"+id
    };

    ws.send(JSON.stringify({
        type:"connected",
        id:id
    }));

    ws.on("message",(msg)=>{

        let data;

        try{
            data=JSON.parse(msg);
        }catch{
            return;
        }

        if(data.type==="move"){

            players[id].x += data.dx*5;
            players[id].y += data.dy*5;
        }
    });

    ws.on("close",()=>{
        delete players[id];
    });
});

setInterval(()=>{

    const state={
        type:"state",
        players:players
    };

    const text=JSON.stringify(state);

    wss.clients.forEach(client=>{
        if(client.readyState===WebSocket.OPEN){
            client.send(text);
        }
    });

},50);

server.listen(PORT,"0.0.0.0",()=>{
    console.log("Server läuft auf Port",PORT);
});
       
