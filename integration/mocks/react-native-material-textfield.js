const React = require('react');
const { TextInput, View } = require('react-native');

function OutlinedTextField(props) {
  // Render a minimal structure similar enough for tests
  return React.createElement(
    View,
    { testID: 'textfield' },
    React.createElement(TextInput, props),
    React.createElement(View, { testID: 'textfield-endacccessory' }),
  );
}

module.exports = { OutlinedTextField };
