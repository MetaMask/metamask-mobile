const path = require('path');

module.exports = {
  entry: './src/ppom.html.js',
  output: {
    path: path.resolve(__dirname, '../app/lib/ppom'),
    filename: 'ppom.html.js',
    library: {
      type: 'module',
    },
  },
  module: {
    rules: [
      {
        test: /\.html$/,
        use: 'raw-loader',
      },
    ],
  },
  experiments: { outputModule: true },
};
