import { convertRegionName, dev } from "../utils/tools.js";
import { sql } from "../database/mariadb.js";
import Query from "../models/Query.js";
import dotenv from "dotenv";
import path from "path";

const MODE = process.env.MODE;
if (MODE === "local") {
  dotenv.config({
    path: path.join(__dirname, `.env.${MODE}`),
  });
} else if (MODE === "physic") {
  dotenv.config({
    path: path.join(__dirname, `.env.${MODE}`),
  });
}

const options = {
  cpu_usage: 80,
  memory_usage: 80,
  ip: {
    socket: process.env.SOCKET_HOST||"192.168.254.16",
    publisher: process.env.PUBLISHER_HOST||"192.168.254.16",
  },
  port: {
    socket: 10000,
    publisher: 20000,
  },
  limit: {
    locales: 1000,
    pool_sockets: 50,
    pool_publishers: 1000,
    spaces: 5,
    channels: 50,
    users: 50,
  },
};

const playersQueries = `SELECT 
  users.id,
  users.uuid,
  users.nickname,
  locations.space_id,
  locations.channel_id,
  locations.pox,
  locations.poy,
  locations.poz,
  locations.roy
FROM
  allocation
    LEFT JOIN
  users ON allocation.user_id = users.id
    LEFT JOIN
  locations ON allocation.user_id = locations.user_id
WHERE
  allocation.space_id = ?
AND 
  allocation.channel_id = ?
AND allocation.type = 'player'`;

