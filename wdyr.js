// wdyr.js
import React from 'react';

// adjust the path to wherever your hook lives
const {
  default: useMultichainBalances,
  // eslint-disable-next-line import/no-commonjs
} = require('./app/components/hooks/useMultichainBalances/useMultichainBalances.ts');

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('🐛 why‑did‑you‑render is active');
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    trackHooks: true, // if you want hook-level reporting
    trackExtraHooks: [[{ useMultichainBalances }, 'useMultichainBalances']],
  });
}
