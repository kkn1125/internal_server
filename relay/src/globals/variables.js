const dotenv = require("dotenv");
const path = require("path");
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
const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_PORT = Number(process.env.SERVER_PORT);
const PORT_GAP = Number(process.env.PORT_GAP);
const IP_ADDRESS = process.env.IP_ADDRESS;
const connectedServer = new Map();

const relay = {
  server: null,
  pusher: null,
  broker: new Map(),
};
const decoder = new TextDecoder();
let pushSockets = [];

module.exports = {
  mode,
  MODE,
  SERVER_HOST,
  SERVER_PORT,
  PORT_GAP,
  IP_ADDRESS,
  connectedServer,
  relay,
  decoder,
  pushSockets,
};
