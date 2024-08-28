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
exports.Authentication = void 0;
var SecureKeychain_1 = require("../SecureKeychain");
var Engine_1 = require("../Engine");
var storage_1 = require("../../constants/storage");
var Logger_1 = require("../../util/Logger");
var user_1 = require("../../actions/user");
var userProperties_1 = require("../../constants/userProperties");
var AuthenticationError_1 = require("./AuthenticationError");
var error_1 = require("../../constants/error");
var storage_wrapper_1 = require("../../store/storage-wrapper");
var AuthenticationService = /** @class */ (function () {
    function AuthenticationService() {
        var _this = this;
        this.authData = { currentAuthType: userProperties_1["default"].UNKNOWN };
        this.store = undefined;
        /**
         * This method recreates the vault upon login if user is new and is not using the latest encryption lib
         * @param password - password entered on login
         */
        this.loginVaultCreation = function (password) { return __awaiter(_this, void 0, void 0, function () {
            var KeyringController;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        KeyringController = Engine_1["default"].context.KeyringController;
                        return [4 /*yield*/, KeyringController.submitPassword(password)];
                    case 1:
                        _c.sent();
                        password = this.wipeSensitiveData();
                        return [2 /*return*/];
                }
            });
        }); };
        /**
         * This method creates a new vault and restores with seed phrase and existing user data
         * @param password - password provided by user, biometric, pincode
         * @param parsedSeed - provided seed
         * @param clearEngine - clear the engine state before restoring vault
         */
        this.newWalletVaultAndRestore = function (password, parsedSeed, clearEngine) { return __awaiter(_this, void 0, void 0, function () {
            var KeyringController;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        KeyringController = Engine_1["default"].context.KeyringController;
                        if (!clearEngine) return [3 /*break*/, 2];
                        return [4 /*yield*/, Engine_1["default"].resetState()];
                    case 1:
                        _c.sent();
                        _c.label = 2;
                    case 2: return [4 /*yield*/, KeyringController.createNewVaultAndRestore(password, parsedSeed)];
                    case 3:
                        _c.sent();
                        password = this.wipeSensitiveData();
                        parsedSeed = this.wipeSensitiveData();
                        return [2 /*return*/];
                }
            });
        }); };
        /**
         * This method creates a new wallet with all new data
         * @param password - password provided by user, biometric, pincode
         */
        this.createWalletVaultAndKeychain = function (password) { return __awaiter(_this, void 0, void 0, function () {
            var KeyringController;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        KeyringController = Engine_1["default"].context.KeyringController;
                        return [4 /*yield*/, Engine_1["default"].resetState()];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, KeyringController.createNewVaultAndKeychain(password)];
                    case 2:
                        _c.sent();
                        password = this.wipeSensitiveData();
                        return [2 /*return*/];
                }
            });
        }); };
        /**
         * This method is used for password memory obfuscation
         * It simply returns an empty string so we can reset all the sensitive params like passwords and SRPs.
         * Since we cannot control memory in JS the best we can do is remove the pointer to sensitive information in memory
         * - see this thread for more details: https://security.stackexchange.com/questions/192387/how-to-securely-erase-javascript-parameters-after-use
         * [Future improvement] to fully remove these values from memory we can convert these params to Buffers or UInt8Array as is done in extension
         * - see: https://github.com/MetaMask/metamask-extension/commit/98f187c301176152a7f697e62e2ba6d78b018b68
         */
        this.wipeSensitiveData = function () { return ''; };
        /**
         * Checks the authetincation type configured in the previous login
         * @returns @AuthData
         */
        this.checkAuthenticationMethod = function () { return __awaiter(_this, void 0, void 0, function () {
            var availableBiometryType, biometryPreviouslyDisabled, passcodePreviouslyDisabled, existingUser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, SecureKeychain_1["default"].getSupportedBiometryType()];
                    case 1:
                        availableBiometryType = _c.sent();
                        return [4 /*yield*/, storage_wrapper_1["default"].getItem(storage_1.BIOMETRY_CHOICE_DISABLED)];
                    case 2:
                        biometryPreviouslyDisabled = _c.sent();
                        return [4 /*yield*/, storage_wrapper_1["default"].getItem(storage_1.PASSCODE_DISABLED)];
                    case 3:
                        passcodePreviouslyDisabled = _c.sent();
                        if (availableBiometryType &&
                            !(biometryPreviouslyDisabled && biometryPreviouslyDisabled === storage_1.TRUE)) {
                            return [2 /*return*/, {
                                    currentAuthType: userProperties_1["default"].BIOMETRIC,
                                    availableBiometryType: availableBiometryType
                                }];
                        }
                        else if (availableBiometryType &&
                            !(passcodePreviouslyDisabled && passcodePreviouslyDisabled === storage_1.TRUE)) {
                            return [2 /*return*/, {
                                    currentAuthType: userProperties_1["default"].PASSCODE,
                                    availableBiometryType: availableBiometryType
                                }];
                        }
                        return [4 /*yield*/, storage_wrapper_1["default"].getItem(storage_1.EXISTING_USER)];
                    case 4:
                        existingUser = _c.sent();
                        if (!existingUser) return [3 /*break*/, 6];
                        return [4 /*yield*/, SecureKeychain_1["default"].getGenericPassword()];
                    case 5:
                        if (_c.sent()) {
                            return [2 /*return*/, {
                                    currentAuthType: userProperties_1["default"].REMEMBER_ME,
                                    availableBiometryType: availableBiometryType
                                }];
                        }
                        _c.label = 6;
                    case 6: return [2 /*return*/, {
                            currentAuthType: userProperties_1["default"].PASSWORD,
                            availableBiometryType: availableBiometryType
                        }];
                }
            });
        }); };
        /**
         * Reset vault will empty password used to clear/reset vault upon errors during login/creation
         */
        this.resetVault = function () { return __awaiter(_this, void 0, void 0, function () {
            var KeyringController;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        KeyringController = Engine_1["default"].context.KeyringController;
                        // Restore vault with empty password
                        return [4 /*yield*/, KeyringController.submitPassword('')];
                    case 1:
                        // Restore vault with empty password
                        _c.sent();
                        return [4 /*yield*/, this.resetPassword()];
                    case 2:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); };
        /**
         * Stores a user password in the secure keychain with a specific auth type
         * @param password - password provided by user
         * @param authType - type of authentication required to fetch password from keychain
         */
        this.storePassword = function (password, authType) { return __awaiter(_this, void 0, void 0, function () {
            var _c, error_2;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 12, , 13]);
                        _c = authType;
                        switch (_c) {
                            case userProperties_1["default"].BIOMETRIC: return [3 /*break*/, 1];
                            case userProperties_1["default"].PASSCODE: return [3 /*break*/, 3];
                            case userProperties_1["default"].REMEMBER_ME: return [3 /*break*/, 5];
                            case userProperties_1["default"].PASSWORD: return [3 /*break*/, 7];
                        }
                        return [3 /*break*/, 9];
                    case 1: return [4 /*yield*/, SecureKeychain_1["default"].setGenericPassword(password, SecureKeychain_1["default"].TYPES.BIOMETRICS)];
                    case 2:
                        _d.sent();
                        return [3 /*break*/, 11];
                    case 3: return [4 /*yield*/, SecureKeychain_1["default"].setGenericPassword(password, SecureKeychain_1["default"].TYPES.PASSCODE)];
                    case 4:
                        _d.sent();
                        return [3 /*break*/, 11];
                    case 5: return [4 /*yield*/, SecureKeychain_1["default"].setGenericPassword(password, SecureKeychain_1["default"].TYPES.REMEMBER_ME)];
                    case 6:
                        _d.sent();
                        return [3 /*break*/, 11];
                    case 7: return [4 /*yield*/, SecureKeychain_1["default"].setGenericPassword(password, undefined)];
                    case 8:
                        _d.sent();
                        return [3 /*break*/, 11];
                    case 9: return [4 /*yield*/, SecureKeychain_1["default"].setGenericPassword(password, undefined)];
                    case 10:
                        _d.sent();
                        return [3 /*break*/, 11];
                    case 11: return [3 /*break*/, 13];
                    case 12:
                        error_2 = _d.sent();
                        throw new AuthenticationError_1["default"](error_2.message, error_1.AUTHENTICATION_STORE_PASSWORD_FAILED, this.authData);
                    case 13:
                        password = this.wipeSensitiveData();
                        return [2 /*return*/];
                }
            });
        }); };
        this.resetPassword = function () { return __awaiter(_this, void 0, void 0, function () {
            var error_3;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, SecureKeychain_1["default"].resetGenericPassword()];
                    case 1:
                        _c.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_3 = _c.sent();
                        throw new AuthenticationError_1["default"]("".concat(error_1.AUTHENTICATION_RESET_PASSWORD_FAILED_MESSAGE, " ").concat(error_3.message), error_1.AUTHENTICATION_RESET_PASSWORD_FAILED, this.authData);
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        /**
         * Fetches the password from the keychain using the auth method it was originally stored
         */
        this.getPassword = function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, SecureKeychain_1["default"].getGenericPassword()];
                case 1: return [2 /*return*/, _c.sent()];
            }
        }); }); };
        /**
         * Takes a component's input to determine what @enum {AuthData} should be provided when creating a new password, wallet, etc..
         * @param biometryChoice - type of biometric choice selected
         * @param rememberMe - remember me setting (//TODO: to be removed)
         * @returns @AuthData
         */
        this.componentAuthenticationType = function (biometryChoice, rememberMe) { return __awaiter(_this, void 0, void 0, function () {
            var availableBiometryType, biometryPreviouslyDisabled, passcodePreviouslyDisabled;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, SecureKeychain_1["default"].getSupportedBiometryType()];
                    case 1:
                        availableBiometryType = _d.sent();
                        return [4 /*yield*/, storage_wrapper_1["default"].getItem(storage_1.BIOMETRY_CHOICE_DISABLED)];
                    case 2:
                        biometryPreviouslyDisabled = _d.sent();
                        return [4 /*yield*/, storage_wrapper_1["default"].getItem(storage_1.PASSCODE_DISABLED)];
                    case 3:
                        passcodePreviouslyDisabled = _d.sent();
                        if (availableBiometryType &&
                            biometryChoice &&
                            !(biometryPreviouslyDisabled && biometryPreviouslyDisabled === storage_1.TRUE)) {
                            return [2 /*return*/, {
                                    currentAuthType: userProperties_1["default"].BIOMETRIC,
                                    availableBiometryType: availableBiometryType
                                }];
                        }
                        else if (rememberMe &&
                            ((_c = this.store) === null || _c === void 0 ? void 0 : _c.getState().security.allowLoginWithRememberMe)) {
                            return [2 /*return*/, {
                                    currentAuthType: userProperties_1["default"].REMEMBER_ME,
                                    availableBiometryType: availableBiometryType
                                }];
                        }
                        else if (availableBiometryType &&
                            biometryChoice &&
                            !(passcodePreviouslyDisabled && passcodePreviouslyDisabled === storage_1.TRUE)) {
                            return [2 /*return*/, {
                                    currentAuthType: userProperties_1["default"].PASSCODE,
                                    availableBiometryType: availableBiometryType
                                }];
                        }
                        return [2 /*return*/, {
                                currentAuthType: userProperties_1["default"].PASSWORD,
                                availableBiometryType: availableBiometryType
                            }];
                }
            });
        }); };
        /**
         * Setting up a new wallet for new users
         * @param password - password provided by user
         * @param authData - type of authentication required to fetch password from keychain
         */
        this.newWalletAndKeychain = function (password, authData) { return __awaiter(_this, void 0, void 0, function () {
            var e_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, this.createWalletVaultAndKeychain(password)];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, this.storePassword(password, authData === null || authData === void 0 ? void 0 : authData.currentAuthType)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, storage_wrapper_1["default"].setItem(storage_1.EXISTING_USER, storage_1.TRUE)];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, storage_wrapper_1["default"].removeItem(storage_1.SEED_PHRASE_HINTS)];
                    case 4:
                        _c.sent();
                        this.dispatchLogin();
                        this.authData = authData;
                        return [3 /*break*/, 6];
                    case 5:
                        e_1 = _c.sent();
                        this.lockApp(false);
                        throw new AuthenticationError_1["default"](e_1.message, error_1.AUTHENTICATION_FAILED_WALLET_CREATION, this.authData);
                    case 6:
                        password = this.wipeSensitiveData();
                        return [2 /*return*/];
                }
            });
        }); };
        /**
         * This method is used when a user is creating a new wallet in onboarding flow or resetting their password
         * @param password - password provided by user
         * @param authData - type of authentication required to fetch password from keychain
         * @param parsedSeed - provides the parsed SRP
         * @param clearEngine - this boolean clears the engine data on new wallet
         */
        this.newWalletAndRestore = function (password, authData, parsedSeed, clearEngine) { return __awaiter(_this, void 0, void 0, function () {
            var e_2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, this.newWalletVaultAndRestore(password, parsedSeed, clearEngine)];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, this.storePassword(password, authData.currentAuthType)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, storage_wrapper_1["default"].setItem(storage_1.EXISTING_USER, storage_1.TRUE)];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, storage_wrapper_1["default"].removeItem(storage_1.SEED_PHRASE_HINTS)];
                    case 4:
                        _c.sent();
                        this.dispatchLogin();
                        this.authData = authData;
                        return [3 /*break*/, 6];
                    case 5:
                        e_2 = _c.sent();
                        this.lockApp(false);
                        throw new AuthenticationError_1["default"](e_2.message, error_1.AUTHENTICATION_FAILED_WALLET_CREATION, this.authData);
                    case 6:
                        password = this.wipeSensitiveData();
                        parsedSeed = this.wipeSensitiveData();
                        return [2 /*return*/];
                }
            });
        }); };
        /**
         * Manual user password entry for login
         * @param password - password provided by user
         * @param authData - type of authentication required to fetch password from keychain
         */
        this.userEntryAuth = function (password, authData) { return __awaiter(_this, void 0, void 0, function () {
            var e_3;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.loginVaultCreation(password)];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, this.storePassword(password, authData.currentAuthType)];
                    case 2:
                        _c.sent();
                        this.dispatchLogin();
                        this.authData = authData;
                        this.dispatchPasswordSet();
                        return [3 /*break*/, 4];
                    case 3:
                        e_3 = _c.sent();
                        this.lockApp(false);
                        throw new AuthenticationError_1["default"](e_3.message, error_1.AUTHENTICATION_FAILED_TO_LOGIN, this.authData);
                    case 4:
                        password = this.wipeSensitiveData();
                        return [2 /*return*/];
                }
            });
        }); };
        /**
         * Attempts to use biometric/pin code/remember me to login
         * @param bioStateMachineId - ID associated with each biometric session.
         * @param disableAutoLogout - Boolean that determines if the function should auto-lock when error is thrown.
         */
        this.appTriggeredAuth = function (options) {
            if (options === void 0) { options = {}; }
            return __awaiter(_this, void 0, void 0, function () {
                var bioStateMachineId, disableAutoLogout, credentials, password, e_4;
                var _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            bioStateMachineId = options === null || options === void 0 ? void 0 : options.bioStateMachineId;
                            disableAutoLogout = options === null || options === void 0 ? void 0 : options.disableAutoLogout;
                            _e.label = 1;
                        case 1:
                            _e.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, SecureKeychain_1["default"].getGenericPassword()];
                        case 2:
                            credentials = _e.sent();
                            password = credentials === null || credentials === void 0 ? void 0 : credentials.password;
                            if (!password) {
                                throw new AuthenticationError_1["default"](error_1.AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS, error_1.AUTHENTICATION_APP_TRIGGERED_AUTH_ERROR, this.authData);
                            }
                            return [4 /*yield*/, this.loginVaultCreation(password)];
                        case 3:
                            _e.sent();
                            this.dispatchLogin();
                            (_c = this.store) === null || _c === void 0 ? void 0 : _c.dispatch((0, user_1.authSuccess)(bioStateMachineId));
                            this.dispatchPasswordSet();
                            return [3 /*break*/, 5];
                        case 4:
                            e_4 = _e.sent();
                            (_d = this.store) === null || _d === void 0 ? void 0 : _d.dispatch((0, user_1.authError)(bioStateMachineId));
                            !disableAutoLogout && this.lockApp(false);
                            throw new AuthenticationError_1["default"](e_4.message, error_1.AUTHENTICATION_APP_TRIGGERED_AUTH_ERROR, this.authData);
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Logout and lock keyring contoller. Will require user to enter password. Wipes biometric/pin-code/remember me
         */
        this.lockApp = function (reset) {
            if (reset === void 0) { reset = true; }
            return __awaiter(_this, void 0, void 0, function () {
                var KeyringController;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            KeyringController = Engine_1["default"].context.KeyringController;
                            if (!reset) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.resetPassword()];
                        case 1:
                            _c.sent();
                            _c.label = 2;
                        case 2:
                            if (!KeyringController.isUnlocked()) return [3 /*break*/, 4];
                            return [4 /*yield*/, KeyringController.setLocked()];
                        case 3:
                            _c.sent();
                            _c.label = 4;
                        case 4:
                            this.authData = { currentAuthType: userProperties_1["default"].UNKNOWN };
                            this.dispatchLogout();
                            return [2 /*return*/];
                    }
                });
            });
        };
        this.getType = function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, this.checkAuthenticationMethod()];
                case 1: return [2 /*return*/, _c.sent()];
            }
        }); }); };
    }
    /**
     * This method creates the instance of the authentication class
     * @param {Store} store - A redux function that will dispatch global state actions
     */
    AuthenticationService.prototype.init = function (store) {
        if (!AuthenticationService.isInitialized) {
            AuthenticationService.isInitialized = true;
            this.store = store;
        }
        else {
            Logger_1["default"].log('Attempted to call init on AuthenticationService but an instance has already been initialized');
        }
    };
    AuthenticationService.prototype.dispatchLogin = function () {
        if (this.store) {
            this.store.dispatch((0, user_1.logIn)());
        }
        else {
            Logger_1["default"].log('Attempted to dispatch logIn action but dispatch was not initialized');
        }
    };
    AuthenticationService.prototype.dispatchPasswordSet = function () {
        if (this.store) {
            this.store.dispatch((0, user_1.passwordSet)());
        }
        else {
            Logger_1["default"].log('Attempted to dispatch passwordSet action but dispatch was not initialized');
        }
    };
    AuthenticationService.prototype.dispatchLogout = function () {
        if (this.store) {
            this.store.dispatch((0, user_1.logOut)());
        }
        else
            Logger_1["default"].log('Attempted to dispatch logOut action but dispatch was not initialized');
    };
    AuthenticationService.isInitialized = false;
    return AuthenticationService;
}());
// eslint-disable-next-line import/prefer-default-export
exports.Authentication = new AuthenticationService();
