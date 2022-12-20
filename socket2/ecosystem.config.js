module.exports = {
  apps: [
    {
      name: "app",
      script: "index.js",
      watch: ["."],
      // node_args: "-r esm",
      instances: "max",
      exec_mode: "cluster",
      wait_ready: true,
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
