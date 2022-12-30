import zmq from "zeromq";
import net from "net";

const PORT = process.env.PORT;

let serverSocket = null;
function run() {
  const server = new net.Server((socket) => {
    serverSocket = socket;
    socket.on("connect", () => {
      console.log("socket connected");
    });
    socket.on("data", (data) => {
      console.log("data", data);
    });
    socket.on("drain", () => {
      console.log("socket drain");
    });
    socket.on("error", (err) => {
      console.log("socket err", err);
    });
    socket.on("close", () => {
      console.log("socket closed");
    });
  });
  server.listen(PORT, `127.0.0.1`, () => {
    console.log("server listening on port" + PORT);
    // serverSocket.write("hi im server");
  });

  // await sock.bind(`tcp://127.0.0.1:${PORT}`);
  // console.log(`Producer bound to port ${PORT}`);

  // while (true) {
  //   await sock.send(`${PORT} some work`);
  //   await new Promise((resolve) => {
  //     setTimeout(resolve, 1000);
  //   });
  // }
}

run();
