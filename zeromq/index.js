const zmq = require("zeromq");
const dotenv = require("dotenv");
const path = require("path");
const queryService = require("./src/services/query.service");
const { dev } = require("./src/utils/tools");

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
const HOST = process.env.SERVER_HOST;
const PORT = Number(process.env.SERVER_PORT);
const PORT_GAP = Number(process.env.PORT_GAP);

const relay = {
  server: null,
  pusher: null,
  puller: null,
};

async function runServer() {
  relay.server = new zmq.Reply();
  await relay.server.bind(`tcp://*:${PORT}`);
  dev.log(`server bind on tcp://${HOST}:${PORT}`);
  for await (const [msg] of relay.server) {
    dev.log("Received: ", msg);
    try {
      await relay.server.send(msg);
      await relay.pusher.send(msg);
    } catch (e) {
      console.log(e);
    }
  }
}

async function runPusher() {
  relay.pusher = new zmq.Push();
  await relay.pusher.bind(`tcp://*:${PORT + PORT_GAP}`);
  dev.log(`pusher bind on tcp://${HOST}:${PORT + PORT_GAP}`);
}

async function pullerRun() {
  relay.puller = new zmq.Pull();

  for await (const [msg] of relay.puller) {
    console.log(msg);
  }
}

function addPulling(ip, port) {
  relay.puller.connect(`tcp://${ip}:${port}`);
  console.log(`relay server puller connected to tcp://${ip}:${port}`);
}

runServer();
runPusher();
pullerRun();

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
        const pub = publishers[i];
        const { ip, port, limit_amount } = pub;
        // if(limit_amount)
        const reverseIp = ip === "192.168.254.16" ? "192.168.88.234" : ip;
        // console.log(originIp === reverseIp, port, serverPort)
        if (originIp !== reverseIp || serverPort !== port) {
          if (serverPort !== port) {
            if (!relay.client.has(`${reverseIp}:${port}`)) {
              pubList.set(`${ip}:${port}`, {});
              addPulling(reverseIp, serverPort);
              console.log(`servers ip, port:`, originIp, serverPort);
              console.log(`not exists ip, port:`, reverseIp, port);
              // createClient(reverseIp, port);

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
