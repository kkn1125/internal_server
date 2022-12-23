import path from "path";
import dotenv from "dotenv";

const mode = process.env.NODE_ENV;
const MODE = process.env.MODE;
const __dirname = path.resolve();

dotenv.config({
  path: path.join(__dirname, `.env.${mode}.${MODE}`),
});

// mariadb informations
const {
  MARIADB_PORT,
  MARIADB_HOST,
  MARIADB_USERNAME,
  MARIADB_PW,
  MARIADB_DATABASE,
} = process.env;

export default {
  host: MARIADB_HOST,
  port: Number(MARIADB_PORT),
  user: MARIADB_USERNAME,
  password: String(MARIADB_PW),
  database: MARIADB_DATABASE,
};
