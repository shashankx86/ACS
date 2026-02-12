const path = require('node:path');

const serverPath = process.env.OMT_SERVER_PACKAGE_PATH
  ? path.resolve(__dirname, process.env.OMT_SERVER_PACKAGE_PATH)
  : path.resolve(__dirname, '../../dist/release/server');

module.exports = {
  appId: 'dev.0x5p.omt',
  productName: 'Omit',
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
