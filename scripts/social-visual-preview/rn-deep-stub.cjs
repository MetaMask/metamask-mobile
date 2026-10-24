const React = require('react');

const View = (props) => React.createElement('div', props, props.children);

module.exports = new Proxy(
  { View, default: View },
  {
    get(target, prop) {
      if (prop in target) {
        return target[prop];
      }
      return View;
    },
  },
);
