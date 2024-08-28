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
exports.Encryptor = void 0;
var utils_1 = require("@metamask/utils");
var constants_2 = require("./constants");
var lib_1 = require("./lib");
/**
 * Checks if the provided object is a `KeyDerivationOptions`.
 *
 * @param derivationOptions - The object to check.
 * @returns Whether or not the object is a `KeyDerivationOptions`.
 */
var isKeyDerivationOptions = function (derivationOptions) {
    return (0, utils_1.isPlainObject)(derivationOptions) &&
        (0, utils_1.hasProperty)(derivationOptions, 'algorithm') &&
        (0, utils_1.hasProperty)(derivationOptions, 'params');
};
/**
 * Checks if the provided object is a `EncryptionKey`.
 *
 * @param key - The object to check.
 * @returns Whether or not the object is a `EncryptionKey`.
 */
var isEncryptionKey = function (key) {
    return (0, utils_1.isPlainObject)(key) &&
        (0, utils_1.hasProperty)(key, 'key') &&
        (0, utils_1.hasProperty)(key, 'lib') &&
        (0, utils_1.hasProperty)(key, 'keyMetadata') &&
        isKeyDerivationOptions(key.keyMetadata);
};
/**
 * The Encryptor class provides methods for encrypting and
 * decrypting data objects using AES encryption with native libraries.
 * It supports generating a salt, deriving an encryption key from a
 * password and salt, and performing the encryption and decryption processes.
 */
