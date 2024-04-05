const path = require('path');

const config = {
  entry: './dist/index-raw.js',

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
  },

  mode: 'production',
};

module.exports = (_env, argv) => {
  if (argv.mode === 'development') {
    config.mode = 'development';
  }
  return config;
};
