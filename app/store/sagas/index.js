"use strict";
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
exports.rootSaga = exports.basicFunctionalityToggle = exports.biometricsStateMachine = exports.lockKeyringAndApp = exports.authStateMachine = exports.appLockStateMachine = void 0;
var effects_1 = require("redux-saga/effects");
var NavigationService_1 = require("../../core/NavigationService");
var Routes_1 = require("../../constants/navigation/Routes");
var user_1 = require("../../actions/user");
var Engine_1 = require("../../core/Engine");
var Logger_1 = require("../../util/Logger");
var LockManagerService_1 = require("../../core/LockManagerService");
var AppConstants_1 = require("../../../app/core/AppConstants");
var xhr2_1 = require("xhr2");
if (typeof global.XMLHttpRequest === 'undefined') {
    global.XMLHttpRequest = xhr2_1.XMLHttpRequest;
}
var originalSend = XMLHttpRequest.prototype.send;
var originalOpen = XMLHttpRequest.prototype.open;
function appLockStateMachine() {
    var biometricsListenerTask, bioStateMachineId;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                if (!true) return [3 /*break*/, 5];
                return [4 /*yield*/, (0, effects_1.take)(user_1.LOCKED_APP)];
            case 1:
                _d.sent();
                if (!biometricsListenerTask) return [3 /*break*/, 3];
                return [4 /*yield*/, (0, effects_1.cancel)(biometricsListenerTask)];
            case 2:
                _d.sent();
                _d.label = 3;
            case 3:
                bioStateMachineId = Date.now().toString();
                return [4 /*yield*/, (0, effects_1.fork)(biometricsStateMachine, bioStateMachineId)];
            case 4:
                biometricsListenerTask = _d.sent();
                (_c = NavigationService_1["default"].navigation) === null || _c === void 0 ? void 0 : _c.navigate(Routes_1["default"].LOCK_SCREEN, {
                    bioStateMachineId: bioStateMachineId
                });
                return [3 /*break*/, 0];
            case 5: return [2 /*return*/];
        }
    });
}
exports.appLockStateMachine = appLockStateMachine;
/**
 * The state machine for detecting when the app is logged vs logged out.
 * While on the Wallet screen, this state machine
 * will "listen" to the app lock state machine.
 */
function authStateMachine() {
    var appLockStateMachineTask;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!true) return [3 /*break*/, 5];
                return [4 /*yield*/, (0, effects_1.take)(user_1.LOGIN)];
            case 1:
                _c.sent();
                return [4 /*yield*/, (0, effects_1.fork)(appLockStateMachine)];
            case 2:
                appLockStateMachineTask = _c.sent();
                LockManagerService_1["default"].startListening();
                // Listen to app lock behavior.
                return [4 /*yield*/, (0, effects_1.take)(user_1.LOGOUT)];
            case 3:
                // Listen to app lock behavior.
                _c.sent();
                LockManagerService_1["default"].stopListening();
                // Cancels appLockStateMachineTask, which also cancels nested sagas once logged out.
                return [4 /*yield*/, (0, effects_1.cancel)(appLockStateMachineTask)];
            case 4:
                // Cancels appLockStateMachineTask, which also cancels nested sagas once logged out.
                _c.sent();
                return [3 /*break*/, 0];
            case 5: return [2 /*return*/];
        }
    });
}
exports.authStateMachine = authStateMachine;
/**
 * Locks the KeyringController and dispatches LOCK_APP.
 */
function lockKeyringAndApp() {
    var KeyringController, e_1;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                KeyringController = Engine_1["default"].context.KeyringController;
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                return [4 /*yield*/, (0, effects_1.call)(KeyringController.setLocked)];
            case 2:
                _c.sent();
                return [3 /*break*/, 4];
            case 3:
                e_1 = _c.sent();
                Logger_1["default"].log('Failed to lock KeyringController', e_1);
                return [3 /*break*/, 4];
            case 4: return [4 /*yield*/, (0, effects_1.put)((0, user_1.lockApp)())];
            case 5:
                _c.sent();
                return [2 /*return*/];
        }
    });
}
exports.lockKeyringAndApp = lockKeyringAndApp;
/**
 * The state machine, which is responsible for handling the state
 * changes related to biometrics authentication.
 */
