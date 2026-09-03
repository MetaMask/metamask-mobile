// Empty stub for react-native.
// The react-native package ships Flow syntax (`import typeof`) that esbuild/tsx
// cannot transform.  The daemon never uses React Native APIs — this module is
// pulled in transitively by @metamask/native-utils via
// @metamask/transaction-controller when FixtureBuilder is loaded at runtime.
'use strict';

module.exports = {};
