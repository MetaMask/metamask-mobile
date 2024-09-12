const webpack = require('webpack');
const path = require('path');
const { readFileSync } = require('fs');

const SVG_LOGO_PATH =
  '../../app/images/fox.svg';
function getBuildIcon() {
  const svg = readFileSync(SVG_LOGO_PATH, 'utf8');
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const config = {
  entry: './src/index.js',

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
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
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
    new webpack.DefinePlugin({
      'process.env.METAMASK_BUILD_NAME': JSON.stringify('MetaMask'),
      'process.env.METAMASK_BUILD_ICON': JSON.stringify(getBuildIcon()),
      'process.env.METAMASK_BUILD_APP_ID': JSON.stringify('io.metamask.mobile'),
    }),
  ],
};

module.exports = (_env, argv) => {
  if (argv.mode === 'development') {
    config.mode = 'development';
  }
  return config;
};
