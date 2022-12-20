import { defineConfig, loadEnv } from "vite";
import dotenv from "dotenv";
import path from "path";

export default defineConfig(({ command, mode, ssrBuild }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), "");

  dotenv.config({
    path: path.join(__dirname, `.env.${mode}`),
  });
  const apiHost = process.env.VITE_API_HOST;
  const apiPort = process.env.VITE_API_PORT;
  // console.log(`http://${apiHost}:${apiPort}/sse`)
  return {
    // vite config
    define: {
      __APP_ENV__: env.APP_ENV,
    },
    server: {
      host: process.env.HOST,
      port: process.env.PORT,
      watch: {
        usePolling: true,
      },
      proxy: {
        "/sse": {
          target: `http://${apiHost}:${apiPort}`,
          changeOrigin: true,
          secure: false,
          ws: false,
        },
      },
    },
  };
});
