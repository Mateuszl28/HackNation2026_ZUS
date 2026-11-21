// Metro: współdzielony silnik obliczeń z ../../packages/engine
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
const engine = path.resolve(__dirname, "../../packages/engine");
config.watchFolders = [engine];
config.resolver.extraNodeModules = { "@zus/engine": engine };
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];
module.exports = config;
