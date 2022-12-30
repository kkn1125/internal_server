const uWs = require("uWebSockets.js");
const dotenv = require("dotenv");
const path = require("path");
const axios = require("axios");
const protobufjs = require("protobufjs");
const queryService = require("./src/services/query.service");
const { dev } = require("./src/utils/tools");
const net = require("net");
const { sql } = require("./src/database/mariadb");

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
    upgrade: async (res, req, context) => {
      /* Keep track of abortions */
      const upgradeAborted = { aborted: false };
      console.log(
        "An Http connection wants to become WebSocket, URL: " +
          req.getUrl() +
          "!"
      );

      /* You MUST copy data out of req here, as req is only valid within this immediate callback */
      const url = req.getUrl();
      const secWebSocketKey = req.getHeader("sec-websocket-key");
      const secWebSocketProtocol = req.getHeader("sec-websocket-protocol");
      const secWebSocketExtensions = req.getHeader("sec-websocket-extensions");

      const q = req.getQuery("q");
      const json = {};
      try {
        Object.assign(json, JSON.parse(decodeURI(q)));
      } catch (e) {
        // console.log(e);
      }
      console.log(json);
      async function asyncUpgrade() {
        const [user] = await sql.promise().query(
          `SELECT
            id AS pk,
            uuid,
            email,
            nickname
          FROM users
          WHERE deletion = 0
          AND uuid = ?`,
          [json.uuid]
        );
        dev.alias("user").log(user[0]);
        const [space] = await sql.promise().query(
          `SELECT
            spaces.id AS pk,
            spaces.name,
            spaces.volume,
            spaces.owner,
            spaces.limit_amount
          FROM spaces
          LEFT JOIN allocation
          ON allocation.space_id = spaces.id
          LEFT JOIN users
          ON users.id = allocation.user_id
          WHERE users.id = ?`,
          [user[0].pk]
        );
        const [channel] = await sql.promise().query(
          `SELECT
            channels.id AS pk,
            channels.name,
            channels.limit_amount
          FROM channels
          LEFT JOIN allocation
          ON allocation.channel_id = channels.id
          LEFT JOIN users
          ON users.id = allocation.user_id
          WHERE users.id = ?`,
          [user[0].pk]
        );
        const [locale] = await sql.promise().query(
          `SELECT
            locales.id AS pk,
            locales.region,
            locales.limit_amount
          FROM locales
          LEFT JOIN connection
          ON connection.locale_id = locales.id
          LEFT JOIN users
          ON users.id = connection.user_id
          WHERE users.id = ?`,
          [user[0].pk]
        );
        const [socket] = await sql.promise().query(
          `SELECT
            pool_sockets.id AS pk,
            pool_sockets.ip,
            pool_sockets.port,
            pool_sockets.cpu_usage,
            pool_sockets.memory_usage,
            pool_sockets.is_live,
            pool_sockets.limit_amount
          FROM pool_sockets
          LEFT JOIN connection
          ON connection.socket_id = pool_sockets.id
          LEFT JOIN users
          ON users.id = connection.user_id
          WHERE users.id = ?`,
          [user[0].pk]
        );
        const [pulisher] = await sql.promise().query(
          `SELECT
            pool_publishers.id AS pk,
            pool_publishers.ip,
            pool_publishers.port,
            pool_publishers.is_live,
            pool_publishers.limit_amount
          FROM pool_publishers
          LEFT JOIN connection
          ON connection.publisher_id = pool_publishers.id
          LEFT JOIN users
          ON users.id = connection.user_id
          WHERE users.id = ?`,
          [user[0].pk]
        );
        const [connection] = await sql.promise().query(
          `SELECT
            user_id,
            socket_id,
            publisher_id,
            locale_id,
            connected
          FROM connection
          WHERE user_id = ?`,
          [user[0].pk]
        );
        const [allocation] = await sql.promise().query(
          `SELECT
            user_id,
            space_id,
            channel_id,
            type,
            status
          FROM allocation
          WHERE user_id = ?`,
          [user[0].pk]
        );
        dev.log("upgrade asynchronous!");
        if (upgradeAborted.aborted) {
          console.log("Ouch! Client disconnected before we could upgrade it!");
          /* You must not upgrade now */
          return;
        }

        res.upgrade(
          {
            url,
            // db user info
            user: user[0],
            space: space[0],
            channel: channel[0],
            locale: locale[0],
            socket: socket[0],
            publisher: pulisher[0],
            connection: connection[0],
            allocation: allocation[0],
            // db user info
          },
          /* Spell these correctly */
          secWebSocketKey,
          secWebSocketProtocol,
          secWebSocketExtensions,
          context
        );
      }

      asyncUpgrade();

      res.onAborted(() => {
        /* We can simply signal that we were aborted */
        upgradeAborted.aborted = true;
      });
      /* This immediately calls open handler, you must not use res after this call */
    },
    open: (ws) => {
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
      socketsSet.delete(ws);
      sockets.delete(ws);
      axios
        .post(`http://${apiHost}:${apiPort}/query/logout`, {
          pk: ws.user.pk,
        })
        .then(async (result) => {
          const { data } = result;
          await sendMessage(
            ws,
            JSON.stringify({
              type: "logout",
              target: `${ws.space.pk}-${ws.channel.pk}`,
              players: data.players,
            })
          );
          // }
          relay.client.destroy();
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

function publishData(data, ws) {
  if (data.type === "players") {
    app.publish(
      `${ws.space.pk}-${ws.channel.pk}`,
      JSON.stringify(data.players)
    );
  } else if (data.type === "locations") {
    const encoded = Message.encode(
      new Message({
        id: data.pk,
        pox: data.locationJson.pox,
        poy: data.locationJson.poy,
        poz: data.locationJson.poz,
        roy: data.locationJson.roy,
      })
    ).finish();
    app.publish(`${ws.space.pk}-${ws.channel.pk}`, encoded, true, true);
  } else if (data.type === "logout") {
    // console.log("여긴오냐");
    now = data.target;
    app.publish(`${ws.space.pk}-${ws.channel.pk}`, JSON.stringify(data));
  }
}

process.on("SIGINT", function () {
  process.exit(0);
});

/* zmq broker */
let rest = "";

async function sendMessage(ws, data) {
  try {
    await relay.client.get(ws).write(data);
  } catch (e) {
    console.log("error!", e);
  }
}

async function clientRun(ws) {
  relay.client.set(
    ws,
    net.connect({
      host: ws.publisher.ip,
      port: ws.publisher.port,
    })
  );
  relay.client.get(ws).on("connect", function () {
    console.log("connected to server!");
  });
  relay.client.get(ws).on("data", function (chunk) {
    // console.log(chunk);
  });
  relay.client.get(ws).on("error", function (chunk) {
    console.log("error!");
    console.log(chunk);
  });
  relay.client.get(ws).on("timeout", function (chunk) {
    console.log("timeout!");
  });
}

async function pullerRun(ws) {
  const PORT_GAP = Number(process.env.PORT_GAP);

  relay.subscriber.set(
    ws,
    net.connect({
      host: ws.publisher.ip,
      port: ws.publisher.port + PORT_GAP,
    })
  );
  relay.subscriber.get(ws).on("connect", function () {
    console.log("connected to pusher!");
  });
  relay.subscriber.get(ws).on("data", function (chunk) {
    const decoded = decoder.decode(chunk);
    // console.log("data", chunk);
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
          publishData(
            {
              success: true,
              type: row.type,
              target: row.target,
              players: row.players,
            },
            ws
          );
        } else if (row.type === "locations") {
          console.log("location 오나?", row);
          publishData(
            {
              success: true,
              type: row.type,
              target: row.target,
              pk: row.locationJson.id,
              locationJson: row.locationJson,
            },
            ws
          );
        } else if (row.type === "logout") {
          publishData(
            {
              success: true,
              type: row.type,
              target: row.target,
              players: row.players,
            },
            ws
          );
        }
      }
    } catch (e) {
      // console.log(e);
    }
  });
  relay.subscriber.get(ws).on("error", function (chunk) {
    console.log("error!");
    console.log(chunk);
  });
  relay.subscriber.get(ws).on("timeout", function (chunk) {
    console.log("timeout!");
  });
}
