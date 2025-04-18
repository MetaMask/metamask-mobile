// wdyr.js
import React from 'react';

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('🐛 why‑did‑you‑render is active');
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    // trackHooks: true, // if you want hook-level reporting
  });
}
