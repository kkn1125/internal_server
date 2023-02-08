const axios = require("axios");
const { v4 } = require("uuid");
const protobuf = require("protobufjs");
const WebSocket = require("ws");

const game = {
  size: {
    user: {
      x: 30,
      y: 30,
    },
  },
  speed: 5,
};
const { Message, Field } = protobuf;
const attachUserData = {
  // uuid: v4(),
  // email: createEmail(),
  // locale: "ko-kr",
};

Field.d(1, "float", "required")(Message.prototype, "id");
Field.d(2, "float", "required")(Message.prototype, "pox");
Field.d(3, "float", "required")(Message.prototype, "poy");
Field.d(4, "float", "required")(Message.prototype, "poz");
Field.d(5, "float", "required")(Message.prototype, "roy");
// Field.d(1, "string", "required")(Message.prototype, "loc");
// Field.d(1, "string", "required")(Message.prototype, "uuid");
// Field.d(2, "int32", "required")(Message.prototype, "server");
// Field.d(3, "int32", "required")(Message.prototype, "channel");
// Field.d(4, "float", "required")(Message.prototype, "pox");
// Field.d(5, "float", "required")(Message.prototype, "poy");
// Field.d(6, "float", "required")(Message.prototype, "poz");
// Field.d(7, "float", "required")(Message.prototype, "roy");

const API_HOST = process.env.API_HOST;
const API_PORT = process.env.API_PORT;
const amount = 50;
const start = 0;
const end = amount - start;
const sockets = new Map();
let users = [];

for (let i = start; i < end; i++) {
  const uuid = v4();
  sockets.set(uuid, {
    uuid: uuid,
    locale: "ko-kr",
  });
}

function connectSocket(connectionData, i) {
  const {
    locale,
    socket,
    publisher,
    connection,
    space,
    channel,
    allocation,
    user,
  } = connectionData;
  const q = encodeURI(
    JSON.stringify({
      uuid: user.uuid,
    }).trim()
  );
  // console.log(connectionData);
  try {
    const ws = new WebSocket(`ws://${'192.168.254.16'}:${socket.port}/?q=${q}`);
    console.log(ws)
    ws.binaryType = "arraybuffer";
    ws.onopen = function (e) {
      console.log("소켓 오픈");
      setTimeout(() => {
        ws.send(
          JSON.stringify({
            type: "login",
            pk: user.pk,
            nickname: "test-" + i,
            password: "1234",
            pox: 500 - game.size.user.x / 2,
            poy: 500 - game.size.user.x / 2,
            poz: 0,
            roy: (Math.PI / 180) * 90,
          })
        );
        setTimeout(() => {
          setInterval(() => {
            // console.log(uuid);
            ws.send(
              Message.encode(
                new Message({
                  id: user.pk,
                  // space: user.space_id,
                  // channel: user.channel_id,
                  pox: Math.random() * 500 - 100 + 100,
                  poy: Math.random() * 500 - 100 + 100,
                  poz: 0,
                  roy: (Math.PI / 180) * 90,
                })
              ).finish()
            );
          }, 16);
        }, 5000);
      }, 5000);
    };
    ws.onmessage = function (message) {
      const { data } = message;
    };
    ws.onerror = function (e) {
      console.log("소켓 에러");
      throw e.message;
    };
    ws.onclose = function (e) {
      console.log("소켓 닫힘");
    };
  } catch (e) {
    console.log(e);
  }

  // sockets.set(uuid, Object.assign(sockets.get(uuid), { socket: socket }));
}

let index = 0;
function attaching(number) {
  for (let i = start; i < end; i++) {
    const uuid = v4();
    axios
      .post(`http://${API_HOST}:${API_PORT}/query/attach`, {
        uuid: uuid,
        email: "",
        locale: "ko-kr",
      })
      .then((result) => {
        const { data } = result;
        // console.log(data);
        sockets.set(uuid, connectSocket(data, 2 + i));
        attachUserData.pk = data.user.pk;
        attachUserData.uuid = uuid;
        users = data.players;
      })
      .catch((e) => {
        console.log(e);
      });
  }
}
attaching(start);
