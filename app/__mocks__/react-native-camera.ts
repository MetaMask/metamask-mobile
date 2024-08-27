import React from 'react';

const Constants = {
  FlashMode: {
    off: 'off',
    on: 'on',
    auto: 'auto',
    torch: 'torch',
  },
  Type: {
    back: 'back',
    front: 'front',
  },
};

class RNCamera extends React.Component {
  static Constants = Constants;

  render() {
    return null;
  }
}

// eslint-disable-next-line import/prefer-default-export
export { RNCamera };
