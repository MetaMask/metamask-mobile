/* eslint-disable no-undef */
/* eslint-disable import/no-commonjs */
require('./ses.cjs');

/**
 * https://github.com/LavaMoat/docs/issues/27
 */
// import './lockdown.umd.js'; // 0.18.7
// lockdown();

repairIntrinsics({ consoleTaming: 'unsafe' });

// eslint-disable-next-line import/no-extraneous-dependencies
require('reflect-metadata');

hardenIntrinsics();

import './shim.js';
