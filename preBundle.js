/* eslint-disable no-undef */
/* eslint-disable import/no-commonjs */
require('./ses.cjs');

/**
 * SES lockdown shim
 * TypeError: undefined is not an object (evaluating 'getPrototypeOf(AsyncGeneratorPrototype)')
 */
// import './lockdown.umd.js';

repairIntrinsics({ consoleTaming: 'unsafe' });

// eslint-disable-next-line import/no-extraneous-dependencies
require('reflect-metadata');

hardenIntrinsics();

import './shim.js';
