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
var Engine_1 = require("../../../core/Engine");
var react_native_1 = require("react-native");
var DevLogger_1 = require("../utils/DevLogger");
var wait_util_1 = require("../utils/wait.util");
function postInit(instance, callback) {
    return __awaiter(this, void 0, void 0, function () {
        var keyringController;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!instance.state._initialized) {
                        throw new Error("SDKConnect::postInit() - not initialized");
                    }
                    if (!instance.state._postInitializing) return [3 /*break*/, 2];
                    DevLogger_1["default"].log("SDKConnect::postInit() -- already doing post init -- wait for completion");
                    // Wait for initialization to finish.
                    return [4 /*yield*/, (0, wait_util_1.waitForCondition)({
                            fn: function () { return instance.state._postInitialized; },
                            context: 'post_init'
                        })];
                case 1:
                    // Wait for initialization to finish.
                    _c.sent();
                    DevLogger_1["default"].log("SDKConnect::postInit() -- done waiting for post initialization");
                    return [2 /*return*/];
                case 2:
                    if (instance.state._postInitialized) {
                        DevLogger_1["default"].log("SDKConnect::postInit() -- SKIP -- already post initialized");
                        return [2 /*return*/];
                    }
                    _c.label = 3;
                case 3:
                    instance.state._postInitializing = true;
                    keyringController = Engine_1["default"].context.KeyringController;
                    DevLogger_1["default"].log("SDKConnect::postInit() - check keychain unlocked=".concat(keyringController.isUnlocked()));
                    return [4 /*yield*/, (0, wait_util_1.waitForKeychainUnlocked)({ keyringController: keyringController, context: 'init' })];
                case 4:
                    _c.sent();
                    instance.state.appStateListener = react_native_1.AppState.addEventListener('change', instance._handleAppState.bind(instance));
                    // Add delay to pioritize reconnecting from deeplink because it contains the updated connection info (channel dapp public key)
                    return [4 /*yield*/, (0, wait_util_1.wait)(3000)];
                case 5:
                    // Add delay to pioritize reconnecting from deeplink because it contains the updated connection info (channel dapp public key)
                    _c.sent();
                    return [4 /*yield*/, instance.reconnectAll()];
                case 6:
                    _c.sent();
                    instance.state._postInitialized = true;
                    DevLogger_1["default"].log("SDKConnect::postInit() - done");
                    callback === null || callback === void 0 ? void 0 : callback();
                    return [2 /*return*/];
            }
        });
    });
}
exports["default"] = postInit;
