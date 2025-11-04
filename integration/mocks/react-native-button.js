const React = require('react');

function RNButtonMock(props) {
  return React.createElement('Button', props, props.children);
}

module.exports = RNButtonMock;
