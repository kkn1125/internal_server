const publishers = [
  {
    id: 1,
    ip: "192.168.88.234",
    port: 20000,
  },
  {
    id: 2,
    ip: "192.168.88.234",
    port: 20001,
  },
];
const publishers2 = [
  // {
  //   id: 1,
  //   ip: "192.168.88.234",
  //   port: 20000,
  // },
  {
    id: 2,
    ip: "192.168.88.234",
    port: 20001,
  },
];
const publishers3 = [
  // {
  //   id: 1,
  //   ip: "192.168.88.234",
  //   port: 20000,
  // },
  // {
  //   id: 2,
  //   ip: "192.168.88.234",
  //   port: 20001,
  // },
];

const myMap = new Map();
myMap.set("192.168.88.234:20000");
myMap.set("192.168.88.234:20001");
const compareMap = new Map();
compareMap.set("192.168.88.234:20000");
compareMap.set("192.168.88.234:20001");
const compareMap2 = new Map();
// compareMap2.set("192.168.88.234:20000");
compareMap2.set("192.168.88.234:20001");

function findKey(ipAddress, list) {
  for (let i = 0; i < list.length; i++) {
    const network = `${list[i].ip}:${list[i].port}`;
    if (network === ipAddress) {
      return true;
    }
  }
  return false;
}

function compareEmptyNetwork(map, list) {
  console.log("map", map);
  console.log("list", list);
  // if (map.size > list.length) {
  for (let key of map.keys()) {
    if (!findKey(key, list)) {
      console.log("find delete key:", key);
      map.delete(key);
    }
  }
  // }
}

describe("맵과 배열 비교 테스트 슈트", () => {
  test("리스트 내 키가 있는지?", () => {
    expect(findKey(`192.168.88.234:20000`, publishers)).toEqual(true);
  });
  test("맵 사이즈가 리스트 사이즈보다 크다면", () => {
    let temp = null;
    for (let key of myMap.keys()) {
      temp = findKey(key, publishers);
      console.log(key, temp);
    }
    expect(temp).toEqual(true);
  });
  test("map 재정의 테스트 - 1", () => {
    if (publishers.length > 0) {
      compareEmptyNetwork(myMap, publishers);
      expect(myMap).toEqual(compareMap);
    }
  });
  test("map 재정의 테스트 - 2", () => {
    if (publishers2.length > 0) {
      compareEmptyNetwork(myMap, publishers2);
      expect(myMap).not.toEqual(compareMap);
    }
    expect(myMap).toEqual(compareMap2);
  });
  test("map 재정의 테스트 - 3", () => {
    if (publishers2.length > 0) {
      compareEmptyNetwork(myMap, publishers2);
      expect(myMap).toEqual(compareMap2);
    }
  });
  test("map 재정의 테스트 - 4", () => {
    if (publishers3.length > 0) {
      compareEmptyNetwork(myMap, publishers3);
      expect(myMap).toEqual(compareMap2);
    } else {
      console.log("empty list");
    }
  });
});
