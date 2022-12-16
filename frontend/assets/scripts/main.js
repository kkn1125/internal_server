import axios from "axios";
import { v4 } from "uuid";
import { createEmail, dev } from "../../src/utils/tools";
import protobufjs from "protobufjs";

/* Communication Parts */
const { Message, Field } = protobufjs;

Field.d(1, "fixed32", "required")(Message.prototype, "id");
Field.d(2, "string", "required")(Message.prototype, "nickname");
Field.d(3, "float", "required")(Message.prototype, "pox");
Field.d(4, "float", "required")(Message.prototype, "poy");
Field.d(5, "float", "required")(Message.prototype, "poz");
Field.d(6, "float", "required")(Message.prototype, "roy");

const host = import.meta.env.VITE_API_HOST;
const port = import.meta.env.VITE_API_PORT;

const panel = document.querySelector("#panel");
const sockets = new Map();
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function connectSocket(ip, port, uuid) {
  const socket = new WebSocket(`ws://${ip}:${port}/?csrftoken=${uuid}`);
  socket.binaryType = "arraybuffer";
  socket.onopen = (e) => {
    dev.alias("Socket").log("open");
  };
  socket.onmessage = (message) => {
    // const decoded = decoder.decode(message);
    const { data } = message;
    dev.alias("Socket Message").log(message);
    try {
      const json = JSON.parse(data);
    } catch (e) {}
  };
  socket.onerror = (e) => {
    dev.alias("Socket").log("error");
    try {
      throw e.message;
    } catch (e) {
      dev.alias("Socket Error Message").log(e);
    }
  };
  socket.onclose = (e) => {
    dev.alias("Socket").log("close");
  };
}

const attachUserData = {
  uuid: v4(),
  email: createEmail(),
  locale: navigator.language,
};

axios
  .post(`http://${host}:${port}/query/enter`, attachUserData)
  .then((result) => {
    const { data } = result;
    console.log(data);
    sockets.set(
      data.user.uuid,
      connectSocket(data.socket.ip, data.socket.port, attachUserData.uuid)
    );
  });
/* Communication Parts */

/* Gaming Parts */
const users = [];
const usersMap = new Map();
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

window.addEventListener("resize", (e) => {
  app.width = innerWidth;
  app.height = innerHeight;
});

function clearScene() {
  ctx.clearRect(0, 0, app.width, app.height);
}

function userUpdate() {
  for (let i = 0; i < users / 2; i++) {
    const user1 = users[i];
    const user2 = users[users.length - 1 - i];

    ctx.fillRect(user1.pox, user1.poy, SIZE.user.x, SIZE.user.y);

    if (user1 !== user2) {
    }
  }
}
function moving(time) {
  for (let i = 0; i < users.length / 2; i++) {
    const user1 = users[i];
    const user2 = users[users.length - 1 - i];
    if (user1.id == attachUserData.uuid) {
      if (direction.w || direction.s || direction.a || direction.d) {
        if (direction.w) {
          user1.poy -= SPEED;
        }
        if (direction.s) {
          user1.poy += SPEED;
        }
        if (direction.a) {
          user1.pox -= SPEED;
        }
        if (direction.d) {
          user1.pox += SPEED;
        }
      }
      break;
    }
    if (user1 !== user2) {
      if (user2.id == attachUserData.uuid) {
        if (direction.w || direction.s || direction.a || direction.d) {
          if (direction.w) {
            user2.poy -= SPEED;
          }
          if (direction.s) {
            user2.poy += SPEED;
          }
          if (direction.a) {
            user2.pox -= SPEED;
          }
          if (direction.d) {
            user2.pox += SPEED;
          }
        }
        break;
      }
    }
  }
}
function update(time) {
  userUpdate(time);
}
function render(time) {
  time *= 0.001;
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
  if (!target.id) return;
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

/* SSE Settings */
const sse = new EventSource(`/sse`, {
  withCredentials: true,
});

sse.onopen = (e) => {
  console.log(e);
};

sse.onmessage = (message) => {
  const { data } = message;
  const json = JSON.parse(data);
  const { locales, sockets, publishers, spaces, channels, users } = json;
  const replaces = {};
  replaces.localeText = `<div>
    <b>Locales</b>
    <span>${locales[0].length}개</span>
    <ul>
      ${locales[0].map((locale) => `<li>${locale.region}</li>`).join("")}
    </ul>
  </div>`;
  replaces.socketText = `<div>
    <b>Sockets</b>
    <span>${sockets[0].length}개</span>
    <ul>
      ${sockets[0].map((socket) => `<li>${socket.port}</li>`).join("")}
    </ul>
  </div>`;
  replaces.publisherText = `<div>
    <b>Publishers</b>
    <span>${publishers[0].length}개</span>
    <ul>
      ${publishers[0].map((publisher) => `<li>${publisher.port}</li>`).join("")}
    </ul>
  </div>`;
  replaces.spaceText = `<div>
    <b>Spaces</b>
    <span>${spaces[0].length}개</span>
    <ul>
      ${spaces[0].map((space) => `<li>${space.name}</li>`).join("")}
    </ul>
  </div>`;
  replaces.channelText = `<div>
    <b>Channels</b>
    <span>${channels[0].length}개</span>
    <ul>
      ${channels[0].map((channel) => `<li>${channel.name}</li>`).join("")}
    </ul>
  </div>`;
  replaces.userText = `<div>
    <b>Users</b>
    <span>${users[0].length}개</span>
    <ul>
      ${users[0].map((user) => `<li>${user.uuid}</li>`).join("")}
    </ul>
  </div>`;

  const tabs = `
  <button id="locale">locale</button>
  <button id="socket">socket</button>
  <button id="publisher">publisher</button>
  <button id="space">space</button>
  <button id="channel">channel</button>
  <button id="user">user</button>
  `;
  panel.innerHTML = tabs + replaces[indexKey];
};

sse.onerror = (err) => {
  console.log(err);
};
/* SSE Settings */
