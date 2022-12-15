const domains = [`naver.com`, `daum.net`, `google.com`];
const createEmail = () =>
  parseInt(Math.random() * 100_000)
    .toString()
    .split("")
    .map((str) => String.fromCharCode(97 + Number(str)))
    .join("") +
  "@" +
  domains[parseInt(Math.random() * 3)];

const dev = function () {};
const preffix = "Client";
dev.alias = function (preffix) {
  dev.preffix = preffix;
  return dev;
};

Object.assign(
  dev,
  Object.fromEntries(
    Object.entries(console).map(([key, value]) => {
      const wrap = function (...arg) {
        value.call(
          console,
          `🚀 [${dev.preffix || preffix || "DEV"}] `,
          ...arg,
          `(${new Date().toLocaleDateString("ko", {})})`
        );
        dev.preffix = "";
      };
      if (key === "memory") {
        return [key, value];
      } else {
        return [key, wrap.bind(console)];
      }
    })
  )
);

const convertRegionName = (locale) => {
  const regionNameInEnglish = new Intl.DisplayNames(["en"], { type: "region" });
  const nationName = regionNameInEnglish.of(locale.split("-")[1].toUpperCase());
  return nationName
    .split(" ")
    .reduce(
      (acc, region, index) =>
        (acc += index === 0 ? region.toLowerCase() : capitalize(region)),
      ""
    );
};

const capitalize = (words) =>
  words[0].toUpperCase() + words.slice(1).toLowerCase();

export { createEmail, dev, convertRegionName, capitalize };
