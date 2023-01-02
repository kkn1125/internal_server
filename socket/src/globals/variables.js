const dotenv = require("dotenv");
const path = require("path");

const mode = process.env.NODE_ENV;
const MODE = process.env.MODE;
const backpressure = 2048;

if (mode === "development") {
  dotenv.config({
    path: path.join(__dirname, `.env`),
  });
  dotenv.config({
    path: path.join(__dirname, `.env.${mode}.${MODE}`),
  });
}

const host = process.env.HOST;
const port = Number(process.env.PORT) || 10000;
const apiHost = process.env.API_HOST;
const apiPort = Number(process.env.API_PORT) || 3000;
const PORT_GAP = Number(process.env.PORT_GAP);
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const users = new Map();
const relay = {
  client: new Map(),
  subscriber: new Map(),
};

let sockets = new Map();

module.exports = {
  mode,
  MODE,
  users,
  relay,
  sockets,
  backpressure,
  encoder,
  decoder,
  host,
  port,
  apiHost,
  apiPort,
  PORT_GAP,
};
