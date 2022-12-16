import uWs from "uWebSockets.js";
import dotenv from "dotenv";
import path from "path";
import axios from "axios";
import protobufjs from "protobufjs";

const { Message, Field } = protobufjs;

Field.d(1, "string", "required")(Message.prototype, "uuid");
Field.d(2, "int32", "required")(Message.prototype, "space");
Field.d(3, "int32", "required")(Message.prototype, "channel");
Field.d(5, "float", "required")(Message.prototype, "pox");
Field.d(6, "float", "required")(Message.prototype, "poy");
Field.d(7, "float", "required")(Message.prototype, "poz");
Field.d(8, "float", "required")(Message.prototype, "roy");

const __dirname = path.resolve();
const mode = process.env.NODE_ENV;

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

const app = uWs
  ./*SSL*/ App(/* {
    key_file_name: "misc/key.pem",
    cert_file_name: "misc/cert.pem",
    passphrase: "1234",
  } */)
  .ws("/*", {
    /* Options */
    compression: uWs.SHARED_COMPRESSOR,
    maxPayloadLength: 32 * 1024 * 1024,
    idleTimeout: 32,
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
      console.log("A WebSocket connected with URL: " + ws.url);
      axios
        .post(`http://${apiHost}:${apiPort}/query/players`, {
          uuid: ws.token,
        })
        .then((result) => {
          const { data } = result;
          console.log(data);
          users.set(
            ws,
            Object.assign(users.get(ws), {
              space: data.space_id,
              channel: data.channel_id,
            })
          );
          ws.subscribe("broadcast");
          ws.subscribe(`${data.space_id}_${data.channel_id}`);
          app.publish(
            `${data.space_id}_${data.channel_id}`,
            JSON.stringify(data.players)
          );
        });
    },
    message: (ws, message, isBinary) => {
      /* Ok is false if backpressure was built up, wait for drain */
      const me = users.get(ws);
      if (isBinary) {
        const locationJson = Message.decode(new Uint8Array(message)).toJSON();
        axios.post(
          `http://${apiHost}:${apiPort}/query/locations`,
          locationJson
        );
        console.log(`${me.space}_${me.channel}`);
        app.publish(`${me.space}_${me.channel}`, message, isBinary, true);
      } else {
        const strings = decoder.decode(message);
        const json = JSON.parse(strings);
        if (json.type === "login") {
          axios
            .post(`http://${apiHost}:${apiPort}/query/login`, {
              uuid: json.uuid,
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
              app.publish(
                `${me.space}_${me.channel}`,
                JSON.stringify(data.players)
              );
            });
        }
      }
    },
    drain: (ws) => {
      console.log("WebSocket backpressure: " + ws.getBufferedAmount());
    },
    close: (ws, code, message) => {
      console.log("WebSocket closed");
    },
  })
  .any("/*", (res, req) => {
    res.end("Nothing to see here!");
  })
  .listen(port, (token) => {
    if (token) {
      console.log("Listening to port " + port);
    } else {
      console.log("Failed to listen to port " + port);
    }
  });
