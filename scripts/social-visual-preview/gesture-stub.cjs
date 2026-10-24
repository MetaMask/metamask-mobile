const { View } = require('react-native');

const chain = new Proxy(
  {},
  {
    get: () => () => chain,
  },
);

module.exports = new Proxy(
  {
    GestureHandlerRootView: View,
    gestureHandlerRootHOC: (component) => component,
    Gesture: chain,
    State: {},
    Directions: {},
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