function biometricsStateMachine(originalBioStateMachineId) {
    var shouldHandleAction, action;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                shouldHandleAction = false;
                _e.label = 1;
            case 1:
                if (!!shouldHandleAction) return [3 /*break*/, 3];
                return [4 /*yield*/, (0, effects_1.take)([user_1.AUTH_SUCCESS, user_1.AUTH_ERROR, user_1.INTERRUPT_BIOMETRICS])];
            case 2:
                action = _e.sent();
                if ((action === null || action === void 0 ? void 0 : action.type) === user_1.INTERRUPT_BIOMETRICS ||
                    ((_c = action === null || action === void 0 ? void 0 : action.payload) === null || _c === void 0 ? void 0 : _c.bioStateMachineId) === originalBioStateMachineId) {
                    shouldHandleAction = true;
                }
                return [3 /*break*/, 1];
            case 3:
                if (!((action === null || action === void 0 ? void 0 : action.type) === user_1.INTERRUPT_BIOMETRICS)) return [3 /*break*/, 5];
                // Biometrics was most likely interrupted during authentication with a non-zero lock timer.
                return [4 /*yield*/, (0, effects_1.fork)(lockKeyringAndApp)];
            case 4:
                // Biometrics was most likely interrupted during authentication with a non-zero lock timer.
                _e.sent();
                return [3 /*break*/, 6];
            case 5:
                if ((action === null || action === void 0 ? void 0 : action.type) === user_1.AUTH_ERROR) {
                    // Authentication service will automatically log out.
                }
                else if ((action === null || action === void 0 ? void 0 : action.type) === user_1.AUTH_SUCCESS) {
                    // Authentication successful. Navigate to wallet.
                    (_d = NavigationService_1["default"].navigation) === null || _d === void 0 ? void 0 : _d.navigate(Routes_1["default"].ONBOARDING.HOME_NAV);
                }
                _e.label = 6;
            case 6: return [2 /*return*/];
        }
    });
}
exports.biometricsStateMachine = biometricsStateMachine;
function basicFunctionalityToggle() {
    function restoreXMLHttpRequest() {
        XMLHttpRequest.prototype.open = originalOpen;
        XMLHttpRequest.prototype.send = originalSend;
    }
    var overrideXMLHttpRequest, basicFunctionalityEnabled;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                overrideXMLHttpRequest = function () {
                    // Store the URL of the current request
                    var currentUrl = '';
                    var blockList = AppConstants_1["default"].BASIC_FUNCTIONALITY_BLOCK_LIST;
                    var shouldBlockRequest = function (url) {
                        return blockList.some(function (blockedUrl) { return url.includes(blockedUrl); });
                    };
                    var handleError = function () {
                        return Promise.reject(new Error("Disallowed URL: ".concat(currentUrl)))["catch"](function (error) {
                            console.error(error);
                        });
                    };
                    // Override the 'open' method to capture the request URL
                    XMLHttpRequest.prototype.open = function (method, url) {
                        currentUrl = url.toString(); // Convert URL object to string
                        return originalOpen.apply(this, [method, currentUrl]);
                    };
                    // Override the 'send' method to implement the blocking logic
                    XMLHttpRequest.prototype.send = function (body) {
                        // Check if the current request should be blocked
                        if (shouldBlockRequest(currentUrl)) {
                            handleError(); // Trigger an error callback or handle the blocked request as needed
                            return; // Do not proceed with the request
                        }
                        // For non-blocked requests, proceed as normal
                        return originalSend.call(this, body);
                    };
                };
                _c.label = 1;
            case 1:
                if (!true) return [3 /*break*/, 3];
                return [4 /*yield*/, (0, effects_1.take)('TOGGLE_BASIC_FUNCTIONALITY')];
            case 2:
                basicFunctionalityEnabled = (_c.sent()).basicFunctionalityEnabled;
                if (basicFunctionalityEnabled) {
                    restoreXMLHttpRequest();
                }
                else {
                    overrideXMLHttpRequest();
                }
                return [3 /*break*/, 1];
            case 3: return [2 /*return*/];
        }
    });
}
exports.basicFunctionalityToggle = basicFunctionalityToggle;
// Main generator function that initializes other sagas in parallel.
function rootSaga() {
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, (0, effects_1.fork)(authStateMachine)];
            case 1:
                _c.sent();
                return [4 /*yield*/, (0, effects_1.fork)(basicFunctionalityToggle)];
            case 2:
                _c.sent();
                return [2 /*return*/];
        }
    });
}
exports.rootSaga = rootSaga;
