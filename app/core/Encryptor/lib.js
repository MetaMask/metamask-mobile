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
exports.getEncryptionLibrary = exports.AesForkedLib = exports.AesLib = void 0;
var react_native_1 = require("react-native");
var constants_2 = require("./constants");
// Actual native libraries
var Aes = react_native_1.NativeModules.Aes;
var AesForked = react_native_1.NativeModules.AesForked;
function checkForKDFAlgorithm(algorithm) {
    if (algorithm !== constants_2.KDF_ALGORITHM) {
        throw new Error('Unsupported KDF algorithm');
    }
}
var AesEncryptionLibrary = /** @class */ (function () {
    function AesEncryptionLibrary() {
        var _this = this;
        this.deriveKey = function (password, salt, opts) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        checkForKDFAlgorithm(opts.algorithm);
                        return [4 /*yield*/, Aes.pbkdf2(password, salt, opts.params.iterations, 
                            // We're using SHA512 but returning a key with length 256 bits.
                            // Truncating the output to 256 bits is intentional and considered safe.
                            //
                            // References:
                            // - https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf
                            // - https://eprint.iacr.org/2010/548.pdf
                            constants_2.SHA256_DIGEST_LENGTH, constants_2.ShaAlgorithm.Sha512)];
                    case 1: return [2 /*return*/, _c.sent()];
                }
            });
        }); };
        this.generateIV = function (size) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // Naming isn't perfect here, but this is how the library generates random IV (and encodes it the right way)
                // See: https://www.npmjs.com/package/react-native-aes-crypto#example
                return [4 /*yield*/, Aes.randomKey(size)];
                case 1: 
                // Naming isn't perfect here, but this is how the library generates random IV (and encodes it the right way)
                // See: https://www.npmjs.com/package/react-native-aes-crypto#example
                return [2 /*return*/, _c.sent()];
            }
        }); }); };
        this.encrypt = function (data, key, iv) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, Aes.encrypt(data, key, iv, constants_2.CipherAlgorithm.cbc)];
                case 1: return [2 /*return*/, _c.sent()];
            }
        }); }); };
        this.decrypt = function (data, key, iv) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, Aes.decrypt(data, key, iv, constants_2.CipherAlgorithm.cbc)];
                case 1: return [2 /*return*/, _c.sent()];
            }
        }); }); };
    }
    return AesEncryptionLibrary;
}());
var AesForkedEncryptionLibrary = /** @class */ (function () {
    function AesForkedEncryptionLibrary() {
        var _this = this;
        this.deriveKey = function (password, salt, opts) { return __awaiter(_this, void 0, void 0, function () {
            var legacyIterations;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        checkForKDFAlgorithm(opts.algorithm);
                        legacyIterations = constants_2.LEGACY_DERIVATION_OPTIONS.params.iterations;
                        if (opts.params.iterations !== legacyIterations) {
                            throw new Error("Invalid number of iterations, should be: ".concat(legacyIterations));
                        }
                        return [4 /*yield*/, AesForked.pbkdf2(password, salt)];
                    case 1: return [2 /*return*/, _c.sent()];
                }
            });
        }); };
        this.generateIV = function (size) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // NOTE: For some reason, we are not using the AesForked one here, so keep the previous behavior!
                // Naming isn't perfect here, but this is how the library generates random IV (and encodes it the right way)
                // See: https://www.npmjs.com/package/react-native-aes-crypto#example
                return [4 /*yield*/, Aes.randomKey(size)];
                case 1: 
                // NOTE: For some reason, we are not using the AesForked one here, so keep the previous behavior!
                // Naming isn't perfect here, but this is how the library generates random IV (and encodes it the right way)
                // See: https://www.npmjs.com/package/react-native-aes-crypto#example
                return [2 /*return*/, _c.sent()];
            }
        }); }); };
        this.encrypt = function (data, key, iv) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // NOTE: For some reason, we are not using the AesForked one here, so keep the previous behavior!
                return [4 /*yield*/, Aes.encrypt(data, key, iv)];
                case 1: 
                // NOTE: For some reason, we are not using the AesForked one here, so keep the previous behavior!
                return [2 /*return*/, _c.sent()];
            }
        }); }); };
        this.decrypt = function (data, key, iv) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, AesForked.decrypt(data, key, iv)];
                case 1: return [2 /*return*/, _c.sent()];
            }
        }); }); };
    }
    return AesForkedEncryptionLibrary;
}());
// Those wrappers are stateless, we can build them only once!
exports.AesLib = new AesEncryptionLibrary();
exports.AesForkedLib = new AesForkedEncryptionLibrary();
function getEncryptionLibrary(lib) {
    return lib === constants_2.ENCRYPTION_LIBRARY.original ? exports.AesLib : exports.AesForkedLib;
}
exports.getEncryptionLibrary = getEncryptionLibrary;
