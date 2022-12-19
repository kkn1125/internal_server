import axios from "axios";
import { v4 } from "uuid";
import { createEmail, dev } from "../../src/utils/tools";
import protobufjs from "protobufjs";

/* Communication Parts */
const { Message, Field } = protobufjs;

// Field.d(1, "string", "optional")(Message.prototype, "uuid");
Field.d(1, "float", "required")(Message.prototype, "id");
// Field.d(2, "int32", "required")(Message.prototype, "space");
// Field.d(3, "int32", "required")(Message.prototype, "channel");
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

const attachUserData = {
  uuid: v4(),
  email: createEmail(),
  locale: navigator.language,
};

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
    sockets.get(attachUserData.uuid).send(
      JSON.stringify({
        type: "login",
        pk: attachUserData.pk,
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
    .post(`http://${host}:${port}/query/enter`, attachUserData)
    .then((result) => {
      const { data } = result;
      console.log(data);
      sockets.set(
        data.user.uuid,
        connectSocket(
          data.socket.ip,
          data.socket.port,
          attachUserData.uuid,
          data.space.pk,
          data.channel.pk,
          data.user.pk
        )
      );
      attachUserData.pk = data.user.pk;
      for (let u of data.players) {
        users.set(u.id, u);
      }
      document.body.insertAdjacentHTML("afterbegin", loginEl);
    });
});

function connectSocket(ip, port, uuid, space, channel, pk) {
  const socket = new WebSocket(
    `ws://${ip}:${port}/?csrftoken=${uuid}&space=${space}&channel=${channel}&pk=${pk}`
  );
  socket.binaryType = "arraybuffer";
  socket.onopen = (e) => {
    dev.alias("Socket").log("open");
  };
  socket.onmessage = (message) => {
    // const decoded = decoder.decode(message);
    const { data } = message;
    dev.alias("Socket Message").log(message);
    if (data instanceof ArrayBuffer) {
      for (let i = 0; i < Math.round(data.byteLength / packetLength); i++) {
        try {
          const json = Message.decode(
            new Uint8Array(
              data.slice(i * packetLength, i * packetLength + packetLength)
            )
          ).toJSON();
          users.set(json.id, Object.assign(users.get(json.id), json));
          // for (let user1 of users.values()) {
          //   const json = Message.decode(
          //     new Uint8Array(
          //       data.slice(i * packetLength, i * packetLength + packetLength)
          //     )
          //   ).toJSON();
          //   if (user1.id === json.id) {
          //     Object.assign(user1, json);
          //     break;
          //   } else {
          //     continue;
          //   }
          // }
          // for (let i = 0; i < users.length / 2; i++) {
          //   // const user = Message.decode(new Uint8Array(data)).toJSON();
          //   const user1 = users[i];
          //   const user2 = users[users.length - 1 - i];
          //   if (user1.id === user.id) {
          //     user1.pox = user.pox;
          //     user1.poy = user.poy;
          //     user1.poz = user.poz;
          //     user1.roy = user.roy;
          //     break;
          //   }
          //   if (user1 !== user2) {
          //     if (user2.id === user.id) {
          //       user2.pox = user.pox;
          //       user2.poy = user.poy;
          //       user2.poz = user.poz;
          //       user2.roy = user.roy;
          //       break;
          //     }
          //   }
          // }
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      const json = JSON.parse(data);
      console.log(json);
      if (json instanceof Array) {
        const newMap = new Map();
        for (let u of json) {
          newMap.set(u.id, u);
        }
        users = newMap;
        // users = json;
      } else if (json.type === "login") {
        const newMap = new Map();
        for (let u of json.players) {
          newMap.set(u.id, u);
        }
        users = newMap;
        // users = json.players;
      }
    }
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
    axios
      .post(`http://${host}:${port}/query/enter`, attachUserData)
      .then((result) => {
        const { data } = result;
        console.log(data);
        sockets.set(
          data.user.uuid,
          connectSocket(
            data.socket.ip,
            data.socket.port,
            attachUserData.uuid,
            data.space.pk,
            data.channel.pk,
            data.user.pk
          )
        );
        attachUserData.pk = data.user.pk;
        const newMap = new Map();
        for (let u of data.players) {
          newMap.set(u.id, u);
        }
        users = newMap;
        // users = data.players;
        document.body.insertAdjacentHTML("afterbegin", loginEl);
      });
  };
  return socket;
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
  // for (let i = 0; i < users.length / 2; i++) {
  //   const user1 = users[i];
  //   const user2 = users[users.length - 1 - i];
  //   ctx.fillRect(user1.pox, user1.poy, SIZE.user.x, SIZE.user.y);

  //   if (user1 !== user2) {
  //     ctx.fillRect(user2.pox, user2.poy, SIZE.user.x, SIZE.user.y);
  //   }
  // }
  for (let u of users.values()) {
    ctx.fillRect(u.pox, u.poy, SIZE.user.x, SIZE.user.y);
  }
}

function moving(time) {
  // for (let i = 0; i < users.length / 2; i++) {
  //   const user1 = users[i];
  //   const user2 = users[users.length - 1 - i];
  //   if (user1.uuid == attachUserData.uuid) {
  //     if (direction.w || direction.s || direction.a || direction.d) {
  //       if (direction.w) {
  //         user1.poy -= SPEED;
  //       }
  //       if (direction.s) {
  //         user1.poy += SPEED;
  //       }
  //       if (direction.a) {
  //         user1.pox -= SPEED;
  //       }
  //       if (direction.d) {
  //         user1.pox += SPEED;
  //       }
  //       updateLocation(user1);
  //     }
  //     break;
  //   }
  //   if (user1 !== user2) {
  //     if (user2.uuid == attachUserData.uuid) {
  //       if (direction.w || direction.s || direction.a || direction.d) {
  //         if (direction.w) {
  //           user2.poy -= SPEED;
  //         }
  //         if (direction.s) {
  //           user2.poy += SPEED;
  //         }
  //         if (direction.a) {
  //           user2.pox -= SPEED;
  //         }
  //         if (direction.d) {
  //           user2.pox += SPEED;
  //         }
  //         updateLocation(user2);
  //       }
  //       break;
  //     }
  //   }
  // }
  for (let u of users.values()) {
    if (u.uuid == attachUserData.uuid) {
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
    // if (user1 !== user2) {
    //   if (user2.uuid == attachUserData.uuid) {
    //     if (direction.w || direction.s || direction.a || direction.d) {
    //       if (direction.w) {
    //         user2.poy -= SPEED;
    //       }
    //       if (direction.s) {
    //         user2.poy += SPEED;
    //       }
    //       if (direction.a) {
    //         user2.pox -= SPEED;
    //       }
    //       if (direction.d) {
    //         user2.pox += SPEED;
    //       }
    //       updateLocation(user2);
    //     }
    //     break;
    //   }
    // }
  }
}

function updateLocation(user) {
  sockets.get(attachUserData.uuid).send(
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

/* SSE Settings */
// const sse = new EventSource(`/sse`, {
//   withCredentials: true,
// });

// sse.onopen = (e) => {
//   console.log(e);
// };

// sse.onmessage = (message) => {
//   const { data } = message;
//   const json = JSON.parse(data);
//   const { locales, sockets, publishers, spaces, channels, users } = json;
//   const replaces = {};
//   replaces.localeText = `<div>
//     <b>Locales</b>
//     <span>${locales[0].length}개</span>
//     <ul>
//       ${locales[0].map((locale) => `<li>${locale.region}</li>`).join("")}
//     </ul>
//   </div>`;
//   replaces.socketText = `<div>
//     <b>Sockets</b>
//     <span>${sockets[0].length}개</span>
//     <ul>
//       ${sockets[0].map((socket) => `<li>${socket.port}</li>`).join("")}
//     </ul>
//   </div>`;
//   replaces.publisherText = `<div>
//     <b>Publishers</b>
//     <span>${publishers[0].length}개</span>
//     <ul>
//       ${publishers[0].map((publisher) => `<li>${publisher.port}</li>`).join("")}
//     </ul>
//   </div>`;
//   replaces.spaceText = `<div>
//     <b>Spaces</b>
//     <span>${spaces[0].length}개</span>
//     <ul>
//       ${spaces[0].map((space) => `<li>${space.name}</li>`).join("")}
//     </ul>
//   </div>`;
//   replaces.channelText = `<div>
//     <b>Channels</b>
//     <span>${channels[0].length}개</span>
//     <ul>
//       ${channels[0].map((channel) => `<li>${channel.name}</li>`).join("")}
//     </ul>
//   </div>`;
//   replaces.userText = `<div>
//     <b>Users</b>
//     <span>${users[0].length}개</span>
//     <ul>
//       ${users[0].map((user) => `<li>${user.uuid}</li>`).join("")}
//     </ul>
//   </div>`;

//   const tabs = `
//   <button id="locale">locale</button>
//   <button id="socket">socket</button>
//   <button id="publisher">publisher</button>
//   <button id="space">space</button>
//   <button id="channel">channel</button>
//   <button id="user">user</button>
//   `;
//   panel.innerHTML = tabs + replaces[indexKey];
// };

// sse.onerror = (err) => {
//   console.log(err);
// };
/* SSE Settings */