async function autoInsertUser(data, locale, dataMap) {
  try {
    const observers = {
      locale: { target: null, is_full: true },
      socket: { target: null, is_full: true },
      publisher: { target: null, is_full: true },
      space: {
        target: null,
        is_full: true,
      },
      channel: {
        target: null,
        is_full: true,
      },
    };

    const [readUser] = await sql
      .promise()
      .query(`SHOW TABLE STATUS WHERE name = 'users'`);
    const userPk = readUser[0].Auto_increment || 0;
    const [createUser] = await sql.promise().query(
      `INSERT INTO users
      (uuid, email, password, nickname)
      VALUES (?, ?, ?, ?)`,
      [data.uuid, "", "", `guest${userPk}`]
    );
    // dev.alias("User Insert Id").log(createUser.insertId);
    console.log(userPk);
    console.log(createUser.insertId);
    dataMap.user = Object.assign(dataMap.user || {}, {
      pk: createUser.insertId,
      uuid: data.uuid,
      email: "",
      password: "",
      nickname: `guest${userPk}`,
    });

    /* 풀 소켓, 퍼블리셔 존재 여부 조회 시작 */
    const [isExistsSocket] = await sql.promise().query(
      `SELECT
      pool_sockets.*,
      COUNT(*) AS count,
      COUNT(*) >= pool_sockets.limit_amount AS is_full
    FROM pool_sockets
    LEFT JOIN connection
    ON pool_sockets.id = connection.socket_id
    LEFT JOIN users
    ON connection.user_id = users.id
    WHERE connection.user_id = users.id
    GROUP BY connection.socket_id`
    );

    for (let i = 0; i < isExistsSocket.length; i++) {
      const socket = isExistsSocket[i];
      if (socket.limit_amount > socket.count) {
        observers.socket.is_full = false;
        observers.socket.target = socket.id;
        dataMap.socket = Object.assign(dataMap.socket || {}, {
          pk: socket.id,
          ip: socket.ip,
          port: socket.port,
        });
        break;
      }
    }

    if (observers.socket.is_full) {
      dev
        .alias("socket create")
        .log((isExistsSocket[isExistsSocket.length - 1]?.id || 0) + 1);
      const [readSocket] = await sql
        .promise()
        .query(`SHOW TABLE STATUS WHERE name = 'pool_sockets'`);
      const socketPk = readSocket[0].Auto_increment;
      await sql.promise().query(
        `INSERT INTO pool_sockets
      (ip, port, cpu_usage, memory_usage, is_live, limit_amount)
      VALUES (?, ?, ?, ?, ?, ?)`,
        [
          options.ip.socket,
          options.port.socket + socketPk - 1,
          options.cpu_usage,
          options.memory_usage,
          true,
          options.limit.pool_sockets,
        ]
      );
      observers.socket.target =
        (isExistsSocket[isExistsSocket.length - 1]?.id || 0) + 1;
      dataMap.socket = Object.assign(dataMap.socket || {}, {
        pk: (isExistsSocket[isExistsSocket.length - 1]?.id || 0) + 1,
        ip: options.ip.socket,
        port: options.port.socket + socketPk - 1,
      });
    }

    const [isExistsPublisher] = await sql.promise().query(
      `SELECT
        pool_publishers.*,
        COUNT(*) AS count,
        COUNT(*) >= pool_publishers.limit_amount AS is_full
      FROM pool_publishers
      LEFT JOIN connection
      ON pool_publishers.id = connection.publisher_id
      LEFT JOIN users
      ON connection.user_id = users.id
      WHERE connection.user_id = users.id
      GROUP BY connection.publisher_id`
    );

    for (let i = 0; i < isExistsPublisher.length; i++) {
      const publisher = isExistsPublisher[i];
      if (publisher.limit_amount > publisher.count) {
        observers.publisher.is_full = false;
        observers.publisher.target = publisher.id;
        dataMap.publisher = Object.assign(dataMap.publisher || {}, {
          pk: publisher.id,
          ip: publisher.ip,
          port: publisher.port,
        });
      }
    }

    if (observers.publisher.is_full) {
      dev
        .alias("publisher create")
        .log((isExistsPublisher[isExistsPublisher.length - 1]?.id || 0) + 1);
      const [readPublisher] = await sql
        .promise()
        .query(`SHOW TABLE STATUS WHERE name = 'pool_publishers'`);
      const publisherPk = readPublisher[0].Auto_increment;
      await sql.promise().query(
        `INSERT INTO pool_publishers
      (ip, port, is_live, limit_amount)
      VALUES (?, ?, ?, ?)`,
        [
          options.ip.publisher,
          options.port.publisher + publisherPk - 1,
          true,
          options.limit.pool_publishers,
        ]
      );
      observers.publisher.target =
        (isExistsPublisher[isExistsPublisher.length - 1]?.id || 0) + 1;
      dataMap.publisher = Object.assign(dataMap.publisher || {}, {
        pk: (isExistsPublisher[isExistsPublisher.length - 1]?.id || 0) + 1,
        ip: options.ip.publisher,
        port: options.port.publisher + publisherPk - 1,
      });
    }
    /* 풀 소켓, 퍼블리셔 존재 여부 조회 끝 */

    /* 비어있는 풀 소켓, 퍼블리셔 조회 시작 */
    // TODO: 여기 고쳐야 함 - 빈 소켓, 퍼블 찾아서
    const [findEmptyPool] = await sql.promise().query(
      `SELECT
      DISTINCT(socket_id),
      publisher_id,
      COUNT(publisher_id) AS free
    FROM connection
    GROUP BY socket_id, publisher_id`
    );

    let isEmptyPool = false;

    for (let i = 0; i < findEmptyPool.length; i++) {
      const connection = findEmptyPool[i];
      if (connection.free < options.limit.locales) {
        await sql.promise().query(
          `INSERT INTO connection
        (socket_id, publisher_id, locale_id, user_id, connected)
        VALUES (?, ?, ?, ?, ?)`,
          [
            observers.socket.target,
            observers.publisher.target,
            locale,
            createUser.insertId,
            true,
          ]
        );
        isEmptyPool = true;
        dataMap.connection = Object.assign(dataMap.connection || {}, {
          socket_id: observers.socket.target,
          publisher_id: observers.publisher.target,
          locale_id: locale,
          user_id: createUser.insertId,
        });
        break;
      }
    }

    if (!isEmptyPool) {
      await sql.promise().query(
        `INSERT INTO connection
      (socket_id, publisher_id, locale_id, user_id, connected)
      VALUES (?, ?, ?, ?, ?)`,
        [
          observers.socket.target,
          observers.publisher.target,
          locale,
          createUser.insertId,
          true,
        ]
      );
      dataMap.connection = Object.assign(dataMap.connection || {}, {
        socket_id: observers.socket.target,
        publisher_id: observers.publisher.target,
        locale_id: locale,
        user_id: createUser.insertId,
        connected: true,
      });
    }
    /* 비어있는 풀 소켓, 퍼블리셔 조회 끝 */

    /* 채널, 공간 존재 여부 조회 시작 */
    const [readChannel] = await sql.promise().query(`
    SHOW TABLE STATUS WHERE name = 'channels'
  `);
    const channelIncrement = readChannel[0].Auto_increment;
    const [isExistsChannel] = await sql.promise().query(
      `SELECT 
      channels.*,
      COUNT(*) AS count,
      COUNT(*) >= channels.limit_amount AS is_full
    FROM
      channels
        LEFT JOIN
      allocation ON channels.id = allocation.channel_id
        LEFT JOIN
      users ON allocation.user_id = users.id
    WHERE
      allocation.user_id = users.id
    GROUP BY
      channels.id`
    );

    const [isExistsSpace] = await sql.promise().query(
      `SELECT
      spaces.*,
      channels.limit_amount as c_limit,
      space_id AS id,
      COUNT(DISTINCT(channel_id)) AS count,
      COUNT(user_id) AS user_count
    FROM allocation
    LEFT JOIN spaces
    ON spaces.id = allocation.space_id
    LEFT JOIN channels
    ON channels.id = allocation.channel_id
    GROUP BY space_id
    ORDER BY space_id`
    );

    for (let i = 0; i < isExistsChannel.length; i++) {
      const channel = isExistsChannel[i];
      if (channel.limit_amount > channel.count) {
        observers.channel.is_full = false;
        observers.channel.target = channel.id;
        dataMap.channel = Object.assign(dataMap.channel || {}, {
          pk: channel.id,
        });
      }
    }

    if (observers.channel.is_full) {
      dev.alias("channel create").log(channelIncrement || 0);
      await sql.promise().query(
        `INSERT INTO channels
      (name, limit_amount)
      VALUES (?, ?)`,
        [`channel${channelIncrement || 0}`, options.limit.channels]
      );
      observers.channel.target = channelIncrement || 0;
      dataMap.channel = Object.assign(dataMap.channel || {}, {
        pk: channelIncrement || 0,
        name: `channel${channelIncrement || 0}`,
        limit_amount: options.limit.channels,
      });
    }

    for (let i = 0; i < isExistsSpace.length; i++) {
      const space = isExistsSpace[i];
      if (
        space.limit_amount > space.count ||
        space.c_limit > space.user_count / space.count
      ) {
        observers.space.is_full = false;
        observers.space.target = space.id;

        dataMap.space = Object.assign(dataMap.space || {}, {
          pk: space.id,
        });
      }
    }

    if (observers.space.is_full) {
      dev
        .alias("space create")
        .log((isExistsSpace[isExistsSpace.length - 1]?.id || 0) + 1);
      await sql.promise().query(
        `INSERT INTO spaces
      (name, volume, owner, limit_amount)
      VALUES (?, ?, ?, ?)`,
        [
          `space${(isExistsSpace[isExistsSpace.length - 1]?.id || 0) + 1}`,
          0,
          "admin",
          options.limit.spaces,
        ]
      );
      observers.space.target =
        (isExistsSpace[isExistsSpace.length - 1]?.id || 0) + 1;
      dataMap.space = Object.assign(dataMap.space || {}, {
        pk: (isExistsSpace[isExistsSpace.length - 1]?.id || 0) + 1,
        name: `space${(isExistsSpace[isExistsSpace.length - 1]?.id || 0) + 1}`,
        limit_amount: options.limit.spaces,
      });
    }

    const [findEmpty] = await sql.promise().query(
      `SELECT
      DISTINCT(space_id),
      channel_id,
      COUNT(channel_id) AS free
    FROM allocation
    GROUP BY space_id, channel_id`
    );
    let isEmpty = false;

    for (let i = 0; i < findEmpty.length; i++) {
      const alloc = findEmpty[i];
      if (alloc.free < options.limit.channels) {
        await sql.promise().query(
          `INSERT INTO allocation
        (space_id, channel_id, user_id, type)
        VALUES (?, ?, ?, ?)`,
          [alloc.space_id, alloc.channel_id, createUser.insertId, "viewer"]
        );
        isEmpty = true;
        dataMap.allocation = Object.assign(dataMap.allocation || {}, {
          space_id: alloc.space_id,
          channel_id: alloc.channel_id,
          user_id: alloc.user_id,
          type: "viewer",
        });
        break;
      }
    }

    if (!isEmpty) {
      await sql.promise().query(
        `INSERT INTO allocation
      (space_id, channel_id, user_id, type)
      VALUES (?, ?, ?, ?)`,
        [
          observers.space.target,
          observers.channel.target,
          createUser.insertId,
          "viewer",
        ]
      );
      dataMap.allocation = Object.assign(dataMap.allocation || {}, {
        space_id: observers.space.target,
        channel_id: observers.channel.target,
        user_id: createUser.insertId,
        type: "viewer",
      });
    }
    /* 채널, 공간 존재 여부 조회 끝 */
  } catch (e) {}
}

