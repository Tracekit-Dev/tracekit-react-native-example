const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Enable symlinks for local package development
config.watchFolders = [
  path.resolve(__dirname, '../tracekit-react-native'),
];

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../tracekit-react-native/node_modules'),
];

module.exports = config;
