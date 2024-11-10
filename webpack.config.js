const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
    entry: "./index.cjs", // file utama aplikasi Electron Anda
    output: {
        filename: "bundle.js", // hasil bundling
        path: path.resolve(__dirname, "build") // output directory
    },
    target: "electron-main", // target untuk Electron main process
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin()],
    },
    mode: "production", // bisa juga 'development' jika sedang dalam proses development
};
