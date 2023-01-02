import dotenv from "dotenv";
import path from "path";

const __dirname = path.resolve();
const mode = process.env.NODE_ENV;
const MODE = process.env.MODE;

if (mode === "development") {
  dotenv.config({
    path: path.join(__dirname, `.env`),
  });
  dotenv.config({
    path: path.join(__dirname, `.env.${mode}.${MODE}`),
  });
}

export default {
  cpu_usage: 80,
  memory_usage: 80,
  ip: {
    socket: process.env.SOCKET_HOST || "192.168.88.234",
    publisher: process.env.PUBLISHER_HOST || "192.168.88.234",
  },
  port: {
    socket: 10000,
    publisher: 20000,
  },
  limit: {
    locales: 1000,
    pool_sockets: 20,
    pool_publishers: 20,
    spaces: 5,
    channels: 1500,
    users: 50,
  },
};
