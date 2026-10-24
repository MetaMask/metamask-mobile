const React = require('react');
const { View } = require('react-native');

const insets = { top: 0, right: 0, bottom: 0, left: 0 };

const SafeAreaProvider = ({ children }) => children;

module.exports = new Proxy(
  {
    SafeAreaView: View,
    SafeAreaProvider,
    useSafeAreaInsets: () => insets,
    SafeAreaInsetsContext: React.createContext(insets),
    initialWindowMetrics: { insets, frame: { x: 0, y: 0, width: 390, height: 844 } },
  },
  {
    get(target, prop) {
      if (prop in target) {
        return target[prop];
      }
      return View;
    },
  },
);
