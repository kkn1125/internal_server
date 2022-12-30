const axios = require("axios");
const { v4 } = require("uuid");
const protobuf = require("protobufjs");
const WebSocket = require("ws");

const game = {
  size: {
    user: {
      x: 30,
      y: 30,
    },
  },
  speed: 5,
};
const { Message, Field } = protobuf;
const attachUserData = {
  // uuid: v4(),
  // email: createEmail(),
  // locale: "ko-kr",
};

Field.d(1, "float", "required")(Message.prototype, "id");
Field.d(2, "float", "required")(Message.prototype, "pox");
Field.d(3, "float", "required")(Message.prototype, "poy");
Field.d(4, "float", "required")(Message.prototype, "poz");
Field.d(5, "float", "required")(Message.prototype, "roy");
// Field.d(1, "string", "required")(Message.prototype, "loc");
// Field.d(1, "string", "required")(Message.prototype, "uuid");
// Field.d(2, "int32", "required")(Message.prototype, "server");
// Field.d(3, "int32", "required")(Message.prototype, "channel");
// Field.d(4, "float", "required")(Message.prototype, "pox");
// Field.d(5, "float", "required")(Message.prototype, "poy");
// Field.d(6, "float", "required")(Message.prototype, "poz");
// Field.d(7, "float", "required")(Message.prototype, "roy");

const amount = 50;
const start = 0;
const end = amount - start;
const sockets = new Map();
let users = [];

for (let i = start; i < end; i++) {
  const uuid = v4();
  sockets.set(uuid, {
    uuid: uuid,
    locale: "ko-kr",
  });
}

function connectSocket(connectionData, i) {
  const {
    locale,
    socket,
    publisher,
    connection,
    space,
    channel,
    allocation,
    user,
  } = connectionData;
  const q = encodeURI(JSON.stringify({
    uuid: connectionData.user.uuid
  }).trim());
  const ws = new WebSocket(`ws://${socket.ip}:${socket.port}/?q=${q}`);
  // const socket = new WebSocket(
  //   `ws://${
  //     // socketInfo.socket.ip === "192.168.254.16"
  //     // ? "localhost"
  //     ip
  //   }:${port}/?csrftoken=${uuid}&space=${space}&channel=${channel}&pk=${pk}`
  // );
  ws.binaryType = "arraybuffer";
  ws.onopen = function (e) {
    console.log("소켓 오픈");
    // me = socketInfo.user.uuid;
    // socket.send(
    //   JSON.stringify({
    //     type: "attach",
    //     space: socketInfo.space.pk,
    //     channel: socketInfo.channel.pk,
    //     locale: socketInfo.user.locale,
    //     socket: {
    //       ip: socketInfo.socket.ip,
    //       port: socketInfo.socket.port,
    //     },
    //   })
    // );
    setTimeout(() => {
      ws.send(
        JSON.stringify({
          type: "login",
          pk: user.pk,
          nickname: "test-" + i,
          password: "1234",
          pox: 500 - game.size.user.x / 2,
          poy: 500 - game.size.user.x / 2,
          poz: 0,
          roy: (Math.PI / 180) * 90,
        })
      );
      setTimeout(() => {
        setInterval(() => {
          // console.log(uuid);
          ws.send(
            Message.encode(
              new Message({
                id: user.pk,
                // space: user.space_id,
                // channel: user.channel_id,
                pox: Math.random() * 500 - 100 + 100,
                poy: Math.random() * 500 - 100 + 100,
                poz: 0,
                roy: (Math.PI / 180) * 90,
              })
            ).finish()
          );
        }, 16);
      }, 5000);
    }, 5000);
  };
  ws.onmessage = function (message) {
    const { data } = message;
  };
  ws.onerror = function (e) {
    console.log("소켓 에러");
    throw e.message;
  };
  ws.onclose = function (e) {
    console.log("소켓 닫힘");
  };

  // sockets.set(uuid, Object.assign(sockets.get(uuid), { socket: socket }));
}

// window.addEventListener("load", () => {
// const values = sockets.values();
// for (let i = 0; i < values.length; i++) {
let index = 0;
function attaching(number) {
  for (let i = start; i < end; i++) {
    // const user = values[i];
    const uuid = v4();
    // setTimeout(() => {
    axios
      .post(`http://192.168.88.234:3001/query/attach`, {
        uuid: uuid,
        email: "",
        locale: "ko-kr",
      })
      .then((result) => {
        const { data } = result;
        // console.log(data);
        sockets.set(uuid, connectSocket(data, 2 + i));
        attachUserData.pk = data.user.pk;
        attachUserData.uuid = uuid;
        users = data.players;
        // if (i < amount) {
        //   setTimeout(() => {
        //     attaching(i + 1);
        //   }, 10);
        // }
      });
  }
  // }, 10);
}
// setTimeout(() => {
attaching(start);
// }, 10);
// }
// });