Query.attach = async (req, res, next) => {
  try {
    const data = req.body;
    const dataMap = {};
    /* copy user request data */
    dataMap.user = Object.assign(dataMap.user || {}, {
      uuid: data.uuid,
      email: data.email,
    });

    const [region] = await sql.promise().query(
      `SELECT 
        locales.*,
        COUNT(DISTINCT (pool_sockets.id)) AS socket_count,
        COUNT(users.id) AS user_count
    FROM
        locales
            LEFT JOIN
        connection ON locales.id = connection.locale_id
            LEFT JOIN
        pool_sockets ON connection.socket_id = pool_sockets.id
            LEFT JOIN
        users ON users.id = connection.user_id
    WHERE
        locales.region LIKE '${convertRegionName(data.locale)}%'
    GROUP BY locales.id`
    );
    let target = null;
    let is_full = true;

    for (let i = 0; i < region.length; i++) {
      const locale = region[i];
      if (
        locale.socket_count < locale.limit_amount ||
        locale.limit_amount > locale.user_count / locale.socket_count
      ) {
        is_full = false;
        target = locale.id;
        dataMap.locale = Object.assign(dataMap.locale || {}, {
          pk: locale.id,
          region: convertRegionName(data.locale) + locale.id,
          limit_amount: locale.limit_amount,
        });
      }
    }

    if (is_full) {
      dev.alias("locale create").log((region[region.length - 1]?.id || 0) + 1);
      const [createLocale] = await sql.promise().query(
        `INSERT INTO locales
      (region, limit_amount)
      VALUES (?, ?)`,
        [
          convertRegionName(data.locale) +
            ((region[region.length - 1]?.id || 0) + 1),
          options.limit.locales,
        ]
      );
      target = (region[region.length - 1]?.id || 0) + 1;
      dataMap.locale = Object.assign(dataMap.locale || {}, {
        pk: createLocale.insertId,
        region:
          convertRegionName(data.locale) +
          ((region[region.length - 1]?.id || 0) + 1),
        limit_amount: options.limit.locales,
      });
    }

    await autoInsertUser(data, target, dataMap);

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
    // console.log(userInfo);
    dataMap.user.pk = userInfo[0].user_id;
    const [readPlayers] =
      userInfo.length === 0
        ? [[]]
        : await sql
            .promise()
            .query(playersQueries, [
              userInfo[0].space_id,
              userInfo[0].channel_id,
            ]);
    // console.log(dataMap);
    res.status(200).json(
      // dataMap
      Object.assign(dataMap, {
        players: readPlayers,
      })
    );
  } catch (e) {
    res.status(500).json({
      ok: false,
    });
  }
};

