const net = require("net");
const { Message } = require("protobufjs");
const { decoder, PORT_GAP } = require("../globals/variables");
const { dev } = require("../utils/tools");

module.exports = class Subscriber {
  subscriber = null;
  app = null;
  rest = "";
  ws = null;
  constructor(app, ws) {
    this.setupApp(app);
    this.setupWs(ws);
    this.setupNet(ws.publisher.ip, ws.publisher.port + PORT_GAP);
    this.setupEvents();
  }
  setupNet(ip, port) {
    this.subscriber = net.connect({
      host: ip,
      port: port,
    });
  }
  setupApp(app) {
    this.app = app;
  }
  setupWs(ws) {
    this.ws = ws;
  }
  setupEvents() {
    this.subscriber.on("connect", function () {
      console.log("connected to pusher!");
    });
    this.subscriber.on(
      "data",
      function (chunk) {
        const decoded = decoder.decode(chunk);
        const lastIndex = decoded.lastIndexOf("}{");
        this.rest = decoded;
        let result = null;
        if (lastIndex > 0) {
          result = this.rest.slice(0, lastIndex + 1);
          this.rest = this.rest.slice(lastIndex + 1);
        } else {
          result = this.rest;
          this.rest = "";
        }
        try {
          const decodeList = JSON.parse(
            "[" + result.replace(/}{/g, "},{") + "]"
          );
          for (let i = 0; i < decodeList.length; i++) {
            const row = decodeList[i];
            // dev.alias("relay에서 받음").log(row);
            if (row.type === "players") {
              dev.alias("players data").log(row.players.length);
              this.publishData({
                success: true,
                type: row.type,
                target: row.target,
                players: row.players,
              });
            } else if (row.type === "locations") {
              // dev.alias("location").log(row);
              this.publishData({
                success: true,
                type: row.type,
                target: row.target,
                pk: row.locationJson.id,
                locationJson: row.locationJson,
              });
            } else if (row.type === "logout") {
              // dev.alias("logout").log(row.players.length);
              this.publishData({
                success: true,
                type: row.type,
                target: row.target,
                players: row.players,
              });
            }
          }
        } catch (e) {
          dev.alias("Subscriber Error").log(e.message);
        }
        /* location 데이터 받기 에러때문에 보류 */
        // if (chunk.byteLength === 25) {
        //   this.publishData({
        //     type: "locations",
        //     data: chunk,
        //   });
        // } else {
        //   const decoded = decoder.decode(chunk);
        //   const lastIndex = decoded.lastIndexOf("}{");
        //   this.rest = decoded;
        //   let result = null;
        //   if (lastIndex > 0) {
        //     result = this.rest.slice(0, lastIndex + 1);
        //     this.rest = this.rest.slice(lastIndex + 1);
        //   } else {
        //     result = this.rest;
        //     this.rest = "";
        //   }
        //   try {
        //     const decodeList = JSON.parse(
        //       "[" + result.replace(/}{/g, "},{") + "]"
        //     );
        //     for (let i = 0; i < decodeList.length; i++) {
        //       const row = decodeList[i];
        //       if (row.type === "players") {
        //         dev.alias("players data").log(row.players.length);
        //         this.publishData({
        //           success: true,
        //           type: row.type,
        //           target: row.target,
        //           players: row.players,
        //         });
        //       } else if (row.type === "locations") {
        //         // location 데이터 전송 방식 변경
        //         // 잠시 보류
        //         this.publishData({
        //           success: true,
        //           type: row.type,
        //           target: row.target,
        //           pk: row.locationJson.id,
        //           locationJson: row.locationJson,
        //         });
        //       } else if (row.type === "logout") {
        //         this.publishData({
        //           success: true,
        //           type: row.type,
        //           target: row.target,
        //           players: row.players,
        //         });
        //       }
        //     }
        //   } catch (e) {
        //     dev.alias("Subscriber Error").log(e);
        //   }
        // }
      }.bind(this)
    );
    this.subscriber.on("error", function (chunk) {
      console.log("error!");
      console.log(chunk);
    });
    this.subscriber.on("timeout", function (chunk) {
      console.log("timeout!");
    });
  }

  publishData(data) {
    // console.log("this", this);
    if (data.type === "players") {
      this.app.publish(
        `${this.ws.space.pk}-${this.ws.channel.pk}`,
        JSON.stringify(data.players)
      );
    } else if (data.type === "locations") {
      const encoded = Message.encode(
        new Message({
          id: data.pk,
          pox: data.locationJson.pox,
          poy: data.locationJson.poy,
          poz: data.locationJson.poz,
          roy: data.locationJson.roy,
        })
      ).finish();
      // console.log(this.app);
      this.app.publish(
        `${this.ws.space.pk}-${this.ws.channel.pk}`,
        encoded,
        true,
        true
      );
    } else if (data.type === "logout") {
      this.app.publish(
        `${this.ws.space.pk}-${this.ws.channel.pk}`,
        JSON.stringify(data)
      );
    }
  }
};
