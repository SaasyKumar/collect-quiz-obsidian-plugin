const path = require("path");

module.exports = {
  entry: "./src/main.ts",
  output: {
    path: path.resolve(__dirname, "."),
    filename: "main.js",
    clean: false,
  }
};