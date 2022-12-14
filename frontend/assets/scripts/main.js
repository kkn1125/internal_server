import axios from "axios";
import { v4 } from "uuid";
import { createEmail } from "../../src/utils/tools";

const host = import.meta.env.VITE_API_HOST;
const port = import.meta.env.VITE_API_PORT;

axios.post(`http://${host}:${port}/query/enter`, {
  uuid: v4(),
  email: createEmail(),
  locale: navigator.language,
});
