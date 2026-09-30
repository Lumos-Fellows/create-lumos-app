/** @param {import("@babel/core").ConfigAPI} api */
module.exports = (api) => {
  api.cache.forever();
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
