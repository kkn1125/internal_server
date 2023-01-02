function findKey(ipAddress, list) {
  for (let { ip, port } of list) {
    const network = `${ip}:${port}`;
    if (network === ipAddress) {
      return true;
    }
  }
  return false;
}

function compareEmptyNetwork(map, list) {
  for (let key of map.keys()) {
    if (!findKey(key, list)) {
      console.log("find delete key:", key);
      return key.split(":");
    }
  }
  return false;
}

module.exports = { compareEmptyNetwork };
