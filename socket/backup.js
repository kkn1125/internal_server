const uWs = require("uWebSockets.js");
const dotenv = require("dotenv");
const path = require("path");
const axios = require("axios");
const protobufjs = require("protobufjs");
const pm2 = require("pm2");
const Queue = require("./src/models/Queue");
const queryService = require("./src/services/query.service");
// const pm2 = require("pm2");
// const locationQueue = new Queue();
const zmq = require("zeromq");
const { dev } = require("./src/utils/tools");
const net = require("net");

const { Message, Field } = protobufjs;

Field.d(1, "float", "required")(Message.prototype, "id");
Field.d(2, "float", "required")(Message.prototype, "pox");
Field.d(3, "float", "required")(Message.prototype, "poy");
Field.d(4, "float", "required")(Message.prototype, "poz");
Field.d(5, "float", "required")(Message.prototype, "roy");

// const __dirname = path.resolve();
const mode = process.env.NODE_ENV;
const MODE = process.env.MODE;
const backpressure = 512;

if (mode === "development") {
  dotenv.config({
    path: path.join(__dirname, `.env`),
  });
  dotenv.config({
    path: path.join(__dirname, `.env.${mode}.${MODE}`),
  });
}

const host = process.env.HOST;
const port = Number(process.env.PORT) || 10000;
const apiHost = process.env.API_HOST;
const apiPort = Number(process.env.API_PORT) || 3000;
const users = new Map();
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const relay = {
  client: new Map(),
  subscriber: new Map(),
  clients: new Set(),
  subscribers: new Set(),
};
// relay.client.sendHighWaterMark = 1000;
// relay.client.sendTimeout = 16;

let now = null;

let sockets = new Map();
let socketsSet = new Set();

const app = uWs
  .App({})
  .ws("/*", {
    /* Options */
    compression: 0,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 64,
    /* Handlers */
    upgrade: (res, req, context) => {
      const q = req.getQuery("q");
      try {
        const json = JSON.parse(decodeURI(q));
        console.log(
          "An Http connection wants to become WebSocket, URL: " +
            req.getUrl() +
            "!"
        );
        /* This immediately calls open handler, you must not use res after this call */
        res.upgrade(
          {
            url: req.getUrl(),
            user: json.user,
            space: json.space,
            channel: json.channel,
            locale: json.locale,
            socket: json.socket,
            publisher: json.publisher,
            connection: json.connection,
            allocation: json.allocation,
          },
          /* Spell these correctly */
          req.getHeader("sec-websocket-key"),
          req.getHeader("sec-websocket-protocol"),
          req.getHeader("sec-websocket-extensions"),
          context
        );
      } catch (e) {}
    },
    open: (ws) => {
      // console.log(Object.assign({}, ws));
      users.set(
        ws,
        Object.assign(users.get(ws) || {}, {
          uuid: ws.user.uuid,
        })
      );
      socketsSet.add(ws);
      sockets.set(ws.user.pk, ws);
      ws.subscribe("broadcast");
      ws.subscribe(`${ws.space.pk}-${ws.channel.pk}`);
      console.log("A WebSocket connected with URL: " + ws.url);
      clientRun(ws);
      pullerRun(ws);
    },
    message: async (ws, message, isBinary) => {
      /* Ok is false if backpressure was built up, wait for drain */
      if (isBinary) {
        const locationJson = Message.decode(new Uint8Array(message)).toJSON();
        await queryService.updateLocation({
          pk: ws.user.pk,
          space: ws.space.pk,
          channel: ws.channel.pk,
          pox: locationJson.pox,
          poy: locationJson.poy,
          poz: locationJson.poz,
          roy: locationJson.roy,
        });
        if (ws.getBufferedAmount() < backpressure) {
          await sendMessage(
            ws,
            JSON.stringify({
              type: "locations",
              target: `${ws.space.pk}-${ws.channel.pk}`,
              locationJson,
            })
          );
        }
      } else {
        const strings = decoder.decode(message);
        const json = JSON.parse(strings);
        if (json.type === "login") {
          axios
            .post(`http://${apiHost}:${apiPort}/query/login`, {
              pk: ws.user.pk,
              nickname: json.nickname,
              password: json.password,
              pox: json.pox,
              poy: json.poy,
              poz: json.poz,
              roy: json.roy,
            })
            .then(async (result) => {
              const { data } = result;
              ws.send(JSON.stringify(data));
              if (ws.getBufferedAmount() < backpressure) {
                await sendMessage(
                  ws,
                  JSON.stringify({
                    type: "players",
                    target: `${ws.space.pk}-${ws.channel.pk}`,
                    pk: ws.user.pk,
                    players: data.players,
                  })
                );
              }
            })
            .catch((err) => {
              console.log(err);
            });
        }
      }
    },
    drain: (ws) => {
      console.log("WebSocket backpressure: " + ws.getBufferedAmount());
    },
    close: (ws, code, message) => {
      console.log("WebSocket closed");
      console.log(ws.user.pk);
      // sendMessage(ws,
      //   JSON.stringify({
      //     type: "logout",
      //     target: `${ws.space.pk}-${ws.channel.pk}`,
      //     pk: ws.user.pk,
      //   })
      // );
      socketsSet.delete(ws);
      axios
        .post(`http://${apiHost}:${apiPort}/query/logout`, {
          pk: ws.user.pk,
        })
        .then(async (result) => {
          const { data } = result;
          // console.log(data, "여기!");
          // if (ws.getBufferedAmount() < backpressure) {
          // console.log(data);
          await sendMessage(
            ws,
            JSON.stringify({
              type: "logout",
              target: `${ws.space.pk}-${ws.channel.pk}`,
              players: data.players,
            })
          );
          // }
          relay.client.get(ws).destroy();
          // relay.client.destroy();
          // relay.client.delete(ws);
        })
        .catch((err) => {});
    },
  })
  .get("/enter", (res, req) => {
    res.end("Nothing to see here!");
  })
  .listen(port, (token) => {
    if (token) {
      process.send("ready");
      console.log("Listening to port " + port);
    } else {
      console.log("Failed to listen to port " + port);
    }
  });

