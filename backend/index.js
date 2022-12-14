import dotenv from "dotenv";
import path from "node:path";
import express from "express";
import cors from "cors";
import multer from "multer";
import logger from "./src/middleware/logger.js";
import queryController from "./src/controller/query.controller.js";

const app = express();
const formDataMiddleWare = multer();

const mode = process.env.NODE_ENV;
const __dirname = path.resolve();

dotenv.config({
  path: path.join(__dirname, `.env`),
});

dotenv.config({
  path: path.join(__dirname, `.env.${mode}`),
});

const host = process.env.HOST;
const port = process.env.PORT;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(formDataMiddleWare.any());

app.use(logger);
app.use("/query", queryController);

app.listen(port, () => {
  console.log("listening on port " + port);
});
