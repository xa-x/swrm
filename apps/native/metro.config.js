const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, '../../packages'),
];

config.resolver = {
  ...config.resolver,
  alias: {
    '@swrm/backend': path.resolve(__dirname, '../../packages/backend'),
    '@swrm/shared': path.resolve(__dirname, '../../packages/shared'),
  },
  extraNodeModules: {
    '@swrm/backend': path.resolve(__dirname, '../../packages/backend'),
    '@swrm/shared': path.resolve(__dirname, '../../packages/shared'),
  },
};

module.exports = config;
