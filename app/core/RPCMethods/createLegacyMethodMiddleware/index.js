"use strict";
exports.__esModule = true;
var utils_1 = require("../utils");
var util_1 = require("./util");
/**
 * Creates a middleware that handles legacy RPC methods
 */
var createLegacyMethodMiddleware = (0, utils_1.makeMethodMiddlewareMaker)(util_1["default"]);
exports["default"] = createLegacyMethodMiddleware;
