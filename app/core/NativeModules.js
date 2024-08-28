"use strict";
exports.__esModule = true;
exports.Minimizer = void 0;
var react_native_1 = require("react-native");
// Minimizer module allows the app to be pushed to the background
var Minimizer = react_native_1.NativeModules.Minimizer;
exports.Minimizer = Minimizer;
