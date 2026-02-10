const { getDefaultConfig } = require('expo/metro-config');
const { withReactNativeCSS } = require('react-native-css/metro');

const config = getDefaultConfig(__dirname);

// Add .onnx and .bin to asset extensions for model bundling
config.resolver.assetExts.push('onnx', 'bin');

module.exports = withReactNativeCSS(config, { input: './global.css' });
