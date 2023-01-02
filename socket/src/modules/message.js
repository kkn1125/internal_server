const axios = require("axios");
const { Message } = require("protobufjs");
const {
  backpressure,
  apiHost,
  apiPort,
  decoder,
  relay,
} = require("../globals/variables");
const { queryService } = require("../services/query.service");

async function sendMessage(ws, data) {
  try {
    await relay.client.get(ws).write(data);
  } catch (e) {
    console.log("error!", e);
  }
}

module.exports = async (ws, message, isBinary) => {
  /* Ok is false if backpressure was built up, wait for drain */
  if (isBinary) {
    const locationJson = Message.decode(new Uint8Array(message)).toJSON();
    // console.log(locationJson);
    try {
      await queryService.updateLocation({
        pk: ws.user.pk,
        space: ws.space.pk,
        channel: ws.channel.pk,
        pox: locationJson.pox,
        poy: locationJson.poy,
        poz: locationJson.poz,
        roy: locationJson.roy,
      });
      if (ws.getBufferedAmount() < backpressure) {
        await sendMessage(
          ws,
          JSON.stringify({
            type: "locations",
            target: `${ws.space.pk}-${ws.channel.pk}`,
            locationJson,
          })
        );
      }
    } catch (e) {
      // console.log('ws invalid', e);
    }
  } else {
    const strings = decoder.decode(message);
    const json = JSON.parse(strings);
    if (json.type === "login") {
      axios
        .post(`http://${apiHost}:${apiPort}/query/login`, {
          pk: ws.user.pk,
          nickname: json.nickname,
          password: json.password,
          pox: json.pox,
          poy: json.poy,
          poz: json.poz,
          roy: json.roy,
        })
        .then(async (result) => {
          const { data } = result;
          ws.send(JSON.stringify(data));
          if (ws.getBufferedAmount() < backpressure) {
            await sendMessage(
              ws,
              JSON.stringify({
                type: "players",
                target: `${ws.space.pk}-${ws.channel.pk}`,
                pk: ws.user.pk,
                players: data.players,
              })
            );
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }
};
