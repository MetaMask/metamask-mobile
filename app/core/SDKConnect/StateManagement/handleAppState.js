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
var Engine_1 = require("../../Engine");
var Logger_1 = require("../../../util/Logger");
var device_1 = require("../../../util/device");
var react_native_background_timer_1 = require("react-native-background-timer");
var SDKConnectConstants_1 = require("../SDKConnectConstants");
var DevLogger_1 = require("../utils/DevLogger");
var wait_util_1 = require("../utils/wait.util");
function handleAppState(_c) {
    var appState = _c.appState, instance = _c.instance;
    return __awaiter(this, void 0, void 0, function () {
        var keyringController, hasConnecting, connectedCount, _d, _e, _i, id, err_1, error_1;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    _f.trys.push([0, 13, , 14]);
                    // Prevent double handling same app state
                    if (instance.state.appState === appState) {
                        DevLogger_1["default"].log("SDKConnect::_handleAppState - SKIP - same appState ".concat(appState));
                        return [2 /*return*/];
                    }
                    DevLogger_1["default"].log("SDKConnect::_handleAppState appState=".concat(appState));
                    instance.state.appState = appState;
                    if (!(appState === 'active')) return [3 /*break*/, 11];
                    // Close previous loading modal if any.
                    instance.hideLoadingState()["catch"](function (err) {
                        DevLogger_1["default"].log("SDKConnect::_handleAppState - can't hide loading state", err);
                    });
                    DevLogger_1["default"].log("SDKConnect::_handleAppState - resuming - paused=".concat(instance.state.paused), instance.state.timeout);
                    if (!device_1["default"].isAndroid()) return [3 /*break*/, 2];
                    if (instance.state.timeout) {
                        react_native_background_timer_1["default"].clearInterval(instance.state.timeout);
                    }
                    keyringController = Engine_1["default"].context.KeyringController;
                    return [4 /*yield*/, (0, wait_util_1.waitForKeychainUnlocked)({
                            keyringController: keyringController,
                            context: 'handleAppState'
                        })];
                case 1:
                    _f.sent();
                    return [3 /*break*/, 3];
                case 2:
                    if (instance.state.timeout) {
                        clearTimeout(instance.state.timeout);
                    }
                    _f.label = 3;
                case 3:
                    instance.state.timeout = undefined;
                    if (!instance.state.paused) return [3 /*break*/, 10];
                    hasConnecting = Object.keys(instance.state.connecting).length > 0;
                    if (hasConnecting) {
                        console.warn("SDKConnect::_handleAppState - resuming from pause - reset connecting status");
                        instance.state.connecting = {};
                    }
                    connectedCount = Object.keys(instance.state.connected).length;
                    if (!(connectedCount > 0)) return [3 /*break*/, 10];
                    // Add delay to pioritize reconnecting from deeplink because it contains the updated connection info (channel dapp public key)
                    return [4 /*yield*/, (0, wait_util_1.wait)(2000)];
                case 4:
                    // Add delay to pioritize reconnecting from deeplink because it contains the updated connection info (channel dapp public key)
                    _f.sent();
                    DevLogger_1["default"].log("SDKConnect::_handleAppState - resuming ".concat(connectedCount, " connections"));
                    _d = [];
                    for (_e in instance.state.connected)
                        _d.push(_e);
                    _i = 0;
                    _f.label = 5;
                case 5:
                    if (!(_i < _d.length)) return [3 /*break*/, 10];
                    id = _d[_i];
                    _f.label = 6;
                case 6:
                    _f.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, instance.resume({ channelId: id })];
                case 7:
                    _f.sent();
                    return [3 /*break*/, 9];
                case 8:
                    err_1 = _f.sent();
                    // Ignore error, just log it.
                    Logger_1["default"].log(err_1, "SDKConnect::_handleAppState - can't resume ".concat(id));
                    return [3 /*break*/, 9];
                case 9:
                    _i++;
                    return [3 /*break*/, 5];
                case 10:
                    DevLogger_1["default"].log("SDKConnect::_handleAppState - done resuming");
                    instance.state.paused = false;
                    return [3 /*break*/, 12];
                case 11:
                    if (appState === 'background') {
                        if (!instance.state.paused) {
                            /**
                             * Pause connections after 20 seconds of the app being in background to respect device resources.
                             * Also, OS closes the app if after 30 seconds, the connections are still open.
                             */
                            if (device_1["default"].isIos()) {
                                react_native_background_timer_1["default"].start();
                                instance.state.timeout = setTimeout(function () {
                                    instance.pause();
                                }, SDKConnectConstants_1.TIMEOUT_PAUSE_CONNECTIONS);
                                react_native_background_timer_1["default"].stop();
                            }
                            else if (device_1["default"].isAndroid()) {
                                instance.state.timeout = react_native_background_timer_1["default"].setTimeout(function () {
                                    instance.pause();
                                }, SDKConnectConstants_1.TIMEOUT_PAUSE_CONNECTIONS);
                                // TODO manage interval clearTimeout
                            }
                        }
                    }
                    _f.label = 12;
                case 12: return [3 /*break*/, 14];
                case 13:
                    error_1 = _f.sent();
                    console.error("SDKConnect::_handleAppState - error", error_1);
                    return [3 /*break*/, 14];
                case 14: return [2 /*return*/];
            }
        });
    });
}
exports["default"] = handleAppState;
