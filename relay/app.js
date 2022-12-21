const zmq = require("zeromq");
const dotenv = require("dotenv");
const path = require("path");
// const __dirname = path.resolve();

dotenv.config({ path: path.join(__dirname, `.env.${process.env.NODE_ENV}`) });

const serverHost = process.env.SERVER_HOST;
const serverPort = process.env.SERVER_PORT;

const relay = {};

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
