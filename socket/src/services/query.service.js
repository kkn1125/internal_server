const { convertRegionName, dev } = require("../utils/tools.js");
const { sql } = require("../database/mariadb.js");
const Query = require("../models/Query.js");

Query.updateLocation = async (req, res, next) => {
  try {
    const { pox, poy, poz, roy, pk, channel, space } = req;
    // console.log(req);
    const [result] = await sql.promise().query(
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
    // console.log(result);
  } catch (e) {
    console.log(e);
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

const queryService = Query;

module.exports = queryService;
