const { convertRegionName, dev } = require("../utils/tools.js");
const { sql } = require("../database/mariadb.js");
const Query = require("../models/Query.js");

Query.autoConnectServers = async () => {
  const [publishers] = await sql
    .promise()
    .query(`SELECT * FROM pool_publishers`);

  return publishers;
};

const queryService = Query;

module.exports = queryService;
