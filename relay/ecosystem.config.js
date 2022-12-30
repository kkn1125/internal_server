module.exports = {
  apps: [
    {
      name: "publisher",
      script: "index.js",
      watch: ["."],
      // node_args: "-r esm",
      instances: "6",
      exec_mode: "cluster",
      increment_var: "SERVER_PORT",
      wait_ready: true,
      env: {
        SERVER_PORT: 20000,
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
