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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _LockManagerService_appState, _LockManagerService_appStateListener, _LockManagerService_lockTimer, _LockManagerService_store, _LockManagerService_lockApp, _LockManagerService_clearBackgroundTimer, _LockManagerService_handleAppStateChange;
exports.__esModule = true;
var react_native_1 = require("react-native");
var SecureKeychain_1 = require("../SecureKeychain");
var react_native_background_timer_1 = require("react-native-background-timer");
var Engine_1 = require("../Engine");
var Logger_1 = require("../../util/Logger");
var user_1 = require("../../actions/user");
var LockManagerService = /** @class */ (function () {
    function LockManagerService() {
        var _this = this;
        _LockManagerService_appState.set(this, void 0);
        _LockManagerService_appStateListener.set(this, void 0);
        _LockManagerService_lockTimer.set(this, void 0);
        _LockManagerService_store.set(this, void 0);
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.init = function (store) {
            __classPrivateFieldSet(_this, _LockManagerService_store, store, "f");
        };
        _LockManagerService_lockApp.set(this, function () { return __awaiter(_this, void 0, void 0, function () {
            var KeyringController, error_1;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!!SecureKeychain_1["default"].getInstance().isAuthenticating) return [3 /*break*/, 5];
                        KeyringController = Engine_1["default"].context.KeyringController;
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, KeyringController.setLocked()];
                    case 2:
                        _d.sent();
                        (_c = __classPrivateFieldGet(this, _LockManagerService_store, "f")) === null || _c === void 0 ? void 0 : _c.dispatch((0, user_1.lockApp)());
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _d.sent();
                        Logger_1["default"].log('Failed to lock KeyringController', error_1);
                        return [3 /*break*/, 4];
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        if (__classPrivateFieldGet(this, _LockManagerService_lockTimer, "f")) {
                            react_native_background_timer_1["default"].clearTimeout(__classPrivateFieldGet(this, _LockManagerService_lockTimer, "f"));
                            __classPrivateFieldSet(this, _LockManagerService_lockTimer, undefined, "f");
                        }
                        _d.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        }); });
        _LockManagerService_clearBackgroundTimer.set(this, function () {
            if (!__classPrivateFieldGet(_this, _LockManagerService_lockTimer, "f")) {
                return;
            }
            react_native_background_timer_1["default"].clearTimeout(__classPrivateFieldGet(_this, _LockManagerService_lockTimer, "f"));
            __classPrivateFieldSet(_this, _LockManagerService_lockTimer, undefined, "f");
        });
        _LockManagerService_handleAppStateChange.set(this, function (nextAppState) { return __awaiter(_this, void 0, void 0, function () {
            var lockTime;
            var _this = this;
            var _c, _d;
            return __generator(this, function (_e) {
                lockTime = (_c = __classPrivateFieldGet(this, _LockManagerService_store, "f")) === null || _c === void 0 ? void 0 : _c.getState().settings.lockTime;
                if (lockTime === -1 || // Lock timer isn't set.
                    nextAppState === 'inactive' || // Ignore inactive state.
                    (__classPrivateFieldGet(this, _LockManagerService_appState, "f") === 'inactive' && nextAppState === 'active') // Ignore going from inactive -> active state.
                ) {
                    __classPrivateFieldSet(this, _LockManagerService_appState, nextAppState, "f");
                    return [2 /*return*/];
                }
                // EDGE CASE
                // Handles interruptions in the middle of authentication while lock timer is a non-zero value
                // This is most likely called when the background timer fails to be called while backgrounding the app
                if (!__classPrivateFieldGet(this, _LockManagerService_lockTimer, "f") && lockTime !== 0 && nextAppState !== 'active') {
                    (_d = __classPrivateFieldGet(this, _LockManagerService_store, "f")) === null || _d === void 0 ? void 0 : _d.dispatch((0, user_1.interruptBiometrics)());
                }
                // Handle lock logic on background.
                if (nextAppState === 'background') {
                    if (lockTime === 0) {
                        __classPrivateFieldGet(this, _LockManagerService_lockApp, "f").call(this);
                    }
                    else {
                        // Autolock after some time.
                        __classPrivateFieldGet(this, _LockManagerService_clearBackgroundTimer, "f").call(this);
                        __classPrivateFieldSet(this, _LockManagerService_lockTimer, react_native_background_timer_1["default"].setTimeout(function () {
                            if (__classPrivateFieldGet(_this, _LockManagerService_lockTimer, "f")) {
                                __classPrivateFieldGet(_this, _LockManagerService_lockApp, "f").call(_this);
                            }
                        }, lockTime), "f");
                    }
                }
                // App has foregrounded from background.
                // Clear background timer for safe measure.
                if (nextAppState === 'active') {
                    __classPrivateFieldGet(this, _LockManagerService_clearBackgroundTimer, "f").call(this);
                }
                __classPrivateFieldSet(this, _LockManagerService_appState, nextAppState, "f");
                return [2 /*return*/];
            });
        }); });
        /**
         * Listen to AppState events to control lock state.
         */
        this.startListening = function () {
            if (!__classPrivateFieldGet(_this, _LockManagerService_store, "f")) {
                Logger_1["default"].log('Failed to start listener since store is undefined.');
                return;
            }
            if (__classPrivateFieldGet(_this, _LockManagerService_appStateListener, "f")) {
                Logger_1["default"].log('Already subscribed to app state listener.');
                return;
            }
            __classPrivateFieldSet(_this, _LockManagerService_appStateListener, react_native_1.AppState.addEventListener('change', __classPrivateFieldGet(_this, _LockManagerService_handleAppStateChange, "f")), "f");
        };
        // Pause listening to AppState events.
        this.stopListening = function () {
            if (!__classPrivateFieldGet(_this, _LockManagerService_appStateListener, "f")) {
                Logger_1["default"].log('App state listener is not set.');
                return;
            }
            __classPrivateFieldGet(_this, _LockManagerService_appStateListener, "f").remove();
            __classPrivateFieldSet(_this, _LockManagerService_appStateListener, undefined, "f");
        };
    }
    return LockManagerService;
}());
_LockManagerService_appState = new WeakMap(), _LockManagerService_appStateListener = new WeakMap(), _LockManagerService_lockTimer = new WeakMap(), _LockManagerService_store = new WeakMap(), _LockManagerService_lockApp = new WeakMap(), _LockManagerService_clearBackgroundTimer = new WeakMap(), _LockManagerService_handleAppStateChange = new WeakMap();
exports["default"] = new LockManagerService();
