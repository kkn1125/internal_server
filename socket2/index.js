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

const { Message, Field } = protobufjs;

Field.d(1, "float", "required")(Message.prototype, "id");
// Field.d(2, "int32", "required")(Message.prototype, "space");
// Field.d(3, "int32", "required")(Message.prototype, "channel");
Field.d(2, "float", "required")(Message.prototype, "pox");
Field.d(3, "float", "required")(Message.prototype, "poy");
Field.d(4, "float", "required")(Message.prototype, "poz");
Field.d(5, "float", "required")(Message.prototype, "roy");
// Field.d(1, "string", "required")(Message.prototype, "loc");
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
  ./*SSL*/ App(/* {
    key_file_name: "misc/key.pem",
    cert_file_name: "misc/cert.pem",
    passphrase: "1234",
  } */)
  .ws("/*", {
    /* Options */
    compression: 0,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 64,
    /* Handlers */
    upgrade: (res, req, context) => {
      console.log(
        "An Http connection wants to become WebSocket, URL: " +
          req.getUrl() +
          "!"
      );
      /* This immediately calls open handler, you must not use res after this call */
      res.upgrade(
        {
          url: req.getUrl(),
          token: req.getQuery("csrftoken"),
          space: req.getQuery("space"),
          channel: req.getQuery("channel"),
          pk: req.getQuery("pk"),
        },
        /* Spell these correctly */
        req.getHeader("sec-websocket-key"),
        req.getHeader("sec-websocket-protocol"),
        req.getHeader("sec-websocket-extensions"),
        context
      );
    },
    open: (ws) => {
      users.set(
        ws,
        Object.assign(users.get(ws) || {}, {
          token: ws.token,
        })
      );
      ws.subscribe("broadcast");
      ws.subscribe(`${ws.space}-${ws.channel}`);
      console.log("A WebSocket connected with URL: " + ws.url);
    },
    message: (ws, message, isBinary) => {
      /* Ok is false if backpressure was built up, wait for drain */
      if (isBinary) {
        const locationJson = Message.decode(new Uint8Array(message)).toJSON();
        // axios
        //   .post(`http://${apiHost}:${apiPort}/query/locations`, {
        //     pk: ws.pk,
        //     space: ws.space,
        //     channel: ws.channel,
        //     pox: locationJson.pox,
        //     poy: locationJson.poy,
        //     poz: locationJson.poz,
        //     roy: locationJson.roy,
        //   })
        //   .then((result) => {
        //     // console.log(result)
        //     //   const { data } = result;
        //     //   // data.players
        //     //   process.send({
        //     //     type: "process:msg",
        //     //     data: {
        //     //       success: true,
        //     //       type: "players",
        //     //       target: `${ws.space}-${ws.channel}`,
        //     //       // target: "broadcast",
        //     //       players: data.players,
        //     //     },
        //     //   });
        //   })
        //   .catch((err) => {
        //     console.log(err);
        //   });
        queryService.updateLocation({
          body: {
            pk: ws.pk,
            space: ws.space,
            channel: ws.channel,
            pox: locationJson.pox,
            poy: locationJson.poy,
            poz: locationJson.poz,
            roy: locationJson.roy,
          },
        });
        // now = `${ws.space}-${ws.channel}`;
        // locationQueue.enter(message);
        if (ws.getBufferedAmount() < backpressure) {
          process.send({
            type: "process:msg",
            data: {
              success: true,
              type: "locations",
              target: `${ws.space}-${ws.channel}`,
              // target: "broadcast",
              pk: ws.pk,
              locationJson,
            },
          });
        }
        // app.publish(
        //   `${ws.space}-${ws.channel}`,
        //   message,
        //   true,
        //   true
        // "broadcast",
        // JSON.stringify(data.players)
        // );
        // process.send({
        //   type: "process:msg",
        //   data: {
        //     success: true,
        //     type: "locations",
        //     target: `${ws.space}-${ws.channel}`,
        //     // target: "broadcast",
        //     pk: ws.pk,
        //     locationJson,
        //   },
        // });
      } else {
        const strings = decoder.decode(message);
        const json = JSON.parse(strings);
        if (json.type === "login") {
          axios
            .post(`http://${apiHost}:${apiPort}/query/login`, {
              pk: json.pk,
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
              // app.publish(
              //   // `${me.space}_${me.channel}`,
              //   `${ws.space}-${ws.channel}`,
              //   JSON.stringify(data.players)
              // );
              if (ws.getBufferedAmount() < backpressure) {
                process.send({
                  type: "process:msg",
                  data: {
                    success: true,
                    type: "players",
                    target: `${ws.space}-${ws.channel}`,
                    // target: "broadcast",
                    players: data.players,
                  },
                });
              }
            })
            .catch((err) => {});
        }
      }
    },
    drain: (ws) => {
      console.log("WebSocket backpressure: " + ws.getBufferedAmount());
      // process.send({
      //   type: "process:msg",
      //   data: {
      //     success: true,
      //     type: "players",
      //     target: `${ws.space}-${ws.channel}`,
      //     // target: "broadcast",
      //     players: data.players,
      //   },
      // });
      // while (ws.getBufferedAmount() < backpressure) {
      //   process.send({
      //     type: "process:msg",
      //     data: {
      //       success: true,
      //       type: "players",
      //       target: `${ws.space}-${ws.channel}`,
      //       // target: "broadcast",
      //       players: data.players,
      //     },
      //   });
      // }
    },
    close: (ws, code, message) => {
      console.log("WebSocket closed");
      console.log(ws.pk);
      // axios
      //   .post(`http://${apiHost}:${apiPort}/query/logout`, {
      //     pk: ws.pk,
      //   })
      //   .then((result) => {
      //     const { data } = result;
      //     console.log(data);
      //     // ws.send(JSON.stringify(data));
      //     // app.publish(
      //     //   `${ws.space}-${ws.channel}`,
      //     //   // "broadcast",
      //     //   JSON.stringify(data.players)
      //     // );
      //     if (ws.getBufferedAmount() < backpressure) {
      //       process.send({
      //         type: "process:msg",
      //         data: {
      //           success: true,
      //           type: "players",
      //           target: `${ws.space}-${ws.channel}`,
      //           // target: "broadcast",
      //           players: data.players,
      //         },
      //       });
      //     }
      //   })
      //   .catch((err) => {});
    },
  })
  .get("/enter", (res, req) => {
    res.end("Nothing to see here!");
  })
  .listen(port, (token) => {
    if (token) {
      console.log("Listening to port " + port);
      process.send("ready");
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
async function clientRun({ server, client }) {
  relay.pull = new zmq.Pull();
  relay.push = new zmq.Push();
  relay.pull.connect(`tcp://${client.host}:${client.port}`);
  await relay.push.bind(`tcp://${server.host}:${server.port}`);

  for await (const [msg] of relay.pull) {
    try {
      const decoded = decoder.decode(msg);

      const json = JSON.parse(decoded);
      if (json.type === "players") {
        console.log("전파받음", json);
        console.log("전파받음", msg);
        app.publish(
          `${json.server}-${json.channel}`,
          JSON.stringify({ type: json.type, players: json.players })
        );
      }
    } catch (e) {
      // console.log("전파받음", json);
      const decoded = decoder.decode(msg);

      const json = JSON.parse(decoded);
      console.log("전파받음", msg);
      const message = Message.encode(new Message(json)).finish();
      app.publish(`broadcast`, message, true, true);
    }
  }
}
clientRun(ip, port);
