import { convertRegionName, dev } from "../../../frontend/src/utils/tools.js";
import { sql } from "../database/mariadb.js";
import Query from "../models/Query.js";

Query.attach = async (req, res, next) => {
  const data = req.body;
  dev.alias("유저에게 받음").log(data);

  const isLocale = await sql
    .promise()
    .query(
      `SELECT * FROM locales WHERE region LIKE "${convertRegionName(
        data.locale
      )}%"`
    );
  dev.log(isLocale);

  res.status(200).json(data);
};

Query.login = async (req, res, next) => {
  const data = await sql.promise().query(`SELECT 1`);
  console.log(data);
};

Query.logout = async (req, res, next) => {
  const data = await sql.promise().query(`SELECT 1`);
  console.log(data);
};

const queryService = Query;

export default queryService;
