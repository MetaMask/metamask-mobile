const webpack = require('webpack');
const path = require('path');

const config = {
  entry: './index.js',

  output: {
    path: path.resolve(__dirname, '..', 'dist'),
    filename: 'inpage-content.js',
  },

  mode: 'production',
  module: {
    rules: [
      {
        test: /\.(js|jsx|mjs)$/u,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  resolve: {
    fallback: {
      buffer: require.resolve('buffer'),
      stream: require.resolve('stream-browserify'),
      _stream_transform: require.resolve('readable-stream/transform'),
      _stream_readable: require.resolve('readable-stream/readable'),
      _stream_writable: require.resolve('readable-stream/writable'),
      _stream_duplex: require.resolve('readable-stream/duplex'),
      _stream_passthrough: require.resolve('readable-stream/passthrough'),
      https: require.resolve('https-browserify'),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
  ],
};

module.exports = (_env, argv) => {
  if (argv.mode === 'development') {
    config.mode = 'development';
  }
  return config;
};
