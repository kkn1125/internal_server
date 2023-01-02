const uWs = require("uWebSockets.js");
const protobufjs = require("protobufjs");
const net = require("net");
const upgrade = require("./src/modules/upgrade");
const message = require("./src/modules/message");
const close = require("./src/modules/close");
const { port, users, sockets, relay } = require("./src/globals/variables");
const Subscriber = require("./src/models/Subscriber");
const Client = require("./src/models/Client");

const { Message, Field } = protobufjs;

Field.d(1, "float", "required")(Message.prototype, "id");
Field.d(2, "float", "required")(Message.prototype, "pox");
Field.d(3, "float", "required")(Message.prototype, "poy");
Field.d(4, "float", "required")(Message.prototype, "poz");
Field.d(5, "float", "required")(Message.prototype, "roy");

const socketOptions = {
  compression: 0,
  maxPayloadLength: 16 * 1024 * 1024,
  idleTimeout: 64,
};

const app = uWs
  .App({})
  .ws("/*", {
    /* Options */
    ...socketOptions,

    /* Handlers */
    upgrade,
    open: (ws) => {
      users.set(
        ws,
        Object.assign(users.get(ws) || {}, {
          uuid: ws.user.uuid,
        })
      );
      sockets.set(ws.user.pk, ws);
      ws.subscribe("broadcast");
      ws.subscribe(`${ws.space.pk}-${ws.channel.pk}`);
      console.log("A WebSocket connected with URL: " + ws.url);
      clientRun(app, ws);
      pullerRun(app, ws);
    },
    message,
    drain: (ws) => {
      console.log("WebSocket backpressure: " + ws.getBufferedAmount());
    },
    close,
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

async function clientRun(app, ws) {
  relay.client.set(ws, new Client(app, ws));
}

async function pullerRun(app, ws) {
  relay.subscriber.set(ws, new Subscriber(app, ws));
}

process.on("SIGINT", function () {
  process.exit(0);
});
