const path = require("path");
const dotenv = require("dotenv");

const mode = process.env.NODE_ENV;
const MODE = process.env.MODE;

if (mode === "development") {
  dotenv.config({
    path: path.join(path.resolve(), ".env"),
  });
  dotenv.config({
    path: path.join(path.resolve(), `.env.${mode}.${MODE}`),
  });
}

// mariadb informations
const {
  MARIADB_PORT,
  MARIADB_HOST,
  MARIADB_USERNAME,
  MARIADB_PW,
  MARIADB_DATABASE,
} = process.env;

module.exports = {
  host: MARIADB_HOST,
  port: Number(MARIADB_PORT),
  user: MARIADB_USERNAME,
  password: String(MARIADB_PW),
  database: MARIADB_DATABASE,
};
