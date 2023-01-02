const axios = require("axios");
const { relay, apiHost, apiPort, sockets } = require("../globals/variables");

module.exports = (ws, code, message) => {
  console.log("WebSocket closed");
  console.log(ws.user.pk);
  sockets.delete(ws);
  axios
    .post(`http://${apiHost}:${apiPort}/query/logout`, {
      pk: ws.user.pk,
    })
    .then(async (result) => {
      const { data } = result;
      await sendMessage(
        ws,
        JSON.stringify({
          type: "logout",
          target: `${ws.space.pk}-${ws.channel.pk}`,
          players: data.players,
        })
      );
      // }
      relay.client.destroy();
    })
    .catch((err) => {});
};
