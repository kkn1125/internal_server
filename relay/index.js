const zmq = require("zeromq");
const dotenv = require("dotenv");
const path = require("path");
const net = require("net");
const queryService = require("./src/services/query.service");
const { dev } = require("./src/utils/tools");
const { exec } = require("child_process");
// const queryService = require("../socket/src/services/query.service");
// const __dirname = path.resolve();

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
  puller: new Map(),
};

const decoder = new TextDecoder();

let temp = null;
let serverSocket = null;

let tcpSockets = [];
let clientSockets = [];

function createServer() {
  relay.server = new net.Server((socket) => {
    let temp;
    socket.setMaxListeners(5000);
    tcpSockets.push(socket);
    socket.on("connect", () => {
      console.log(socket.address().address + "connected");
    });
    socket.on("data", (data) => {
      // console.log("data", data);
      temp = data;
      const flag = decoder.decode(data.slice(0, 6));
      console.log("flag", flag);

      if (flag === "server") {
        try {
          for (let i = 0; i < tcpSockets.length; i++) {
            const tcp = tcpSockets[i];
            tcp.write(data.slice(6));
          }
        } catch (e) {
          console.log("from server cli", e);
        }
      } else {
        try {
          for (let i = 0; i < tcpSockets.length; i++) {
            const tcp = tcpSockets[i];
            tcp.write(data);
          }

          if (connectedServer.size > 0) {
            const serverFlag = new TextEncoder().encode("server");
            const merge = new Uint8Array(
              serverFlag.byteLength + data.byteLength
            );
            merge.set(serverFlag);
            merge.set(data, serverFlag.byteLength);
            // console.log("broadcast to relay");
            for (let i = 0; i < tcpSockets.length; i++) {
              const tcp = tcpSockets[i];
              tcp.write(data);
            }
            for (let cli of relay.puller.values()) {
              cli.write(merge);
            }
            // console.log("Received from other relay server: ", result);
          }
        } catch (e) {
          console.log("from server cli", e);
        }
      }
    });
    socket.on("drain", function (a, b, c) {
      // console.log(a, b, c);
      // console.log("drain data", temp);
      const flag = decoder.decode(temp.slice(0, 6));
      console.log("drain flag", flag);

      if (flag === "server") {
        try {
          for (let i = 0; i < tcpSockets.length; i++) {
            const tcp = tcpSockets[i];
            tcp.write(temp.slice(6));
          }
        } catch (e) {
          console.log("from server cli", e);
        }
      } else {
        try {
          for (let i = 0; i < tcpSockets.length; i++) {
            const tcp = tcpSockets[i];
            tcp.write(temp);
          }

          if (connectedServer.size > 0) {
            const serverFlag = new TextEncoder().encode("server");
            const merge = new Uint8Array(
              serverFlag.byteLength + temp.byteLength
            );
            merge.set(serverFlag);
            merge.set(temp, serverFlag.byteLength);
            // console.log("broadcast to relay");
            for (let i = 0; i < tcpSockets.length; i++) {
              const tcp = tcpSockets[i];
              tcp.write(temp);
            }
            for (let cli of relay.puller.values()) {
              cli.write(merge);
            }
            console.log("Received from other relay server: ", result);
          }
        } catch (e) {
          console.log("from server cli", e);
        }
      }
    });
    socket.on("error", (err) => {
      console.log("socket err", err);
    });
    socket.on("close", () => {
      console.log("socket closed");
    });
  });
  relay.server.listen(SERVER_PORT, SERVER_HOST, () => {
    console.log("server listening on port" + SERVER_PORT);
    // serverSocket.write("hi im server");
  });
}
function createPusher() {
  let temp;
  relay.pusher = new net.Server((socket) => {
    socket.setMaxListeners(5000);
    tcpSockets.push(socket);
    socket.on("connect", () => {
      console.log(socket.address().address + "connected");
    });
    socket.on("data", (data) => {
      console.log("data", data);
      temp = data;
      const flag = decoder.decode(data.slice(0, 6));
      console.log("flag", flag);
      if (flag === "server") {
        serverSocket.write(data.slice(6));
      } else {
        serverSocket.write(data);
        relay.puller.write(data);
      }
    });
    socket.on("drain", function (a, b, c) {
      // console.log(a, b, c);
      // console.log("drain data", temp);
      const flag = decoder.decode(temp.slice(0, 6));
      if (flag === "server") {
        serverSocket.write(temp.slice(6));
      } else {
        serverSocket.write(temp);
        relay.puller.write(temp);
      }
    });
    socket.on("error", (err) => {
      console.log("socket err", err);
    });
    socket.on("close", () => {
      console.log("socket closed");
    });
  });
  relay.pusher.listen(SERVER_PORT + PORT_GAP, SERVER_HOST, () => {
    console.log("pusher listening on port" + (SERVER_PORT + PORT_GAP));
    // serverSocket.write("hi im server");
  });
}

function createPuller(ip, port) {
  const identity = `${ip}:${port}`;

  relay.puller.set(identity, net.connect({ host: ip, port: port }));
  relay.puller.get(identity).on("connect", () => {
    console.log("socket connected");
  });
  relay.puller.get(identity).on("data", (data) => {
    console.log("data", data);
  });
  relay.puller.get(identity).on("close", () => {
    console.log("client closed");
  });
}

createServer();
createPusher();

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
  for (let key of map.keys()) {
    if (!findKey(key, list)) {
      console.log("find delete key:", key);
      const [ip, port] = key.split(":");
      relay.client.disconnect(`tcp://${ip}:${port}`);
      map.delete(key);
    }
  }
}

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
                // addServer(ip, port);
                createPuller(ip, port);
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

process.on("SIGINT", function () {
  process.exit(0);
});
