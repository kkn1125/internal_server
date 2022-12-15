import { convertRegionName, dev } from "../../../frontend/src/utils/tools.js";
import { sql } from "../database/mariadb.js";
import Query from "../models/Query.js";

const options = {
  limit: {
    locales: 2,
    pool_sockets: 2,
    pool_publishers: 2,
    spaces: 2,
    channels: 2,
    users: 2,
  },
};

Query.attach = async (req, res, next) => {
  const data = req.body;
  // dev("유저에게 받음").log(data);

  // const isLocale = await sql
  //   .promise()
  //   .query(
  //     `SELECT * FROM locales WHERE region LIKE "${convertRegionName(
  //       data.locale
  //     )}%"`
  //   );
  // dev.log(isLocale);
  const [region] = await sql
    .promise()
    .query(
      `SELECT id, COUNT(*) AS count FROM locales WHERE region LIKE "${convertRegionName(
        data.locale
      )}%"`
    );

  if (region[0].count === 0) {
    await sql
      .promise()
      .query(`INSERT INTO locales (region, limit_amount) VALUES (?, ?)`, [
        convertRegionName(data.locale) + (region[0].count + 1),
        options.limit.locales,
      ]);
  }

  const [createUser] = await sql
    .promise()
    .query(
      `INSERT INTO users (uuid, email, password, nickname) VALUES (?, ?, ?, ?)`,
      [data.uuid, "", "", ""]
    );
  dev.alias("User Insert Id").log(createUser.insertId);

  const observers = {
    space: {
      target: null,
      is_full: true,
    },
    channel: {
      target: null,
      is_full: true,
    },
  };

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
      `INSERT INTO channels (name, limit_amount)
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
      `INSERT INTO spaces (name, volume, owner, limit_amount)
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
        `INSERT INTO allocation (space_id, channel_id, user_id, type)
      VALUES (?, ?, ?, ?)`,
        [alloc.space_id, alloc.channel_id, createUser.insertId, "viewer"]
      );
      isEmpty = true;
      break;
    }
  }

  if (!isEmpty) {
    await sql.promise().query(
      `INSERT INTO allocation (space_id, channel_id, user_id, type)
      VALUES (?, ?, ?, ?)`,
      [
        observers.space.target,
        observers.channel.target,
        createUser.insertId,
        "viewer",
      ]
    );
  }

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
