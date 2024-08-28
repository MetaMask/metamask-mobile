"use strict";
exports.__esModule = true;
exports.DataDeleteResponseStatus = exports.DataDeleteStatus = void 0;
/**
 * deletion task possible status
 * @see https://docs.segmentapis.com/tag/Deletion-and-Suppression#operation/getRegulation
 */
var DataDeleteStatus;
(function (DataDeleteStatus) {
    DataDeleteStatus["failed"] = "FAILED";
    DataDeleteStatus["finished"] = "FINISHED";
    DataDeleteStatus["initialized"] = "INITIALIZED";
    DataDeleteStatus["invalid"] = "INVALID";
    DataDeleteStatus["notSupported"] = "NOT_SUPPORTED";
    DataDeleteStatus["partialSuccess"] = "PARTIAL_SUCCESS";
    DataDeleteStatus["running"] = "RUNNING";
    DataDeleteStatus["unknown"] = "UNKNOWN";
})(DataDeleteStatus = exports.DataDeleteStatus || (exports.DataDeleteStatus = {}));
/**
 * deletion task possible response status
 */
var DataDeleteResponseStatus;
(function (DataDeleteResponseStatus) {
    DataDeleteResponseStatus["ok"] = "ok";
    DataDeleteResponseStatus["error"] = "error";
})(DataDeleteResponseStatus = exports.DataDeleteResponseStatus || (exports.DataDeleteResponseStatus = {}));
