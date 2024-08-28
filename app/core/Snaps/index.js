"use strict";
exports.__esModule = true;
exports.detectSnapLocation = exports.fetchFunction = exports.EndowmentPermissions = exports.ExcludedSnapEndowments = exports.ExcludedSnapPermissions = exports.SnapBridge = void 0;
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
var SnapBridge_1 = require("./SnapBridge");
exports.SnapBridge = SnapBridge_1["default"];
var permissions_1 = require("./permissions/permissions");
exports.ExcludedSnapPermissions = permissions_1.ExcludedSnapPermissions;
exports.ExcludedSnapEndowments = permissions_1.ExcludedSnapEndowments;
exports.EndowmentPermissions = permissions_1.EndowmentPermissions;
var location_1 = require("./location");
exports.detectSnapLocation = location_1.detectSnapLocation;
exports.fetchFunction = location_1.fetchFunction;
///: END:ONLY_INCLUDE_IF
