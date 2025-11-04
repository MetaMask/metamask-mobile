// Ensure react-native is mocked early so libraries that read deprecated propTypes don't crash
jest.mock('react-native', () => {
  const original = jest.requireActual('react-native');

  // Ensure Platform defaults
  original.Platform = { ...original.Platform, OS: 'ios' };

  // Restore deprecated prop types used by some libs
  original.Text = {
    ...(original.Text || {}),
    propTypes: { allowFontScaling: true, style: true },
  };
  original.ViewPropTypes = { style: true };

  return original;
});

// Explicit mock for device info to ensure named exports are functions
jest.mock('react-native-device-info', () =>
  require('./mocks/react-native-device-info.js'),
);
jest.mock('@react-native-community/netinfo', () =>
  require('./mocks/netinfo.js'),
);

// Silence PPOM WebView and fix ref usage
jest.mock('../../../app/lib/ppom/PPOMView', () => {
  const React = require('react');
  return { PPOMView: React.forwardRef(() => null) };
});

// Reduce Animated overhead by replacing Animated.timing etc. with no-op implementations
jest.mock('react-native/Libraries/Animated/Animated', () => {
  const RNAnimated = jest.requireActual(
    'react-native/Libraries/Animated/Animated',
  );
  const timing = () => ({ start: (cb) => cb && cb() });
  return { ...RNAnimated, timing };
});
