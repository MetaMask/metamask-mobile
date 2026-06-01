/* eslint-disable import-x/no-commonjs -- Jest manual mock uses CommonJS for compatibility */
const React = require('react');

const QRCode = (props) => React.createElement('QRCode', props);

module.exports = QRCode;
module.exports.default = QRCode;
