import dotenv from "dotenv";
import path from "node:path";
import express from "express";
import cors from "cors";
import multer from "multer";
import logger from "./src/middleware/logger.js";
import queryController from "./src/controller/query.controller.js";
import SSE from "sse";
import queryService from "./src/services/query.service.js";
// import queryService from "../../zeromq_nebula/proxyServer/src/services/query.service.js";
// import { exec } from "child_process";

const app = express();
const formDataMiddleWare = multer();

const mode = process.env.NODE_ENV;
const MODE = process.env.MODE;
const __dirname = path.resolve();

dotenv.config({
  path: path.join(__dirname, `.env.${mode}.${MODE}`),
});

const host = process.env.HOST;
const port = process.env.PORT;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(formDataMiddleWare.any());

// app.use(logger);
app.use("/query", queryController);

app.get("/sse", (req, res, next) => {});

const server = app.listen(port, () => {
  console.log("listening on port " + port);
});

// const sse = new SSE(server);

// sse.on("connection", (client) => {
//   setInterval(async () => {
//     const locales = await queryService.findLocales();
//     const sockets = await queryService.findPoolSockets();
//     const publishers = await queryService.findPoolPublishers();
//     const spaces = await queryService.findSpaces();
//     const channels = await queryService.findChannels();
//     const users = await queryService.findUsers();
//     client.send(
//       JSON.stringify({
//         locales,
//         sockets,
//         publishers,
//         spaces,
//         channels,
//         users,
//       })
//     );
//   }, 1000);
// });
