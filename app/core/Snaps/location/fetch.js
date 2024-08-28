"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.fetchFunction = void 0;
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
/* eslint-disable import/prefer-default-export */
var react_native_blob_util_1 = require("react-native-blob-util");
var Logger_1 = require("../../../util/Logger");
var SNAPS_FETCH_LOG_TAG = 'Snaps/ fetch';
/**
 * Reads and parses file from ReactNativeBlobUtil response
 * @param path The path to the file to read and parse.
 * @returns The parsed file data.
 */
var readAndParseFile = function (path) { return __awaiter(void 0, void 0, void 0, function () {
    var data, error_1;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                return [4 /*yield*/, react_native_blob_util_1["default"].fs.readFile(path, 'utf8')];
            case 1:
                data = _c.sent();
                return [2 /*return*/, data];
            case 2:
                error_1 = _c.sent();
                Logger_1["default"].log(SNAPS_FETCH_LOG_TAG, 'readAndParseFile error', error_1);
                throw error_1;
            case 3: return [2 /*return*/];
        }
    });
}); };
/**
 * Converts a FetchBlobResponse object to a React Native Response object.
 * @param response The FetchBlobResponse object to convert.
 * @returns A new Response object with the same data as the input object.
 */
var convertFetchBlobResponseToResponse = function (fetchBlobResponse) { return __awaiter(void 0, void 0, void 0, function () {
    var headers, status, dataPath, data, response;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                headers = new Headers(fetchBlobResponse.respInfo.headers);
                status = fetchBlobResponse.respInfo.status;
                dataPath = fetchBlobResponse.data;
                return [4 /*yield*/, readAndParseFile(dataPath)];
            case 1:
                data = _c.sent();
                response = new Response(data, { headers: headers, status: status });
                return [2 /*return*/, response];
        }
    });
}); };
var fetchFunction = function (input) { return __awaiter(void 0, void 0, void 0, function () {
    var config, urlToFetch, response;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                config = react_native_blob_util_1["default"].config;
                urlToFetch = typeof input === 'string' ? input : input.toString();
                return [4 /*yield*/, config({ fileCache: true }).fetch('GET', urlToFetch)];
            case 1:
                response = _c.sent();
                return [4 /*yield*/, convertFetchBlobResponseToResponse(response)];
            case 2: return [2 /*return*/, _c.sent()];
        }
    });
}); };
exports.fetchFunction = fetchFunction;
///: END:ONLY_INCLUDE_IF
