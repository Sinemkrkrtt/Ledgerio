const { getDefaultConfig } = require("expo/metro-config");
// Path'i manuel olarak modülün içine yönlendiriyoruz
const { withNativeWind } = require("nativewind/dist/metro"); 

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });