import { convertRegionName, dev } from "../utils/tools.js";
import { sql } from "../database/mariadb.js";
import Query from "../models/Query.js";

const options = {
  cpu_usage: 80,
  memory_usage: 80,
  ip: {
    socket: "192.168.254.16",
    publisher: "192.168.254.16",
  },
  port: {
    socket: 10000,
    publisher: 20000,
  },
  limit: {
    locales: 2,
    pool_sockets: 2,
    pool_publishers: 2,
    spaces: 2,
    channels: 2,
    users: 2,
  },
};

async function autoInsertUser(data, locale) {
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

  const [createUser] = await sql.promise().query(
    `INSERT INTO users
      (uuid, email, password, nickname)
      VALUES (?, ?, ?, ?)`,
    [data.uuid, "", "", ""]
  );
  dev.alias("User Insert Id").log(createUser.insertId);

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
    }
  }

  if (observers.socket.is_full) {
    dev
      .alias("socket create")
      .log((isExistsSocket[isExistsSocket.length - 1]?.id || 0) + 1);
    await sql.promise().query(
      `INSERT INTO pool_sockets
      (ip, port, cpu_usage, memory_usage, is_live, limit_amount)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        options.ip.socket,
        options.port.socket,
        options.cpu_usage,
        options.memory_usage,
        true,
        options.limit.pool_sockets,
      ]
    );
    observers.socket.target =
      (isExistsSocket[isExistsSocket.length - 1]?.id || 0) + 1;
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
    }
  }

  if (observers.publisher.is_full) {
    dev
      .alias("publisher create")
      .log((isExistsPublisher[isExistsPublisher.length - 1]?.id || 0) + 1);
    await sql.promise().query(
      `INSERT INTO pool_publishers
      (ip, port, is_live, limit_amount)
      VALUES (?, ?, ?, ?)`,
      [
        options.ip.publisher,
        options.port.publisher,
        true,
        options.limit.pool_publishers,
      ]
    );
    observers.publisher.target =
      (isExistsPublisher[isExistsPublisher.length - 1]?.id || 0) + 1;
  }

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
  }

  const [isExistsChannel] = await sql.promise().query(
    `SELECT
      channels.*,
      COUNT(*) AS count,
      COUNT(*) >= channels.limit_amount AS is_full
    FROM channels
    LEFT JOIN allocation
    ON channels.id = allocation.channel_id
    LEFT JOIN users
    ON allocation.user_id = users.id
    WHERE allocation.user_id = users.id
    GROUP BY allocation.channel_id`
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
    }
  }

  if (observers.channel.is_full) {
    dev
      .alias("channel create")
      .log((isExistsChannel[isExistsChannel.length - 1]?.id || 0) + 1);
    await sql.promise().query(
      `INSERT INTO channels
      (name, limit_amount)
      VALUES (?, ?)`,
      [
        `channel${(isExistsChannel[isExistsChannel.length - 1]?.id || 0) + 1}`,
        options.limit.channels,
      ]
    );
    observers.channel.target =
      (isExistsChannel[isExistsChannel.length - 1]?.id || 0) + 1;
  }

  for (let i = 0; i < isExistsSpace.length; i++) {
    const space = isExistsSpace[i];
    if (
      space.limit_amount > space.count ||
      space.c_limit > space.user_count / space.count
    ) {
      observers.space.is_full = false;
      observers.space.target = space.id;
    }
  }

  if (observers.space.is_full) {
    dev
      .alias("channel create")
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
  }
}

Query.attach = async (req, res, next) => {
  const data = req.body;
  const [region] = await sql.promise().query(
    `SELECT locales.*, COUNT(*) AS count
    FROM locales
    LEFT JOIN connection
    ON locales.id = connection.locale_id
    WHERE region
    LIKE "${convertRegionName(data.locale)}%"
    GROUP BY locales.id`
  );
  let target = null;
  let is_full = true;

  for (let i = 0; i < region.length; i++) {
    const locale = region[i];
    if (locale.limit_amount > locale.count && region.length) {
      is_full = false;
      target = locale.id;
    }
  }

  if (is_full) {
    dev.alias("locale create").log((region[region.length - 1]?.id || 0) + 1);
    await sql.promise().query(
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
  }

  // if (region[0].count === 0) {
  //   const [createLocale] = await sql.promise().query(
  //     `INSERT INTO locales
  //     (region, limit_amount)
  //     VALUES (?, ?)`,
  //     [
  //       convertRegionName(data.locale) + (region[0].count + 1),
  //       options.limit.locales,
  //     ]
  //   );
  // }

  await autoInsertUser(data, target);

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