var Encryptor = /** @class */ (function () {
    /**
     * Constructs an instance of the Encryptor class.
     *
     * @param params - An object containing key derivation parameters.
     * @param params.keyDerivationOptions - The key derivation options to use for encryption and decryption operations.
     */
    function Encryptor(_c) {
        var keyDerivationOptions = _c.keyDerivationOptions;
        var _this = this;
        /**
         * Generates a random base64-encoded salt string.
         * @param size - The number of bytes for the salt. Defaults to `constant.SALT_BYTES_COUNT`.
         * @returns The base64-encoded salt string.
         */
        this.generateSalt = function (size) {
            if (size === void 0) { size = constants_2.SALT_BYTES_COUNT; }
            var view = new Uint8Array(size);
            global.crypto.getRandomValues(view);
            // From: https://github.com/MetaMask/browser-passworder/blob/main/src/index.ts#L418
            // Uint8Array is a fixed length array and thus does not have methods like pop, etc
            // so TypeScript complains about casting it to an array. Array.from() works here for
            // getting the proper type, but it results in a functional difference. In order to
            // cast, you have to first cast view to unknown then cast the unknown value to number[]
            // TypeScript ftw: double opt in to write potentially type-mismatched code.
            return btoa(String.fromCharCode.apply(null, view));
        };
        /**
         * Generate an encryption key from a password and random salt, specifying
         * key derivation options.
         *
         * @param password - The password to use to generate key.
         * @param salt - The salt string to use in key derivation.
         * @param [exportable] - True if the key is exportable.
         * @param [opts] - The options to use for key derivation.
         * @param [lib] - The library or algorithm used for encryption. Defaults to `ENCRYPTION_LIBRARY.original`.
         * @returns An EncryptionKey for encryption and decryption.
         */
        this.keyFromPassword = function (password, salt, exportable, opts, lib) {
            if (exportable === void 0) { exportable = false; }
            if (opts === void 0) { opts = _this.keyDerivationOptions; }
            if (lib === void 0) { lib = constants_2.ENCRYPTION_LIBRARY.original; }
            return __awaiter(_this, void 0, void 0, function () {
                var key;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, (0, lib_1.getEncryptionLibrary)(lib).deriveKey(password, salt, opts)];
                        case 1:
                            key = _c.sent();
                            return [2 /*return*/, {
                                    key: key,
                                    keyMetadata: opts,
                                    exportable: exportable,
                                    lib: lib
                                }];
                    }
                });
            });
        };
        /**
         * Encrypts a text string using the provided key.
         *
         * @param key - The encryption key to encrypt with.
         * @param data - The data to encrypt.
         * @returns A promise that resolves to an object containing the cipher text and initialization vector (IV).
         */
        this.encryptWithKey = function (key, data) { return __awaiter(_this, void 0, void 0, function () {
            var text, lib, iv, cipher;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        text = JSON.stringify(data);
                        lib = (0, lib_1.getEncryptionLibrary)(key.lib);
                        return [4 /*yield*/, lib.generateIV(16)];
                    case 1:
                        iv = _c.sent();
                        return [4 /*yield*/, lib.encrypt(text, key.key, iv)];
                    case 2:
                        cipher = _c.sent();
                        return [2 /*return*/, {
                                cipher: cipher,
                                iv: iv,
                                keyMetadata: key.keyMetadata,
                                lib: key.lib
                            }];
                }
            });
        }); };
        /**
         * Decrypts the given encrypted string with the given encryption key.
         *
         * @param key - The encryption key to decrypt with.
         * @param payload - The encrypted payload to decrypt.
         * @returns The decrypted object.
         */
        this.decryptWithKey = function (key, payload) { return __awaiter(_this, void 0, void 0, function () {
            var lib, text;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        lib = (0, lib_1.getEncryptionLibrary)(payload.lib);
                        return [4 /*yield*/, lib.decrypt(payload.cipher, key.key, payload.iv)];
                    case 1:
                        text = _c.sent();
                        return [2 /*return*/, JSON.parse(text)];
                }
            });
        }); };
        /**
         * Asynchronously encrypts a given object using AES encryption.
         * The encryption process involves generating a salt, deriving a key from the provided password and salt,
         * and then using the key to encrypt the object. The result includes the encrypted data, the salt used,
         * and the library version ('original' in this case).
         *
         * @param password - The password used for generating the encryption key.
         * @param data - The data object to encrypt. It can be of any type, as it will be stringified during the encryption process.
         * @returns A promise that resolves to a string. The string is a JSON representation of an object containing the encrypted data, the salt used for encryption, and the library version.
         */
        this.encrypt = function (password, data) { return __awaiter(_this, void 0, void 0, function () {
            var salt, key, result;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        salt = this.generateSalt(16);
                        return [4 /*yield*/, this.keyFromPassword(password, salt, false, this.keyDerivationOptions, constants_2.ENCRYPTION_LIBRARY.original)];
                    case 1:
                        key = _c.sent();
                        return [4 /*yield*/, this.encryptWithKey(key, data)];
                    case 2:
                        result = _c.sent();
                        result.lib = key.lib; // Use the same library as the one used for key generation!
                        result.salt = salt;
                        result.keyMetadata = key.keyMetadata;
                        return [2 /*return*/, JSON.stringify(result)];
                }
            });
        }); };
        /**
         * Decrypts an encrypted JS object (as a JSON string)
         * using a password (and AES decryption with native libraries)
         *
         * @param password - Password used for decryption
         * @param text - String to decrypt
         * @returns - Promise resolving to decrypted data object
         */
        this.decrypt = function (password, text) { return __awaiter(_this, void 0, void 0, function () {
            var payload, key;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        payload = JSON.parse(text);
                        return [4 /*yield*/, this.keyFromPassword(password, payload.salt, false, (_c = payload.keyMetadata) !== null && _c !== void 0 ? _c : constants_2.LEGACY_DERIVATION_OPTIONS, payload.lib)];
                    case 1:
                        key = _d.sent();
                        return [4 /*yield*/, this.decryptWithKey(key, payload)];
                    case 2: return [2 /*return*/, _d.sent()];
                }
            });
        }); };
        /**
         * Checks if the provided vault is an updated encryption format.
         *
         * @param vault - The vault to check.
         * @param targetDerivationParams - The options to use for key derivation.
         * @returns Whether or not the vault is an updated encryption format.
         */
        this.isVaultUpdated = function (vault, targetDerivationParams) {
            if (targetDerivationParams === void 0) { targetDerivationParams = _this.keyDerivationOptions; }
            var keyMetadata = JSON.parse(vault).keyMetadata;
            return (isKeyDerivationOptions(keyMetadata) &&
                keyMetadata.algorithm === targetDerivationParams.algorithm &&
                keyMetadata.params.iterations === targetDerivationParams.params.iterations);
        };
        /**
         * Exports a key string from an `EncryptionKey` instance.
         *
         * @param key - The `EncryptionKey` to export.
         * @returns A key string.
         */
        this.exportKey = function (key) { return __awaiter(_this, void 0, void 0, function () {
            var json;
            return __generator(this, function (_c) {
                if (!key.exportable) {
                    throw new Error('Key is not exportable');
                }
                json = JSON.stringify(key);
                return [2 /*return*/, Buffer.from(json).toString('base64')];
            });
        }); };
        /**
         * Receives an exported EncryptionKey string and creates a key.
         *
         * @param keyString - The key string to import.
         * @returns An EncryptionKey.
         */
        this.importKey = function (keyString) { return __awaiter(_this, void 0, void 0, function () {
            var key, json;
            return __generator(this, function (_c) {
                try {
                    json = Buffer.from(keyString, 'base64').toString();
                    key = JSON.parse(json);
                }
                catch (error) {
                    throw new Error('Invalid exported key serialization format');
                }
                if (!isEncryptionKey(key)) {
                    throw new Error('Invalid exported key structure');
                }
                return [2 /*return*/, key];
            });
        }); };
        this.keyDerivationOptions = keyDerivationOptions;
    }
    return Encryptor;
}());
exports.Encryptor = Encryptor;
