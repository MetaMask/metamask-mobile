/* eslint-disable import/no-commonjs */
// Initialization for why-did-you-render in React Native/Expo
// Must be imported as early as possible from the entry file in development only

// Important: Metro/Hermes console doesn't support console.group well. Use onlyLogs to avoid grouping.
// Also, track react-redux useSelector to see hook diffs.

export const shouldEnableWhyDidYouRender = () =>
  __DEV__ && process.env.ENABLE_WHY_DID_YOU_RENDER === 'true';

if (shouldEnableWhyDidYouRender()) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const whyDidYouRender = require('@welldone-software/why-did-you-render');

  // eslint-disable-next-line no-console
  console.log('[WDYR] initializing');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    onlyLogs: true,
  });
}