function publishData(data) {
  if (data.type === "players") {
    // console.log("packet", data.target);
    // console.log("packet", data.players);
    app.publish(data.target, JSON.stringify(data.players));
  } else if (data.type === "locations") {
    now = data.target;
    const encoded = Message.encode(
      new Message({
        id: data.pk,
        pox: data.locationJson.pox,
        poy: data.locationJson.poy,
        poz: data.locationJson.poz,
        roy: data.locationJson.roy,
      })
    ).finish();
    app.publish(data.target, encoded, true, true);
  } else if (data.type === "logout") {
    // console.log("여긴오냐");
    now = data.target;
    app.publish(data.target, JSON.stringify(data));
  }
}

process.on("SIGINT", function () {
  process.exit(0);
});

/* zmq broker */
let rest = "";

async function sendMessage(ws, data) {
  try {
    await relay.client.get(ws).send(data);
    const [result] = await relay.client.get(ws).receive();
    console.log("Received ", result);
  } catch (e) {
    console.log("error!", e);
    relay.client.set(ws, new zmq.Request());
  }
}

async function clientRun(ws) {
  relay.client.set(ws, new zmq.Request());
  relay.client.get(ws).sendHighWaterMark = 1000;
  relay.client.get(ws).sendTimeout = 16;
  relay.clients.add(`${ws.publisher.ip}:${ws.publisher.port}`);
  relay.client.get(ws).connect(`tcp://${ws.publisher.ip}:${ws.publisher.port}`);
  console.log(
    `client connected to tcp://${ws.publisher.ip}:${ws.publisher.port}`
  );
}

async function pullerRun(ws) {
  const PORT_GAP = Number(process.env.PORT_GAP);

  relay.subscriber.set(ws, new zmq.Pull());
  relay.subscribers.add(
    `tcp://${ws.publisher.ip}:${ws.publisher.port + PORT_GAP}`
  );
  relay.subscriber
    .get(ws)
    .connect(`tcp://${ws.publisher.ip}:${ws.publisher.port + PORT_GAP}`);
  console.log(
    `puller connected to tcp://${ws.publisher.ip}:${
      ws.publisher.port + PORT_GAP
    }`
  );
  listeningSubscriber(ws);
}
async function listeningSubscriber(sock) {
  for await (const [msg] of relay.subscriber.get(sock)) {
    const decoded = decoder.decode(msg);
    console.log("decoded", decoded);
    const lastIndex = decoded.lastIndexOf("}{");
    rest = decoded;
    let result = null;
    if (lastIndex > 0) {
      result = rest.slice(0, lastIndex + 1);
      rest = rest.slice(lastIndex + 1);
    } else {
      result = rest;
      rest = "";
    }
    try {
      const decodeList = JSON.parse("[" + result.replace(/}{/g, "},{") + "]");

      for (let i = 0; i < decodeList.length; i++) {
        const row = decodeList[i];

        // dev.alias("relay에서 받음").log(row);
        if (row.type === "players") {
          console.log("net tcp player");
          try {
            for (let ws of socketsSet.keys()) {
              if (row.target !== `${ws.space.pk}-${ws.channel.pk}`) {
                if (!ws.isSubscribed(row.target)) {
                  ws.subscribe(row.target);
                }
              }
            }
          } catch (e) {
            // console.log(e);
          }
          publishData({
            success: true,
            type: row.type,
            target: row.target,
            players: row.players,
          });
        } else if (row.type === "locations") {
          try {
            for (let ws of socketsSet.keys()) {
              if (row.target !== `${ws.space.pk}-${ws.channel.pk}`) {
                if (!ws.isSubscribed(row.target)) {
                  ws.subscribe(row.target);
                }
              }
            }
          } catch (e) {
            // console.log(e);
          }
          publishData({
            success: true,
            type: row.type,
            target: row.target,
            pk: row.locationJson.id,
            locationJson: row.locationJson,
          });
        } else if (row.type === "logout") {
          publishData({
            success: true,
            type: row.type,
            target: row.target,
            players: row.players,
          });
        }
      }
    } catch (e) {
      console.log(e);
    }
  }
}
