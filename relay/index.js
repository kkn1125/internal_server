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
    path: path.join(path.resolve(), `.env`),
  });
  dotenv.config({
    path: path.join(path.resolve(), `.env.${mode}.${MODE}`),
  });
}

const originIp = process.env.IP_ADDRESS;
const serverHost = process.env.SERVER_HOST;
const serverPort = Number(process.env.SERVER_PORT);

const relay = {
  server: null,
  client: new Map(),
};

// async function serverRun() {
//   relay.server = new zmq.Reply();
//   await relay.server.bind(`tcp://${serverHost}:${serverPort}`);
//   console.log(`server bind on "tcp://${serverHost}:${serverPort}"`);
//   process.send("ready");
//   for await (const [msg] of relay.server) {
//     await dataProcessor(msg);
//   }
// }
// serverRun();

// async function dataProcessor(msg) {
//   await relay.server.send("from server" + msg);
// }

// const messageQueue = [];
const decoder = new TextDecoder();

let temp = null;
let serverSocket = null;
function getServerSocket() {
  return serverSocket;
}
let tcpSockets = [];
const blocklist = new net.BlockList();

relay.server = net.createServer((socket) => {
  tcpSockets.push(socket);
  socket.setMaxListeners(5000);
  console.log(socket.address().address + "connected");
  process.send("ready");
  socket.on("data", function (data) {
    // console.log("rcv:", data);
    // console.log("rcv decoded:", decoder.decode(data));
    // if (maxBinary) {
    // messageQueue.push(data);
    // }
    serverSocket = socket;
    console.log("데이터 받음");
    temp = data;
    // const success = !socket.write(data);

    broadcast(data, socket, true);

    // if (!success) {
    //   (function (data) {})(data);
    // }
    // socket.
  });
  socket.on("drain", function (a, b, c) {
    console.log(a, b, c);
    console.log("drain", temp);
    socket.write(temp);
  });
  socket.on("close", function () {
    console.log("client close");
  });
  // setInterval(() => {
  //   if (messageQueue.length > 0 && maxBinary) {
  //     maxBinary = socket.write(messageQueue.shift());
  //     // const drain = socket.write(messageQueue.shift());
  //   }
  // }, 1);
  // socket.pu("open server on " + serverPort);
});

function broadcast(data, socketSent, isServer = false) {
  // if (data === "quit") {
  //   const index = tcpSockets.indexOf(socketSent);
  //   tcpSockets.splice(index, 1);
  // } else {
  let isSuccessed = true;
  // for (let client of relay.client.values()) {
  //   if (client.pending) {
  //     Object.assign(client, { pending: false });
  //     client.socket.resume();
  //   }
  // }
  let success = null;
  let sendData = data;

  if (isServer) {
    const prefix = new TextEncoder().encode("server|");
    const merge = new Uint8Array(prefix.byteLength + data.byteLength);
    merge.set(prefix);
    merge.set(data, prefix.byteLength);
    // success = !socket.write(merge);
    sendData = merge;
  }

  for (let i = 0; i < tcpSockets.length; i++) {
    const socket = tcpSockets[i];
    if (socket !== socketSent) {
      console.log("socket", i);
      // dev.alias("socket identity").log(i, socket);

      success = !socket.write(sendData);

      if (!success) {
        isSuccessed = success;
      }
    }
  }
  return isSuccessed;
  // }
}

relay.server.on("error", function (err) {
  console.log("😥 err:" + err);
});

relay.server.listen(serverPort, function () {
  console.log("listening on port " + serverPort);
});

process.on("SIGINT", function () {
  process.exit(0);
});

/* 다른 net과 연결 후 받는 데이터를 해당 net에서 전파 가능해야 함 */
async function createClient(ip, port) {
  const identity = [ip, port].join(":");
  console.log("연결중", identity);
  relay.client.set(identity, {
    socket: net.connect({
      host: ip,
      port: port,
    }),
    pending: false,
  });
  relay.client.get(identity).socket.on("connect", function () {
    console.log("connected to server!");
  });
  relay.client.get(identity).socket.on("data", function (data) {
    // const success = !socket.write(data);
    // console.log(123);
    // const success = !serverSocket?.write(data);
    // for (let i = 0; i < tcpSockets.length; i++) {
    //   const socket = tcpSockets[i];
    //   if (socket !== socketSent) {
    //     console.log("socket", i);
    //     // dev.alias("socket identity").log(i, socket);
    const namespace = new TextDecoder().decode(data.subarray(0, 6));
    const realData = data.subarray(7);
    if (namespace === "server") {
      const addresses = Array.from(relay.client.keys());
      for (let key of addresses) {
        const [ip, port] = key.split(":");
        if (serverPort !== ip) {
          blocklist.addAddress(ip);
        }
      }
    }

    const success = broadcast(realData, relay.client.get(identity).socket);
    // const success = !relay.client.get(identity).socket.write(data);

    console.log("success:", success);
    // relay.client.get(identity).socket.pause();
    // relay.client.get(identity).pending = true;
    console.log(`${identity} socket was paused`);
    // }
    // }
  });
  relay.client.get(identity).socket.on("error", function (chunk) {
    console.log("error!");
  });
  relay.client.get(identity).socket.on("timeout", function (chunk) {
    console.log("timeout!");
  });
}

setInterval(() => {
  queryService
    .autoConnectServers()
    .then(({ publishers, connections }) => {
      // isChanged = publishers;
      for (let i = 0; i < publishers.length; i++) {
        // const conn =  connections[i];
        // if(conn) {
        //   conn.limit_amount
        // }
        const { ip, port, limit_amount } = publishers[i];

        // if(limit_amount)
        const reverseIp = ip === "192.168.254.16" ? "192.168.88.234" : ip;
        // console.log(originIp === reverseIp, port, serverPort)
        if (originIp !== reverseIp || serverPort !== port) {
          if (serverPort !== port) {
            if (!relay.client.has(`${reverseIp}:${port}`)) {
              console.log(`servers ip, port:`, originIp, serverPort);
              console.log(`not exists ip, port:`, reverseIp, port);
              createClient(reverseIp, port);

              // exec(`lsof -i :${port}`, (err, stdout, stderr) => {
              //   if (err) {
              //     console.log("err:", err.message);
              //     exec(
              //       `cross-env NODE_ENV=${mode} MODE=${MODE} IP_ADDRESS=${reverseIp} PM2_HOME='/root/.pm3' CHOKIDAR_USEPOLLING=true PORT=${port} nodemon app.js`
              //     );
              //     excuteList[port - 20000] = true;
              //     return;
              //   }
              //   if (stderr) {
              //     console.log("stderr:", stderr);
              //     return;
              //   }
              //   console.log("stdout:", stdout);
              // });
            }
          }
        }
      }
    })
    .catch((e) => {});
}, 50);
