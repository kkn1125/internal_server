const net = require("net");
module.exports = class Client {
  client = null;
  app = null;
  ws = null;

  constructor(app, ws) {
    this.setupApp(app);
    this.setupWs(ws);
    this.setupNet(ws.publisher.ip, ws.publisher.port);
    this.setupEvents();
  }
  setupApp(app) {
    this.app = app;
  }
  setupWs(ws) {
    this.ws = ws;
  }
  setupNet(ip, port) {
    this.client = net.connect({
      host: ip,
      port: port,
    });
  }
  setupEvents() {
    this.client.on("connect", function () {
      console.log("connected to server!");
    });
    this.client.on("data", function (chunk) {
      // console.log(chunk);
    });
    this.client.on("error", function (chunk) {
      console.log("error!");
      console.log(chunk);
    });
    this.client.on("timeout", function (chunk) {
      console.log("timeout!");
    });
  }
  write(data) {
    // if (data instanceof ArrayBuffer) {
    //   console.log("client send data typeof", data instanceof Buffer);
    //   console.log("client send data typeof", data instanceof ArrayBuffer);
    //   console.log("client send data typeof", data instanceof Uint8Array);
    //   console.log(data);
    //   // console.log(new Uint8Array(data));
    //   // console.log(Buffer.from(new Uint8Array(data)));
    //   // const ui8 = new Uint8Array(data, data.byteLength);
    //   this.client.write(new Uint8Array(data));
    // } else {
    //   this.client.write(data);
    // }
    this.client.write(data);
  }
  toArrayBuffer(buf) {
    const ab = new ArrayBuffer(buf.length);
    const view = new Uint8Array(ab);
    for (let i = 0; i < buf.length; ++i) {
      view[i] = buf[i];
    }
    return ab;
  }
  toBuffer(ab) {
    const buf = Buffer.alloc(ab.byteLength);
    const view = new Uint8Array(ab);
    for (let i = 0; i < buf.length; ++i) {
      buf[i] = view[i];
    }
    return buf;
  }
};
