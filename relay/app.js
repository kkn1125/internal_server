const zmq = require("zeromq");
const dotenv = require("dotenv");
const path = require("path");
// const __dirname = path.resolve();

const mode = process.env.NODE_ENV;
const MODE = process.env.MODE;
dotenv.config({
  path: path.join(__dirname, `.env.${mode}.${MODE}`),
});

const serverHost = process.env.SERVER_HOST;
const serverPort = process.env.SERVER_PORT;

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

const net = require("net");

relay.server = net.createServer((socket) => {
  socket.setMaxListeners(50);
  console.log(socket.address().address + "connected");
  process.send("ready");
  socket.on("data", function (data) {
    // console.log("rcv:", data);
    // console.log("rcv decoded:", decoder.decode(data));
    // if (maxBinary) {
    // messageQueue.push(data);
    // }
    temp = data;
    const success = !socket.write(data);
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
  relay.client.set(
    identity,
    net.connect({
      host: ip,
      port: port,
    })
  );
  relay.client.get(identity).on("connect", function () {
    console.log("connected to server!");
  });
  relay.client.get(identity).on("data", function (data) {
    const success = !socket.write(data);
  });
  relay.client.get(identity).on("error", function (chunk) {
    console.log("error!");
  });
  relay.client.get(identity).on("timeout", function (chunk) {
    console.log("timeout!");
  });
}