// AxiosError: connect EADDRNOTAVAIL 127.0.0.1:3000 - Local (127.0.0.1:0)
// 11|app   |     at AxiosError.from (/mnt/c/kkn_folder/test/internal_server/socket/node_modules/axios/dist/node/axios.cjs:785:14)
// 11|app   |     at RedirectableRequest.handleRequestError (/mnt/c/kkn_folder/test/internal_server/socket/node_modules/axios/dist/node/axios.cjs:2733:25)
// 11|app   |     at RedirectableRequest.emit (node:events:513:28)
// 11|app   |     at eventHandlers.<computed> (/mnt/c/kkn_folder/test/internal_server/socket/node_modules/follow-redirects/index.js:14:24)
// 11|app   |     at ClientRequest.emit (node:events:513:28)
// 11|app   |     at Socket.socketErrorListener (node:_http_client:494:9)
// 11|app   |     at Socket.emit (node:events:513:28)
// 11|app   |     at emitErrorNT (node:internal/streams/destroy:151:8)
// 11|app   |     at emitErrorCloseNT (node:internal/streams/destroy:116:3)
// 11|app   |     at process.processTicksAndRejections (node:internal/process/task_queues:82:21) {
// 11|app   |   port: 3000,
// 11|app   |   address: '127.0.0.1',
// 11|app   |   syscall: 'connect',
// 11|app   |   code: 'EADDRNOTAVAIL',
// 11|app   |   errno: -99,
// 11|app   |   config: {
// 11|app   |     transitional: {
// 11|app   |       silentJSONParsing: true,
// 11|app   |       forcedJSONParsing: true,
// 11|app   |       clarifyTimeoutError: false
// 11|app   |     },
// 11|app   |     adapter: [ 'xhr', 'http' ],
// 11|app   |     transformRequest: [ [Function: transformRequest] ],
// 11|app   |     transformResponse: [ [Function: transformResponse] ],
// 11|app   |     timeout: 0,
// 11|app   |     xsrfCookieName: 'XSRF-TOKEN',
// 11|app   |     xsrfHeaderName: 'X-XSRF-TOKEN',
// 11|app   |     maxContentLength: -1,
// 11|app   |     maxBodyLength: -1,
// 11|app   |     env: { FormData: [Function], Blob: [class Blob] },
// 11|app   |     validateStatus: [Function: validateStatus],
// 11|app   |     headers: AxiosHeaders {
// 11|app   |       Accept: 'application/json, text/plain, */*',
// 11|app   |       'Content-Type': 'application/json',
// 11|app   |       'User-Agent': 'axios/1.2.1',
// 11|app   |       'Content-Length': '117',
// 11|app   |       'Accept-Encoding': 'gzip, compress, deflate, br'
// 11|app   |     },
// 11|app   |     method: 'post',
// 11|app   |     url: 'http://localhost:3000/query/locations',
// 11|app   |     data: '{"pk":"30","space":"1","channel":"1","pox":372.12255859375,"poy":203.98472595214844,"poz":0,"roy":1.5707963705062866}'
// 11|app   |   },
// 11|app   |   request: <ref *1> Writable {
// 11|app   |     _writableState: WritableState {
// 11|app   |       objectMode: false,
// 11|app   |       highWaterMark: 16384,
// 11|app   |       finalCalled: false,
// 11|app   |       needDrain: false,
// 11|app   |       ending: false,
// 11|app   |       ended: false,
// 11|app   |       finished: false,
// 11|app   |       destroyed: false,
// 11|app   |       decodeStrings: true,
// 11|app   |       defaultEncoding: 'utf8',
// 11|app   |       length: 0,
// 11|app   |       writing: false,
// 11|app   |       corked: 0,
// 11|app   |       sync: true,
// 11|app   |       bufferProcessing: false,
// 11|app   |       onwrite: [Function: bound onwrite],
// 11|app   |       writecb: null,
// 11|app   |       writelen: 0,
// 11|app   |       afterWriteTickInfo: null,
// 11|app   |       buffered: [],
// 11|app   |       bufferedIndex: 0,
// 11|app   |       allBuffers: true,
// 11|app   |       allNoop: true,
// 11|app   |       pendingcb: 0,
// 11|app   |       constructed: true,
// 11|app   |       prefinished: false,
// 11|app   |       errorEmitted: false,
// 11|app   |       emitClose: true,
// 11|app   |       autoDestroy: true,
// 11|app   |       errored: null,
// 11|app   |       closed: false,
// 11|app   |       closeEmitted: false,
// 11|app   |       [Symbol(kOnFinished)]: []
// 11|app   |     },
// 11|app   |     _events: [Object: null prototype] {
// 11|app   |       response: [Function: handleResponse],
// 11|app   |       error: [Function: handleRequestError],
// 11|app   |       socket: [Function: handleRequestSocket]
// 11|app   |     },
// 11|app   |     _eventsCount: 3,
// 11|app   |     _maxListeners: undefined,
// 11|app   |     _options: {
// 11|app   |       maxRedirects: 21,
// 11|app   |       maxBodyLength: Infinity,
// 11|app   |       protocol: 'http:',
// 11|app   |       path: '/query/locations',
// 11|app   |       method: 'POST',
// 11|app   |       headers: [Object: null prototype],
// 11|app   |       agents: [Object],
// 11|app   |       auth: undefined,
// 11|app   |       beforeRedirect: [Function: dispatchBeforeRedirect],
// 11|app   |       beforeRedirects: [Object],
// 11|app   |       hostname: 'localhost',
// 11|app   |       port: '3000',
// 11|app   |       agent: undefined,
// 11|app   |       nativeProtocols: [Object],
// 11|app   |       pathname: '/query/locations'
// 11|app   |     },
// 11|app   |     _ended: false,
// 11|app   |     _ending: true,
// 11|app   |     _redirectCount: 0,
// 11|app   |     _redirects: [],
// 11|app   |     _requestBodyLength: 117,
// 11|app   |     _requestBodyBuffers: [ [Object] ],
// 11|app   |     _onNativeResponse: [Function (anonymous)],
// 11|app   |     _currentRequest: ClientRequest {
// 11|app   |       _events: [Object: null prototype],
// 11|app   |       _eventsCount: 7,
// 11|app   |       _maxListeners: undefined,
// 11|app   |       outputData: [],
// 11|app   |       outputSize: 0,
// 11|app   |       writable: true,
// 11|app   |       destroyed: false,
// 11|app   |       _last: true,
// 11|app   |       chunkedEncoding: false,
// 11|app   |       shouldKeepAlive: false,
// 11|app   |       maxRequestsOnConnectionReached: false,
// 11|app   |       _defaultKeepAlive: true,
// 11|app   |       useChunkedEncodingByDefault: true,
// 11|app   |       sendDate: false,
// 11|app   |       _removedConnection: false,
// 11|app   |       _removedContLen: false,
// 11|app   |       _removedTE: false,
// 11|app   |       strictContentLength: false,
// 11|app   |       _contentLength: '117',
// 11|app   |       _hasBody: true,
// 11|app   |       _trailer: '',
// 11|app   |       finished: false,
// 11|app   |       _headerSent: true,
// 11|app   |       _closed: false,
// 11|app   |       socket: [Socket],
// 11|app   |       _header: 'POST /query/locations HTTP/1.1\r\n' +
// 11|app   |         'Accept: application/json, text/plain, */*\r\n' +
// 11|app   |         'Content-Type: application/json\r\n' +
// 11|app   |         'User-Agent: axios/1.2.1\r\n' +
// 11|app   |         'Content-Length: 117\r\n' +
// 11|app   |         'Accept-Encoding: gzip, compress, deflate, br\r\n' +
// 11|app   |         'Host: localhost:3000\r\n' +
// 11|app   |         'Connection: close\r\n' +
// 11|app   |         '\r\n',
// 11|app   |       _keepAliveTimeout: 0,
// 11|app   |       _onPendingData: [Function: nop],
// 11|app   |       agent: [Agent],
// 11|app   |       socketPath: undefined,
// 11|app   |       method: 'POST',
// 11|app   |       maxHeaderSize: undefined,
// 11|app   |       insecureHTTPParser: undefined,
// 11|app   |       path: '/query/locations',
// 11|app   |       _ended: false,
// 11|app   |       res: null,
// 11|app   |       aborted: false,
// 11|app   |       timeoutCb: null,
// 11|app   |       upgradeOrConnect: false,
// 11|app   |       parser: null,
// 11|app   |       maxHeadersCount: null,
// 11|app   |       reusedSocket: false,
// 11|app   |       host: 'localhost',
// 11|app   |       protocol: 'http:',
// 11|app   |       _redirectable: [Circular *1],
// 11|app   |       [Symbol(kCapture)]: false,
// 11|app   |       [Symbol(kBytesWritten)]: 0,
// 11|app   |       [Symbol(kEndCalled)]: false,
// 11|app   |       [Symbol(kNeedDrain)]: false,
// 11|app   |       [Symbol(corked)]: 0,
// 11|app   |       [Symbol(kOutHeaders)]: [Object: null prototype],
// 11|app   |       [Symbol(kUniqueHeaders)]: null
// 11|app   |     },
// 11|app   |     _currentUrl: 'http://localhost:3000/query/locations',
// 11|app   |     [Symbol(kCapture)]: false
// 11|app   |   },
// 11|app   |   cause: Error: connect EADDRNOTAVAIL 127.0.0.1:3000 - Local (127.0.0.1:0)
// 11|app   |       at internalConnect (node:net:1053:16)
// 11|app   |       at defaultTriggerAsyncIdScope (node:internal/async_hooks:464:18)
// 11|app   |       at GetAddrInfoReqWrap.emitLookup [as callback] (node:net:1209:9)
// 11|app   |       at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:109:8) {
// 11|app   |     errno: -99,
// 11|app   |     code: 'EADDRNOTAVAIL',
// 11|app   |     syscall: 'connect',
// 11|app   |     address: '127.0.0.1',
// 11|app   |     port: 3000
// 11|app   |   }
// 11|app   | }
