module.exports = {
  apps: [
    {
      name: "app",
      script: "relay.js",
      watch: ["."],
      // node_args: "-r esm",
      instances: "6",
      increment_var: "PORT",
      exec_mode: "cluster",
      wait_ready: true,
      ignore_watch: ["dummy*"],
      env: {
        PORT: 10000,
      },
    },
  ],

  deploy: {
    production: {
      user: "SSH_USERNAME",
      host: "SSH_HOSTMACHINE",
      ref: "origin/master",
      repo: "GIT_REPOSITORY",
      path: "DESTINATION_PATH",
      "pre-deploy-local": "",
      "post-deploy":
        "npm install && pm2 reload ecosystem.config.js --env production",
      "pre-setup": "",
    },
  },
};
