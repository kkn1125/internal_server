const {
  getAllocation,
  getChannel,
  getConnection,
  getLocale,
  getPulisher,
  getSocket,
  getSpace,
  getUser,
} = require("../services/query.service");
const { dev } = require("../utils/tools");

module.exports = async (res, req, context) => {
  /* Keep track of abortions */
  const upgradeAborted = { aborted: false };
  console.log(
    "An Http connection wants to become WebSocket, URL: " + req.getUrl() + "!"
  );

  const url = req.getUrl();
  const secWebSocketKey = req.getHeader("sec-websocket-key");
  const secWebSocketProtocol = req.getHeader("sec-websocket-protocol");
  const secWebSocketExtensions = req.getHeader("sec-websocket-extensions");

  const q = req.getQuery("q");
  const json = {};
  try {
    Object.assign(json, JSON.parse(decodeURI(q)));
  } catch (e) {
    dev.alias("getQuery Error").log(e);
  }
  async function asyncUpgrade() {
    try {
      const [user] = await getUser(json.uuid);
      const userPk = user[0].pk;
      const [space] = await getSpace(userPk);
      const [channel] = await getChannel(userPk);
      const [locale] = await getLocale(userPk);
      const [socket] = await getSocket(userPk);
      const [pulisher] = await getPulisher(userPk);
      const [connection] = await getConnection(userPk);
      const [allocation] = await getAllocation(userPk);
      dev.alias("User informations").log(user);

      if (upgradeAborted.aborted) {
        console.log("Ouch! Client disconnected before we could upgrade it!");
        /* You must not upgrade now */
        return;
      }
      res.upgrade(
        {
          url,
          // db user info
          user: user[0],
          space: space[0],
          channel: channel[0],
          locale: locale[0],
          socket: socket[0],
          publisher: pulisher[0],
          connection: connection[0],
          allocation: allocation[0],
        },
        /* Spell these correctly */
        secWebSocketKey,
        secWebSocketProtocol,
        secWebSocketExtensions,
        context
      );
    } catch (e) {
      dev.alias("Upgrade error").log(e.message);
    }
  }
  asyncUpgrade();

  res.onAborted(() => {
    /* We can simply signal that we were aborted */
    upgradeAborted.aborted = true;
  });
  /* This immediately calls open handler, you must not use res after this call */
};
