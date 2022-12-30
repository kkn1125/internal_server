import axios from "axios";
import { v4 } from "uuid";
import { createEmail, dev } from "../../src/utils/tools";
import protobufjs from "protobufjs";

/* Communication Parts */
const { Message, Field } = protobufjs;

Field.d(1, "float", "required")(Message.prototype, "id");
Field.d(2, "float", "required")(Message.prototype, "pox");
Field.d(3, "float", "required")(Message.prototype, "poy");
Field.d(4, "float", "required")(Message.prototype, "poz");
Field.d(5, "float", "required")(Message.prototype, "roy");

const packetLength = 25;

const host = import.meta.env.VITE_API_HOST;
const port = import.meta.env.VITE_API_PORT;

const panel = document.querySelector("#panel");
const sockets = new Map();
const encoder = new TextEncoder();
const decoder = new TextDecoder();

let users = new Map();
const app = document.querySelector("#app");
const ctx = app.getContext("2d");
const SPEED = 5;
const SIZE = {
  user: {
    x: 30,
    y: 30,
  },
};
const direction = {
  w: false,
  s: false,
  a: false,
  d: false,
};

const attachUserData = {};

const loginEl = `
  <form class="login-window">
    <div class="upper fs center">login</div>
    <input type="text" id="nickname" autocomplete="username" />
    <input type="password" id="password" autocomplete="current-password" />
    <button id="login" type="button">login</button>
  </form>
`;

window.addEventListener("click", (e) => {
  const target = e.target;
  if (target.id !== "login") return;

  const nickname = document.querySelector("#nickname").value.trim();
  const password = document.querySelector("#password").value.trim();

  if (nickname && password) {
    sockets.get(attachUserData.user.uuid).send(
      JSON.stringify({
        type: "login",
        // pk: attachUserData.user.pk,
        nickname,
        password,
        pox: app.width / 2 - SIZE.user.x / 2,
        poy: app.height / 2 - SIZE.user.y / 2,
        poz: 0,
        roy: (Math.PI / 180) * 90,
      })
    );
    document.querySelector(".login-window").remove();
  }
});

window.addEventListener("load", () => {
  axios
    .post(`http://${host}:${port}/query/attach`, {
      uuid: v4(),
      email: "",
      locale: navigator.language,
    })
    .then((result) => {
      const { data } = result;
      console.log(result);
      console.log(attachUserData);
      Object.assign(attachUserData, data);
      console.log(data);
      sockets.set(data.user.uuid, connectSocket(attachUserData));
      attachUserData.user.pk = data.user.pk;
      for (let u of data.players) {
        users.set(u.id, Object.assign(users.get(u.id) || {}, u));
      }
      document.body.insertAdjacentHTML("afterbegin", loginEl);
    })
    .catch((e) => {
      console.log("error");
      console.log(e);
    });
});

function connectSocket(connectionData) {
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
      uuid: connectionData.user.uuid,
    }).trim()
  );
  const ws = new WebSocket(`ws://${socket.ip}:${socket.port}/?q=${q}`);
  ws.binaryType = "arraybuffer";
  ws.onopen = (e) => {
    dev.alias("Socket").log("open");
  };
  ws.onmessage = (message) => {
    const { data } = message;
    if (data instanceof ArrayBuffer) {
      for (let i = 0; i < Math.round(data.byteLength / packetLength); i++) {
        try {
          const json = Message.decode(
            new Uint8Array(data.slice(i * packetLength, (i + 1) * packetLength))
          ).toJSON();
          users.set(json.id, Object.assign(users.get(json.id) || {}, json));
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      const json = JSON.parse(data);
      // console.log(json);
      if (json instanceof Array) {
        console.log("받음", json);
        for (let u of json) {
          if (users.has(u.id)) continue;
          users.set(u.id, Object.assign(users.get(u.id) || {}, u));
        }
      } else if (json.type === "login") {
        for (let u of json.players) {
          if (users.has(u.id)) continue;
          users.set(u.id, Object.assign(users.get(u.id) || {}, u));
        }
      } else if (json.type === "logout") {
        console.log("logout", json);
        for (let u of users.values()) {
          users.delete(u.id);
        }
        for (let u of json.players) {
          users.set(u.id, u);
        }
      }
    }
  };
  ws.onerror = (e) => {
    dev.alias("Socket").log("error");
    try {
      throw e;
    } catch (e) {
      dev.alias("Socket Error Message").log(e);
    }
  };
  ws.onclose = (e) => {
    dev.alias("Socket").log("close");
  };
  return ws;
}

/* Communication Parts */

/* Gaming Parts */
window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (key == "w" || key == "s" || key == "a" || key == "d" || key == "shift") {
    direction[key] = true;
  }
});

window.addEventListener("keyup", (e) => {
  const key = e.key.toLowerCase();
  if (key == "w" || key == "s" || key == "a" || key == "d" || key == "shift") {
    direction[e.key.toLowerCase()] = false;
  }
});

app.width = innerWidth;
app.height = innerHeight;
window.addEventListener("resize", (e) => {
  app.width = innerWidth;
  app.height = innerHeight;
});

function clearScene() {
  ctx.clearRect(0, 0, app.width, app.height);
}

function userUpdate() {
  for (let u of users.values()) {
    ctx.fillStyle = "black";
    ctx.fillRect(u.pox, u.poy, SIZE.user.x, SIZE.user.y);
    ctx.fillStyle = "orange";
    ctx.fillText(
      u.nickname,
      u.pox + SIZE.user.x / 2,
      u.poy - 5,
      SIZE.user.x,
      SIZE.user.y
    );
    ctx.textAlign = "center";
  }
}

function moving(time) {
  for (let u of users.values()) {
    if (u.id == attachUserData.user.pk) {
      if (direction.w || direction.s || direction.a || direction.d) {
        if (direction.w) {
          Object.assign(u, { poy: u.poy - SPEED });
          // u.poy -= SPEED;
        }
        if (direction.s) {
          Object.assign(u, { poy: u.poy + SPEED });
          // u.poy += SPEED;
        }
        if (direction.a) {
          Object.assign(u, { pox: u.pox - SPEED });
          // u.pox -= SPEED;
        }
        if (direction.d) {
          Object.assign(u, { pox: u.pox + SPEED });
          // u.pox += SPEED;
        }
        updateLocation(u);
      }
      break;
    }
  }
}

function updateLocation(user) {
  sockets.get(attachUserData.user.uuid).send(
    Message.encode(
      new Message({
        id: user.id,
        // space: user.space_id,
        // channel: user.channel_id,
        pox: user.pox,
        poy: user.poy,
        poz: user.poz,
        roy: user.roy,
      })
    ).finish()
  );
}

function update(time) {
  userUpdate(time);
}

function render(time) {
  time *= 0.001;
  clearScene();
  moving(time);
  update(time);
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
/* Gaming Parts */

/* Panel Settings */
let indexKey = "localeText";

window.addEventListener("click", (e) => {
  const target = e.target;
  if (!target.id || target.nodeName !== "BUTTON") return;
  console.log(target.id, "click!");
  if (target.id === "locale") {
    indexKey = "localeText";
  }
  if (target.id === "socket") {
    indexKey = "socketText";
  }
  if (target.id === "publisher") {
    indexKey = "publisherText";
  }
  if (target.id === "space") {
    indexKey = "spaceText";
  }
  if (target.id === "channel") {
    indexKey = "channelText";
  }
  if (target.id === "user") {
    indexKey = "userText";
  }
});
/* Panel Settings */
