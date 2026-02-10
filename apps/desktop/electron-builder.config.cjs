const path = require('node:path');

const serverPath = process.env.ACS_SERVER_PACKAGE_PATH
  ? path.resolve(__dirname, process.env.ACS_SERVER_PACKAGE_PATH)
  : path.resolve(__dirname, '../../dist/release/server');

module.exports = {
  appId: 'dev.acs.desktop',
  productName: 'ACS',
  directories: {
    output: 'dist/package'
  },
  files: [
    'dist/main/**',
    'renderer/dist/**',
    'package.json'
  ],
  extraResources: [
    {
      from: serverPath,
      to: 'server'
    }
  ],
  linux: {
    target: ['AppImage', 'dir']
  }
};
