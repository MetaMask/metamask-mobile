const React = require('react');
const { View } = require('react-native');

const Image = (props) =>
  React.createElement(View, { testID: props.testID, style: props.style });

module.exports = Image;
module.exports.Image = Image;
module.exports.default = Image;
module.exports.ImageContentFit = {};
