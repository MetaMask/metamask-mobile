"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.NpmLocation = void 0;
/* eslint-disable import/prefer-default-export */
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
var snaps_utils_1 = require("@metamask/snaps-utils");
var utils_1 = require("@metamask/utils");
var react_native_1 = require("react-native");
var react_native_blob_util_1 = require("react-native-blob-util");
var snaps_controllers_1 = require("@metamask/snaps-controllers");
var RNTar = react_native_1.NativeModules.RNTar;
var SNAPS_NPM_LOG_TAG = 'snaps/ NPM';
var decompressFile = function (path, targetPath) { return __awaiter(void 0, void 0, void 0, function () {
    var decompressedDataLocation, error_1;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                return [4 /*yield*/, RNTar.unTar(path, targetPath)];
            case 1:
                decompressedDataLocation = _c.sent();
                if (decompressedDataLocation) {
                    return [2 /*return*/, decompressedDataLocation];
                }
                throw new Error('Was unable to decompress tgz file');
            case 2:
                error_1 = _c.sent();
                throw new Error("".concat(SNAPS_NPM_LOG_TAG, " decompressFile error: ").concat(error_1));
            case 3: return [2 /*return*/];
        }
    });
}); };
var findAllPaths = function (path) { return __awaiter(void 0, void 0, void 0, function () {
    var isDir, fileNames, paths;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, react_native_blob_util_1["default"].fs.isDir(path)];
            case 1:
                isDir = _c.sent();
                if (!isDir) {
                    return [2 /*return*/, [path]];
                }
                return [4 /*yield*/, react_native_blob_util_1["default"].fs.ls(path)];
            case 2:
                fileNames = _c.sent();
                paths = fileNames.map(function (fileName) { return "".concat(path, "/").concat(fileName); });
                return [4 /*yield*/, Promise.all(paths.map(findAllPaths))];
            case 3: return [2 /*return*/, (_c.sent()).flat(Infinity)];
        }
    });
}); };
var readAndParseAt = function (path) { return __awaiter(void 0, void 0, void 0, function () {
    var contents, _c, error_2;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                _c = utils_1.stringToBytes;
                return [4 /*yield*/, react_native_blob_util_1["default"].fs.readFile(path, 'utf8')];
            case 1:
                contents = _c.apply(void 0, [_d.sent()]);
                return [2 /*return*/, { path: path, contents: contents }];
            case 2:
                error_2 = _d.sent();
                throw new Error("".concat(SNAPS_NPM_LOG_TAG, " readAndParseAt error: ").concat(error_2));
            case 3: return [2 /*return*/];
        }
    });
}); };
var fetchAndStoreNPMPackage = function (inputRequest) { return __awaiter(void 0, void 0, void 0, function () {
    var targetDir, filePath, urlToFetch, response, dataPath, decompressedPath, error_3;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                targetDir = react_native_blob_util_1["default"].fs.dirs.DocumentDir;
                filePath = "".concat(targetDir, "/archive.tgz");
                urlToFetch = typeof inputRequest === 'string' ? inputRequest : inputRequest.url;
                _c.label = 1;
            case 1:
                _c.trys.push([1, 4, , 5]);
                return [4 /*yield*/, react_native_blob_util_1["default"].config({
                        fileCache: true,
                        path: filePath
                    }).fetch('GET', urlToFetch)];
            case 2:
                response = _c.sent();
                dataPath = response.data;
                return [4 /*yield*/, decompressFile(dataPath, targetDir)];
            case 3:
                decompressedPath = _c.sent();
                // remove response file from cache
                response.flush();
                return [2 /*return*/, decompressedPath];
            case 4:
                error_3 = _c.sent();
                throw new Error("".concat(SNAPS_NPM_LOG_TAG, " fetchAndStoreNPMPackage failed to fetch with error: ").concat(error_3));
            case 5: return [2 /*return*/];
        }
    });
}); };
var cleanupFileSystem = function (path) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_c) {
        react_native_blob_util_1["default"].fs.unlink(path)["catch"](function (error) {
            throw new Error("".concat(SNAPS_NPM_LOG_TAG, " cleanupFileSystem failed to clean files at path with error: ").concat(error));
        });
        return [2 /*return*/];
    });
}); };
var NpmLocation = /** @class */ (function (_super) {
    __extends(NpmLocation, _super);
    function NpmLocation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NpmLocation.prototype.fetchNpmTarball = function (tarballUrl) {
        return __awaiter(this, void 0, void 0, function () {
            var npmPackageDataLocation, paths, files, canonicalBase, map;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, fetchAndStoreNPMPackage(tarballUrl.toString())];
                    case 1:
                        npmPackageDataLocation = _c.sent();
                        return [4 /*yield*/, findAllPaths(npmPackageDataLocation)];
                    case 2:
                        paths = _c.sent();
                        return [4 /*yield*/, Promise.all(paths.map(readAndParseAt))];
                    case 3:
                        files = _c.sent();
                        canonicalBase = (0, snaps_controllers_1.getNpmCanonicalBasePath)(this.meta.registry, this.meta.packageName);
                        map = new Map();
                        files.forEach(function (_c) {
                            var path = _c.path, contents = _c.contents;
                            // Remove most of the base path
                            var normalizedPath = path.replace("".concat(npmPackageDataLocation, "/"), '');
                            map.set(normalizedPath, new snaps_utils_1.VirtualFile({
                                value: contents,
                                path: normalizedPath,
                                data: { canonicalPath: new URL(path, canonicalBase).toString() }
                            }));
                        });
                        // Cleanup filesystem
                        return [4 /*yield*/, cleanupFileSystem(npmPackageDataLocation)];
                    case 4:
                        // Cleanup filesystem
                        _c.sent();
                        return [2 /*return*/, map];
                }
            });
        });
    };
    return NpmLocation;
}(snaps_controllers_1.BaseNpmLocation));
exports.NpmLocation = NpmLocation;
///: END:ONLY_INCLUDE_IF
