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
var _c;
exports.__esModule = true;
var react_native_mmkv_1 = require("react-native-mmkv");
var react_native_blob_jsi_helper_1 = require("react-native-blob-jsi-helper");
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if ((_c = window.FileReader) === null || _c === void 0 ? void 0 : _c.prototype.readAsArrayBuffer) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.FileReader.prototype.readAsArrayBuffer = function (blob) {
        if (this.readyState === this.LOADING)
            throw new Error('InvalidStateError');
        this._setReadyState(this.LOADING);
        this._result = null;
        this._error = null;
        this._result = (0, react_native_blob_jsi_helper_1.getArrayBufferForBlob)(blob);
        this._setReadyState(this.DONE);
    };
}
var RNFSStorageBackend = /** @class */ (function () {
    function RNFSStorageBackend(basePath) {
        this.storage = new react_native_mmkv_1.MMKV({ id: basePath });
    }
    RNFSStorageBackend.prototype._getDataFilePath = function (key) {
        return "".concat(key.name, "-").concat(key.chainId);
    };
    RNFSStorageBackend.prototype.read = function (key, _checksum) {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_c) {
                try {
                    data = this.storage.getBuffer(this._getDataFilePath(key));
                }
                catch (error) {
                    throw new Error("Error reading data: ".concat(error));
                }
                if (!data) {
                    throw new Error('No data found');
                }
                return [2 /*return*/, data];
            });
        });
    };
    RNFSStorageBackend.prototype.write = function (key, data, _checksum) {
        return __awaiter(this, void 0, void 0, function () {
            var dataArray;
            return __generator(this, function (_c) {
                dataArray = new Uint8Array(data);
                this.storage.set(this._getDataFilePath(key), dataArray);
                return [2 /*return*/];
            });
        });
    };
    RNFSStorageBackend.prototype["delete"] = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_c) {
                try {
                    this.storage["delete"](this._getDataFilePath(key));
                }
                catch (error) {
                    throw new Error("Error deleting data: ".concat(error));
                }
                return [2 /*return*/];
            });
        });
    };
    RNFSStorageBackend.prototype.dir = function () {
        return __awaiter(this, void 0, void 0, function () {
            var allKeys, storageKeys, _i, allKeys_1, key, _c, name_1, chainId;
            return __generator(this, function (_d) {
                allKeys = this.storage.getAllKeys();
                storageKeys = [];
                for (_i = 0, allKeys_1 = allKeys; _i < allKeys_1.length; _i++) {
                    key = allKeys_1[_i];
                    _c = key.split('-'), name_1 = _c[0], chainId = _c[1];
                    storageKeys.push({ name: name_1, chainId: chainId });
                }
                return [2 /*return*/, storageKeys];
            });
        });
    };
    return RNFSStorageBackend;
}());
exports["default"] = RNFSStorageBackend;
