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
var react_native_1 = require("react-native");
var AndroidService_1 = require("../AndroidSDK/AndroidService");
var DevLogger_1 = require("../utils/DevLogger");
var asyncInit_1 = require("./asyncInit");
var DeeplinkProtocolService_1 = require("../SDKDeeplinkProtocol/DeeplinkProtocolService");
function init(_c) {
    var navigation = _c.navigation, context = _c.context, instance = _c.instance;
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (!instance.state._initializing) return [3 /*break*/, 2];
                    DevLogger_1["default"].log("SDKConnect::init()[".concat(context, "] -- already initializing -- wait for completion"));
                    return [4 /*yield*/, instance.state._initializing];
                case 1: return [2 /*return*/, _d.sent()];
                case 2:
                    if (instance.state._initialized) {
                        DevLogger_1["default"].log("SDKConnect::init()[".concat(context, "] -- SKIP -- already initialized"), instance.state.connections);
                        return [2 /*return*/];
                    }
                    _d.label = 3;
                case 3:
                    if (!instance.state.androidSDKStarted && react_native_1.Platform.OS === 'android') {
                        DevLogger_1["default"].log("SDKConnect::init() - starting android service");
                        instance.state.androidService = new AndroidService_1["default"]();
                        instance.state.androidSDKStarted = true;
                    }
                    if (!instance.state.deeplinkingServiceStarted && react_native_1.Platform.OS === 'ios') {
                        DevLogger_1["default"].log("SDKConnect::init() - starting deeplinking service");
                        instance.state.deeplinkingService = new DeeplinkProtocolService_1["default"]();
                        instance.state.deeplinkingServiceStarted = true;
                    }
                    instance.state._initializing = (0, asyncInit_1["default"])({
                        navigation: navigation,
                        instance: instance,
                        context: context
                    });
                    return [2 /*return*/, instance.state._initializing];
            }
        });
    });
}
exports["default"] = init;
