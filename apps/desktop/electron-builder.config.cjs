const path = require('node:path');

const serverPath = process.env.RIFF_SERVER_PACKAGE_PATH
  ? path.resolve(__dirname, process.env.RIFF_SERVER_PACKAGE_PATH)
  : path.resolve(__dirname, '../../dist/release/server');

module.exports = {
  appId: 'dev.riff.desktop',
  productName: 'Riff',
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
