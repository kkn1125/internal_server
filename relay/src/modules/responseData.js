const { pushSockets, connectedServer, relay } = require("../globals/variables");
const { dev } = require("../utils/tools");

function responseData(flag, data) {
  // console.log("현재 릴레이에서 데이터 받나?", data);
  try {
    if (flag === "server") {
      dev.alias("퍼블리셔-퍼블리셔 간 통신").log(flag + " flag");
      for (let i = 0; i < pushSockets.length; i++) {
        const tcp = pushSockets[i];
        tcp.write(data.subarray(6));
      }
    } else {
      dev.alias("소켓-퍼블리셔 간 통신").log("no flag");
      for (let i = 0; i < pushSockets.length; i++) {
        const tcp = pushSockets[i];
        tcp.write(data);
      }
      if (connectedServer.size > 0) {
        // 퍼블리셔 간 통신 위해 packet 앞단에 server키 추가
        const serverFlag = new TextEncoder().encode("server");
        const merge = new Uint8Array(serverFlag.byteLength + data.byteLength);
        merge.set(serverFlag);
        merge.set(data, serverFlag.byteLength);
        // 각 클라이언트에게 전파
        for (let i = 0; i < pushSockets.length; i++) {
          const tcp = pushSockets[i];
          tcp.write(data);
        }
        // 바인딩한 퍼블리셔에게 전파
        for (let cli of relay.broker.values()) {
          if (cli.write) {
            cli.write(merge);
          }
        }
      }
    }
  } catch (e) {
    console.log("from server cli", e);
  }
}

module.exports = { responseData };