Query.login = async (req, res, next) => {
  try {
    const data = req.body;
    const { pk, nickname, password, pox, poy, poz, roy } = data;
    // console.log(pk);
    const [allocationInfo] = await sql.promise().query(
      `SELECT 
    space_id, channel_id
    FROM
    allocation
    WHERE
    user_id = ?`,
      [pk]
    );

    const { space_id, channel_id } = allocationInfo[0] || {};

    await sql.promise().query(
      `UPDATE users
      SET nickname=?, password=?
      WHERE id=?`,
      [nickname, password, pk]
    );

    await sql.promise().query(
      `UPDATE allocation
    SET type='player'
    WHERE user_id = ? AND space_id = ? AND channel_id = ?`,
      [pk, space_id, channel_id]
    );

    await sql.promise().query(
      `INSERT INTO locations (space_id, channel_id, user_id, pox, poy, poz, roy)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [space_id, channel_id, pk, pox, poy, poz, roy]
    );

    const [readPlayers] = await sql
      .promise()
      .query(
        `SELECT * FROM locations LEFT JOIN users ON users.id = locations.user_id WHERE users.id = ?`,
        [pk]
      );
    // console.log("login players", readPlayers);
    // const data = await sql.promise().query(`SELECT 1`);
    res.status(200).json({
      ok: true,
      pk: pk,
      type: "login",
      players: readPlayers,
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
    });
  }
};

Query.logout = async (req, res, next) => {
  try {
    const data = req.body;
    const [userInfo] = await sql.promise().query(
      `SELECT space_id, channel_id, user_id
      FROM allocation
      WHERE user_id = ?`,
      [data.pk]
    );

    await sql.promise().query(`DELETE FROM users WHERE id = ?`, [data.pk]);

    const [readPlayers] =
      userInfo.length === 0
        ? [[]]
        : await sql
            .promise()
            .query(playersQueries, [
              userInfo[0].space_id,
              userInfo[0].channel_id,
            ]);
    // const data = await sql.promise().query(`SELECT 1`);
    console.log("logout players", readPlayers);
    res.status(200).json({
      ok: true,
      players: readPlayers,
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
    });
  }
};

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

    // const [userInfo] = await sql.promise().query(
    //   `SELECT space_id, channel_id, user_id
    //   FROM allocation
    //   WHERE user_id = ?`,
    //   [pk]
    // );

    // const [readPlayers] =
    //   userInfo.length === 0
    //     ? [[]]
    //     : await sql.promise().query(playersQueries, [space, channel]);

    res.status(200).json({
      ok: true,
      // players: readPlayers,
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
    });
  }
};

// Query.players = async (req, res, next) => {
//   const data = req.body;
//   // console.log(data);

//   const [userInfo] = await sql.promise().query(
//     `SELECT space_id, channel_id, user_id
//       FROM allocation
//       WHERE user_id = (
//         SELECT id
//         FROM users
//         WHERE uuid = ?
//       )`,
//     [data.uuid]
//   );

//   const [readPlayers] = await sql
//     .promise()
//     .query(playersQueries, [userInfo[0].space_id, userInfo[0].channel_id]);

//   res.status(200).json({
//     ok: true,
//     players: readPlayers,
//   });
// };

/* 로깅용 */
Query.findLocales = async (req, res, next) => {
  return await sql.promise().query(`SELECT * FROM locales`);
};

Query.findPoolSockets = async (req, res, next) => {
  return await sql.promise().query(`SELECT * FROM pool_sockets`);
};

Query.findPoolPublishers = async (req, res, next) => {
  return await sql.promise().query(`SELECT * FROM pool_publishers`);
};

Query.findSpaces = async (req, res, next) => {
  return await sql.promise().query(`SELECT * FROM spaces`);
};

Query.findChannels = async (req, res, next) => {
  return await sql.promise().query(`SELECT * FROM channels`);
};

Query.findUsers = async (req, res, next) => {
  return await sql.promise().query(`SELECT * FROM users`);
};

const queryService = Query;

export default queryService;
