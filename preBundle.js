import 'ses';
/**
 * SES lockdown shim
 * TypeError: undefined is not an object (evaluating 'getPrototypeOf(AsyncGeneratorPrototype)')
 */
// import './lockdown.umd.js';

// eslint-disable-next-line no-undef
lockdown({ consoleTaming: 'unsafe' });

import './shim.js';
