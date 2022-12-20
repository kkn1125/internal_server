const uWs = require("uWebSockets.js");
const dotenv = require("dotenv");
const path = require("path");
const axios = require("axios");
const protobufjs = require("protobufjs");
const pm2 = require("pm2");
const Queue = require("./src/models/Queue");
const queryService = require("./src/services/query.service");
// const pm2 = require("pm2");
const locationQueue = new Queue();
const zmq = require("zeromq");
const { dev } = require("./src/utils/tools");

const { Message, Field } = protobufjs;

Field.d(1, "float", "required")(Message.prototype, "id");
Field.d(2, "float", "required")(Message.prototype, "pox");
Field.d(3, "float", "required")(Message.prototype, "poy");
Field.d(4, "float", "required")(Message.prototype, "poz");
Field.d(5, "float", "required")(Message.prototype, "roy");

// const __dirname = path.resolve();
const mode = process.env.NODE_ENV;
const backpressure = 1024;
dotenv.config({
  path: path.join(__dirname, ".env"),
});
dotenv.config({
  path: path.join(__dirname, `.env.${mode}`),
});

const host = process.env.HOST;
const port = Number(process.env.PORT) || 10000;
const apiHost = process.env.API_HOST;
const apiPort = Number(process.env.API_PORT) || 3000;
const users = new Map();
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const relay = {};
let now = null;

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
          // token: req.getQuery("csrftoken"),
          // pk: req.getQuery("pk"),
          // uuid: req.getQuery("csrftoken"),
          // locale: req.getQuery("locale"),
          // space: req.getQuery("space"),
          // channel: req.getQuery("channel"),
          // sock: req.getQuery("sock"),
          // pub: req.getQuery("pub"),
        },
        /* Spell these correctly */
        req.getHeader("sec-websocket-key"),
        req.getHeader("sec-websocket-protocol"),
        req.getHeader("sec-websocket-extensions"),
        // req.getHeader(""),
        context
      );
    },
    open: (ws) => {
      console.log(Object.assign({}, ws));
      users.set(
        ws,
        Object.assign(users.get(ws) || {}, {
          uuid: ws.user.uuid,
        })
      );
      ws.subscribe("broadcast");
      ws.subscribe(`${ws.space.pk}-${ws.channel.pk}`);
      console.log("A WebSocket connected with URL: " + ws.url);
      clientRun(ws.socket, ws.publisher, ws);
      // sendMessage(`${ws.user.uuid}접속`);
      // pushMessage("test");
    },
    message: (ws, message, isBinary) => {
      /* Ok is false if backpressure was built up, wait for drain */
      if (isBinary) {
        const locationJson = Message.decode(new Uint8Array(message)).toJSON();
        queryService.updateLocation({
          body: {
            pk: ws.user.pk,
            space: ws.space.pk,
            channel: ws.channel.pk,
            pox: locationJson.pox,
            poy: locationJson.poy,
            poz: locationJson.poz,
            roy: locationJson.roy,
          },
        });
        if (ws.getBufferedAmount() < backpressure) {
          // process.send({
          //   type: "process:msg",
          //   data: {
          //     success: true,
          //     type: "locations",
          //     target: `${ws.space.pk}-${ws.channel.pk}`,
          //     pk: ws.user.pk,
          //     locationJson,
          //   },
          // });
          sendMessage(
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
            .then((result) => {
              const { data } = result;
              ws.send(JSON.stringify(data));
              if (ws.getBufferedAmount() < backpressure) {
                // process.send({
                //   type: "process:msg",
                //   data: {
                //     success: true,
                //     type: "players",
                //     target: `${ws.space.pk}-${ws.channel.pk}`,
                //     players: data.players,
                //   },
                // });
                sendMessage(
                  JSON.stringify({
                    type: "players",
                    target: `${ws.space.pk}-${ws.channel.pk}`,
                    players: data.players,
                  })
                );
              }
            })
            .catch((err) => {});
        }
      }
    },
    drain: (ws) => {
      console.log("WebSocket backpressure: " + ws.getBufferedAmount());
    },
    close: (ws, code, message) => {
      console.log("WebSocket closed");
      console.log(ws.user.pk);
      axios
        .post(`http://${apiHost}:${apiPort}/query/logout`, {
          pk: ws.user.pk,
        })
        .then((result) => {
          const { data } = result;
          console.log(data);
          // ws.send(JSON.stringify(data));
          // app.publish(
          //   `${ws.space.pk}-${ws.channel.pk}`,
          //   // "broadcast",
          //   JSON.stringify(data.players)
          // );
          if (ws.getBufferedAmount() < backpressure) {
            // process.send({
            //   type: "process:msg",
            //   data: {
            //     success: true,
            //     type: "players",
            //     target: `${ws.space.pk}-${ws.channel.pk}`,
            //     // target: "broadcast",
            //     players: data.players,
            //   },
            // });
            sendMessage(
              JSON.stringify({
                type: "players",
                target: `${ws.space.pk}-${ws.channel.pk}`,
                players: data.players,
              })
            );
          }
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

pm2.launchBus((err, bus) => {
  if (err) return;
  bus.on("process:msg", function (packet) {
    // console.log(packet);
    if (packet.hasOwnProperty("raw")) {
    } else {
      const { data } = packet;
      if (data.type === "players") {
        app.publish(data.target, JSON.stringify(data.players));
      } else if (data.type === "locations") {
        now = data.target;
        // console.log(now);
        const encoded = Message.encode(
          new Message({
            id: data.pk,
            pox: data.locationJson.pox,
            poy: data.locationJson.poy,
            poz: data.locationJson.poz,
            roy: data.locationJson.roy,
          })
        ).finish();
        // console.log(encoded);
        // console.log(data.target);
        app.publish(data.target, encoded, true, true);
        // locationQueue.enter(encoded);
      }
    }
  });
});

// setInterval(() => {
//   // if (ws.getBufferedAmount() < backpressure) {
//   if (locationQueue.count > 0 && now) {
//     app.publish(now, locationQueue.get(), true, true);
//   }
//   // }
// }, 16);

process.on("SIGINT", function () {
  process.exit(0);
});

/* zmq broker */
async function clientRun(pusher, puller, ws) {
  // relay.request = new zmq.Request();
  // relay.request.connect(`tcp://${puller.ip}:${puller.port}`);
  // console.log(
  //   `request bind relay server on "tcp://${puller.ip}:${puller.port}"`
  // );

  const net = require("net");
  relay.client = net.connect({
    host: puller.ip,
    port: puller.port,
  });
  relay.client.on("connect", function () {
    console.log("connected to server!");
  });
  relay.client.on("data", function (chunk) {
    console.log("received:", chunk);
    console.log("received length:", chunk.length);

    const isPlayers = decoder.decode(chunk);
    console.log("isPlayers", isPlayers);
    if (isPlayers.match(/"type":"players"/)) {
      for (let i = 0; i < chunk.length; i++) {
        // console.log(chunk);
        const decoded = decoder.decode(chunk.slice(i * 190, (i + 1) * 190));
        // console.log("received:", decoded);
        try {
          const json = JSON.parse(decoded);

          if (!ws.isSubscribed(json.target)) {
            ws.subscribe(json.target);
          }
          // console.log(json);
          // if (json.type === "login") {
          // }
          // if (json.type === "logout") {
          // }
          if (json.type === "players") {
            process.send({
              type: "process:msg",
              data: {
                success: true,
                type: json.type,
                target: json.target,
                players: json.players,
              },
            });
          }
        } catch (e) {}
      }

      // const json = JSON.parse(isPlayers);
      // if (!ws.isSubscribed(json.target)) {
      //   ws.subscribe(json.target);
      // }
      // console.log(json);
      // if (json.type === "players") {
      //   process.send({
      //     type: "process:msg",
      //     data: {
      //       success: true,
      //       type: json.type,
      //       target: json.target,
      //       players: json.players,
      //     },
      //   });
      // }
    } else {
      for (let i = 0; i < chunk.length; i++) {
        // console.log(chunk);
        const decoded = decoder.decode(chunk.slice(i * 112, (i + 1) * 112));
        // console.log("received:", decoded);
        try {
          const json = JSON.parse(decoded);

          if (!ws.isSubscribed(json.target)) {
            ws.subscribe(json.target);
          }
          // console.log(json);
          // if (json.type === "login") {
          // }
          // if (json.type === "logout") {
          // }
          if (json.type === "locations") {
            process.send({
              type: "process:msg",
              data: {
                success: true,
                type: json.type,
                target: json.target,
                pk: json.locationJson.id,
                locationJson: json.locationJson,
              },
            });
          }
        } catch (e) {}
      }
    }
  });
  relay.client.on("error", function (chunk) {
    console.log("error!");
  });
  relay.client.on("timeout", function (chunk) {
    console.log("timeout!");
  });
  // relay.client.write(JSON.stringify(queryService.players));
}

// async function dataProcessor(msg) {
//   console.log(msg);
//   // console.log("sending data...");
//   // await relay.push.send("test");
//   // const [result] = await relay.push.receive();
//   // dev.log(result);
// }

async function sendMessage(message) {
  relay.client.write(message);
  // await relay.request.send(message);
  // const [result] = await relay.request.receive();
  // console.log(result);
}
