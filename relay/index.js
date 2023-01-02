const net = require("net");
const queryService = require("./src/services/query.service");
const { dev } = require("./src/utils/tools");
const { exec } = require("child_process");
const {
  SERVER_PORT,
  SERVER_HOST,
  PORT_GAP,
  pushSockets,
  connectedServer,
  relay,
  decoder,
  IP_ADDRESS,
} = require("./src/globals/variables");
const Broker = require("./src/models/Broker");
const { compareEmptyNetwork } = require("./src/modules/compareAddress");
const { responseData } = require("./src/modules/responseData");

// 퍼블리셔(메인) 서버 실행, 클라이언트 수신만 함
// 클라이언트 측 송신용 소켓과 퍼블리셔 바인딩
// 브로커 또한 퍼블리셔 바인딩 (퍼블리셔 간 전파를 위함)
function createServer() {
  let temp;
  relay.server = new net.Server((socket) => {
    socket.setMaxListeners(5000);
    socket.on("connect", () => {
      console.log(socket.address().address + "connected");
    });
    socket.on("data", (data) => {
      temp = data;
      const flag = decoder.decode(data.subarray(0, 6));
      responseData(flag, data);
    });
    socket.on("drain", function () {
      const flag = decoder.decode(temp.slice(0, 6));
      console.log("drain flag", flag);
      responseData(flag, temp);
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
  });
}

// 퍼블리셔(푸셔) 서버 실행, 소켓/퍼블리셔 간 송신만 힘
// 클라이언트 측 수신용 소켓과 푸셔 바인딩
function createPusher() {
  relay.pusher = new net.Server((socket) => {
    socket.setMaxListeners(5000);
    //
    pushSockets.push(socket);
    socket.on("connect", () => {
      console.log(socket.address().address + "connected");
    });
    socket.on("data", (data) => {
      console.log("pusher data", data);
    });
    socket.on("drain", function () {});
    socket.on("error", (err) => {
      console.log("socket err", err);
    });
    socket.on("close", () => {
      console.log("socket closed");
    });
  });
  relay.pusher.listen(SERVER_PORT + PORT_GAP, SERVER_HOST, () => {
    console.log("pusher listening on port" + (SERVER_PORT + PORT_GAP));
  });
}

createServer();
createPusher();

/* auto server connection */
function createBroker(ip, port) {
  const key = `${ip}:${port}`;
  relay.broker.set(key, new Broker(ip, port));
}

// 열린 퍼블리셔 서버 자동 연결
setInterval(() => {
  queryService
    .autoConnectServers()
    .then((publishers) => {
      if (connectedServer.size > 0 || publishers.length > 0) {
        const result = compareEmptyNetwork(connectedServer, publishers);
        if (result) {
          const [ip, port] = result;
          const key = `${ip}:${port}`;
          relay.broker.get(key).disconnect(`tcp://${ip}:${port}`);
          map.delete(key);
        }
      }
      for (let i = 0; i < publishers.length; i++) {
        try {
          const pub = publishers[i];
          const { ip, port, limit_amount } = pub;
          const isOtherServer = IP_ADDRESS !== ip || SERVER_PORT !== port;
          const isOtherPort = SERVER_PORT !== port;
          if (isOtherServer) {
            if (isOtherPort) {
              if (!connectedServer.has(`${ip}:${port}`)) {
                connectedServer.set(`${ip}:${port}`, {});
                dev.log(`servers ip, port:`, IP_ADDRESS, SERVER_PORT);
                dev.log(`not exists ip, port:`, ip, port);
                createBroker(ip, port);
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
