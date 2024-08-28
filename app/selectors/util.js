"use strict";
exports.__esModule = true;
exports.createDeepEqualSelector = void 0;
var lodash_1 = require("lodash");
var reselect_1 = require("reselect");
// eslint-disable-next-line import/prefer-default-export
exports.createDeepEqualSelector = (0, reselect_1.createSelectorCreator)(reselect_1.defaultMemoize, lodash_1.isEqual);
