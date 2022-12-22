import dbConfig from "./maria.conf.js";
import maria from "mysql2";

// FIXED: const에서 let으로 변경
let mariaConnection = null;
let start = new Date();

const connectionHandler = () => {
  // 재귀 함수 실행 시 변수 재정의
  mariaConnection = maria.createConnection(dbConfig);

  mariaConnection.connect((error) => {
    start = new Date();
    // if (error) throw error;
    mariaConnection.on("error", (errorEvent) => {
      try {
        if (errorEvent.code === "PROTOCOL_CONNECTION_LOST") {
          let end = new Date();
          console.log("종료될때까지 시간", end - start);
          mariaConnection.destroy();
          setInterval(connectionHandler, 5000);
        } else {
          throw err;
        }
      } catch (e) {
        console.log(e.message);
        setInterval(connectionHandler, 5000);
      }
    });
    console.debug("MariaDB is Connected!");
  });

  return mariaConnection;
};

/**
 * Database Ping Check 완료
 */
let time = 0;
function keepAlive() {
  // NOTICE: mariadb.js 데이터베이스 유지 위한 ping 보내기 / 김경남 EM
  // console.log(":: ping check ::");
  if (mariaConnection) {
    mariaConnection.ping((err) => {
      if (err) {
        connectionHandler();
      }
      // console.log(err);
      time += 5000;
      // console.log("current:", time / 1000, "s / Max:", 600, "s");
    });
  }
}
setInterval(keepAlive, 5000);

mariaConnection = connectionHandler(); // NOTICE: mariadb.js 커넥션 유지 / 김경남 EM

export { mariaConnection as sql };
