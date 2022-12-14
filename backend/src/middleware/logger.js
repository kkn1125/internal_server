function logger(req, res, next) {
  console.log("[LOGGER]", req.method, req.url, new Date().toLocaleString("ko"));
  next();
}

export default logger;
