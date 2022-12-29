const zmq = require("zeromq");
const net = require("net");

const PORT = process.env.PORT;
const PORT2 = process.env.PORT2;
let sock;
function run() {
  sock = net.connect({ port: PORT, host: `127.0.0.1` });
  sock.on("connect", () => {
    console.log("socket connected");
  });
  sock.on("data", (data) => {
    console.log("data", data);
  });
  sock.on("close", () => {
    console.log("client closed");
  });
}

// setTimeout(() => {
//   sock.connect(`tcp://127.0.0.1:${PORT}`);
//   console.log(`Worker connected to port ${PORT}`);
//   sock.connect(`tcp://127.0.0.1:${PORT2}`);
//   console.log(`Worker connected to port ${PORT2}`);
// }, 2000);

setTimeout(() => {
  run();
}, 1);
