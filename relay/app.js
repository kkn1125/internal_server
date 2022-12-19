import zmq from "zeromq";
import dotenv from "dotenv";
import path from "path";
const __dirname = path.resolve();

dotenv.config({ path: path.join(__dirname, `.env.${process.env.NODE_ENV}`) });
const serverHost = process.env.SERVER_HOST;
const serverPort = process.env.SERVER_PORT;
const clientHost = process.env.CLIENT_HOST;
const clientPort = process.env.CLIENT_PORT;

const relay = {};

async function serverRun() {
  relay.pull = new zmq.Pull();
  relay.push = new zmq.Push();
  relay.pull.connect(`tcp://${serverHost}:${serverPort}`);
  await relay.push.bind(`tcp://${clientHost}:${clientPort}`);

  for await (const [msg] of relay.pull) {
    relay.push.send(msg);
  }
}
serverRun();