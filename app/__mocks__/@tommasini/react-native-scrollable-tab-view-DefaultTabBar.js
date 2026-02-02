/* eslint-disable import/no-commonjs */
/**
 * Mock for @tommasini/react-native-scrollable-tab-view/DefaultTabBar
 * Used in tests to avoid transforming the package.
 */
const React = require('react');
const { View } = require('react-native');

const DefaultTabBar = (props) =>
  React.createElement(View, { testID: 'default-tab-bar', ...props });

module.exports = DefaultTabBar;
