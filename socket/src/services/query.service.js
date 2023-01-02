const { convertRegionName, dev } = require("../utils/tools.js");
const { sql } = require("../database/mariadb.js");
const Query = require("../models/Query.js");

Query.updateLocation = async (req, res, next) => {
  try {
    const { pox, poy, poz, roy, pk, channel, space } = req;
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
  } catch (e) {
    console.log(e);
  }
};

/* upgrade intial informations */
const getUser = (uuid) =>
  sql.promise().query(
    `SELECT
    id AS pk,
    uuid,
    email,
    nickname
  FROM users
  WHERE deletion = 0
  AND uuid = ?`,
    [uuid]
  );

const getSpace = (pk) =>
  sql.promise().query(
    `SELECT
    spaces.id AS pk,
    spaces.name,
    spaces.volume,
    spaces.owner,
    spaces.limit_amount
  FROM spaces
  LEFT JOIN allocation
  ON allocation.space_id = spaces.id
  LEFT JOIN users
  ON users.id = allocation.user_id
  WHERE users.id = ?`,
    [pk]
  );
const getChannel = (pk) =>
  sql.promise().query(
    `SELECT
    channels.id AS pk,
    channels.name,
    channels.limit_amount
  FROM channels
  LEFT JOIN allocation
  ON allocation.channel_id = channels.id
  LEFT JOIN users
  ON users.id = allocation.user_id
  WHERE users.id = ?`,
    [pk]
  );
const getLocale = (pk) =>
  sql.promise().query(
    `SELECT
    locales.id AS pk,
    locales.region,
    locales.limit_amount
  FROM locales
  LEFT JOIN connection
  ON connection.locale_id = locales.id
  LEFT JOIN users
  ON users.id = connection.user_id
  WHERE users.id = ?`,
    [pk]
  );
const getSocket = (pk) =>
  sql.promise().query(
    `SELECT
    pool_sockets.id AS pk,
    pool_sockets.ip,
    pool_sockets.port,
    pool_sockets.cpu_usage,
    pool_sockets.memory_usage,
    pool_sockets.is_live,
    pool_sockets.limit_amount
  FROM pool_sockets
  LEFT JOIN connection
  ON connection.socket_id = pool_sockets.id
  LEFT JOIN users
  ON users.id = connection.user_id
  WHERE users.id = ?`,
    [pk]
  );
const getPulisher = (pk) =>
  sql.promise().query(
    `SELECT
    pool_publishers.id AS pk,
    pool_publishers.ip,
    pool_publishers.port,
    pool_publishers.is_live,
    pool_publishers.limit_amount
  FROM pool_publishers
  LEFT JOIN connection
  ON connection.publisher_id = pool_publishers.id
  LEFT JOIN users
  ON users.id = connection.user_id
  WHERE users.id = ?`,
    [pk]
  );
const getConnection = (pk) =>
  sql.promise().query(
    `SELECT
    user_id,
    socket_id,
    publisher_id,
    locale_id,
    connected
  FROM connection
  WHERE user_id = ?`,
    [pk]
  );
const getAllocation = (pk) =>
  sql.promise().query(
    `SELECT
    user_id,
    space_id,
    channel_id,
    type,
    status
  FROM allocation
  WHERE user_id = ?`,
    [pk]
  );

const queryService = Query;

module.exports = {
  queryService,
  getUser,
  getSpace,
  getChannel,
  getLocale,
  getSocket,
  getPulisher,
  getConnection,
  getAllocation,
};
