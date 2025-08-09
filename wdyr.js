/* eslint-disable import/no-commonjs */
// Initialization for why-did-you-render in React Native/Expo
// Must be imported as early as possible from the entry file in development only

// Important: Metro/Hermes console doesn't support console.group well. Use onlyLogs to avoid grouping.
// Also, track react-redux useSelector to see hook diffs.

if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const whyDidYouRender = require('@welldone-software/why-did-you-render');

  // eslint-disable-next-line no-console
  console.log('[WDYR] initializing');
  try {
    // Attempt to load react-redux for trackExtraHooks if available
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ReactRedux = require('react-redux');
    whyDidYouRender(React, {
      trackAllPureComponents: true,
      trackHooks: true,
      trackExtraHooks: [[ReactRedux, 'useSelector']],
      logOwnerReasons: true,
      logOnDifferentValues: true,
      onlyLogs: true,
      collapseGroups: false,
      hotReloadBufferMs: 800,
      // Keep logs readable in Metro
      titleColor: '#058',
      diffNameColor: 'blue',
      diffPathColor: 'red',
    });
  } catch (e) {
    // Fallback without react-redux
    whyDidYouRender(React, {
      trackAllPureComponents: true,
      trackHooks: true,
      logOwnerReasons: true,
      logOnDifferentValues: true,
      onlyLogs: true,
      hotReloadBufferMs: 800,
    });
  }
}
