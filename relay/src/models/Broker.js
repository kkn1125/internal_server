module.exports = class Broker {
  ip = "";
  port = 0;
  identity = null;
  broker = null;
  constructor(ip, port) {
    this.setupAddress(ip, port);
  }
  setupAddress(ip, port) {
    this.ip = ip;
    this.port = port;
    this.identity = `${this.ip}:${this.port}`;
  }
  setupNet() {
    this.broker = net.connect({ host: this.ip, port: this.port });
  }
  setupEvents() {
    this.broker.on("connect", () => {
      console.log("socket connected");
    });
    this.broker.on("data", (data) => {
      console.log("data", data);
    });
    this.broker.on("close", () => {
      console.log("client closed");
    });
  }
};
