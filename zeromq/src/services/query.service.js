const { convertRegionName, dev } = require("../utils/tools.js");
const { sql } = require("../database/mariadb.js");
const Query = require("../models/Query.js");

Query.updateLocation = async (req, res, next) => {
  try {
    const { pox, poy, poz, roy, pk, channel, space } = req.body;
    await sql.promise().query(
      `UPDATE locations
    SET pox=?, poy=?, poz=?, roy=?
    WHERE
      user_id = ?
    AND
      channel_id = ?
    AND
      space_id = ?`,
      [pox, poy, poz, roy, pk, channel, space]
    );
  } catch (e) {
    // res.status(500).json({
    //   ok: false,
    // });
  }
};

Query.players = async (req, res, next) => {
  const data = req.body;

  const [userInfo] = await sql.promise().query(
    `SELECT space_id, channel_id, user_id
        FROM allocation
        WHERE user_id = (
          SELECT id
          FROM users
          WHERE uuid = ?
        )`,
    [data.uuid]
  );

  const [readPlayers] = await sql
    .promise()
    .query(playersQueries, [userInfo[0].space_id, userInfo[0].channel_id]);

  res.status(200).json({
    ok: true,
    players: readPlayers,
  });
};

Query.autoConnectServers = async () => {
  const [publishers] = await sql
    .promise()
    .query(`SELECT * FROM pool_publishers`);

  const [connections] = await sql.promise().query(`SELECT 
    pool_publishers.*, COUNT(*) AS publisher_count
  FROM
    connection
      LEFT JOIN
    pool_publishers ON pool_publishers.id = connection.publisher_id
  GROUP BY publisher_id`);

  return { publishers, connections };
};

const queryService = Query;

module.exports = queryService;
