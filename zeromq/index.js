const zmq = require("zeromq");
const dotenv = require("dotenv");
const path = require("path");
const queryService = require("./src/services/query.service");
const { dev } = require("./src/utils/tools");
const PQueue = require("p-queue");

const mode = process.env.NODE_ENV;
const MODE = process.env.MODE;

if (mode === "development") {
  dotenv.config({
    path: path.join(__dirname, ".env"),
  });

  dotenv.config({
    path: path.join(__dirname, `.env.${mode}.${MODE}`),
  });
}

/* server ip, port */
const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_PORT = Number(process.env.SERVER_PORT);
const PORT_GAP = Number(process.env.PORT_GAP);
const IP_ADDRESS = process.env.IP_ADDRESS;
const connectedServer = new Map();

const relay = {
  server: null,
  pusher: null,
  puller: null,
};

async function runServer() {
  relay.server = new zmq.Reply();
  await relay.server.bind(`tcp://*:${SERVER_PORT}`);
  dev.log(`server bind on tcp://${SERVER_HOST}:${SERVER_PORT}`);
  for await (const [msg] of relay.server) {
    dev.log("Received: ", msg);
    const flag = new TextDecoder().decode(msg.slice(0, 6));
    console.log("flag", flag);
    if (flag === "server") {
      try {
        await relay.server.send(msg.slice(6));
        await relay.pusher.send(msg.slice(6));
      } catch (e) {
        console.log("from server cli", e);
      }
    } else {
      try {
        await relay.server.send(msg);
        await relay.pusher.send(msg);
        if (connectedServer.size > 0) {
          console.log("broadcast to relay");
          const serverFlag = new TextEncoder().encode("server");
          const merge = new Uint8Array(serverFlag.byteLength + msg.byteLength);
          merge.set(serverFlag);
          merge.set(msg, serverFlag.byteLength);
          await relay.client.send(merge);
          const [result] = await relay.client.receive();
          console.log("Received from other relay server: ", result);
        }
      } catch (e) {
        console.log("from cli", e);
      }
    }
  }
}

async function runPusher() {
  relay.pusher = new zmq.Push();
  await relay.pusher.bind(`tcp://*:${SERVER_PORT + PORT_GAP}`);
  dev.log(`pusher bind on tcp://${SERVER_HOST}:${SERVER_PORT + PORT_GAP}`);
}

async function clientRun() {
  relay.client = new zmq.Request();
}

async function addServer(ip, port) {
  relay.client.connect(`tcp://${ip}:${port}`);
  dev.log(`relay client connected to relay server => tcp://${ip}:${port}`);
}

function findKey(ipAddress, list) {
  for (let i = 0; i < list.length; i++) {
    const network = `${list[i].ip}:${list[i].port}`;
    if (network === ipAddress) {
      return true;
    }
  }
  return false;
}

function compareEmptyNetwork(map, list) {
  // console.log("map", map);
  // console.log("list", list);
  // if (map.size > list.length) {
  for (let key of map.keys()) {
    if (!findKey(key, list)) {
      console.log("find delete key:", key);
      const [ip, port] = key.split(":");
      relay.client.disconnect(`tcp://${ip}:${port}`);
      map.delete(key);
    }
  }
  // }
}

runServer();
runPusher();
clientRun();

setInterval(() => {
  queryService
    .autoConnectServers()
    .then(({ publishers, connections }) => {
      if (connectedServer.size > 0 || publishers.length > 0) {
        compareEmptyNetwork(connectedServer, publishers);
      }
      for (let i = 0; i < publishers.length; i++) {
        try {
          const pub = publishers[i];
          const { ip, port, limit_amount } = pub;
          if (IP_ADDRESS !== ip || SERVER_PORT !== port) {
            if (SERVER_PORT !== port) {
              if (!connectedServer.has(`${ip}:${port}`)) {
                connectedServer.set(`${ip}:${port}`, {});
                dev.log(`servers ip, port:`, IP_ADDRESS, SERVER_PORT);
                dev.log(`not exists ip, port:`, ip, port);
                addServer(ip, port);
              }
            }
          }
        } catch (e) {
          console.log("pull add error", e);
        }
      }
    })
    .catch((e) => {});
}, 50);
