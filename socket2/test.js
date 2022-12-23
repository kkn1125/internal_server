const net = require("net");
const relay = {
  client: new Map(),
};
async function createClient(ip, port) {
  const identity = [ip, port].join(":");
  console.log("연결중", identity);
  const client = net.connect({
    host: ip,
    port: port,
  });

  client.on("connect", function () {
    console.log("connected to server!");
  });
  client.on("data", function (data) {
    // const success = !socket.write(data);
    console.log("data:", data);
    // const success = !serverSocket.write(data);
    // console.log("success:", success);
  });
  client.on("error", function (chunk) {
    console.log("error!");
  });
  client.on("timeout", function (chunk) {
    console.log("timeout!");
  });

  relay.client.set(identity, client);
}
createClient("192.168.254.16", 20000);
