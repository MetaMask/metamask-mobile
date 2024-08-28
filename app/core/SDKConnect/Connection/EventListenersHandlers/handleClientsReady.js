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
var Routes_1 = require("../../../../constants/navigation/Routes");
var Logger_1 = require("../../../../util/Logger");
var device_1 = require("../../../../util/device");
var Engine_1 = require("../../../Engine");
var SDKConnect_1 = require("../../SDKConnect");
var handleConnectionReady_1 = require("../../handlers/handleConnectionReady");
var DevLogger_1 = require("../../utils/DevLogger");
var AppConstants_1 = require("../../../../core/AppConstants");
function handleClientsReady(_c) {
    var _this = this;
    var instance = _c.instance, disapprove = _c.disapprove, updateOriginatorInfos = _c.updateOriginatorInfos, approveHost = _c.approveHost;
    return function (clientsReadyMsg) { return __awaiter(_this, void 0, void 0, function () {
        var error_1;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, handleConnectionReady_1["default"])({
                            originatorInfo: (_c = clientsReadyMsg === null || clientsReadyMsg === void 0 ? void 0 : clientsReadyMsg.originatorInfo) !== null && _c !== void 0 ? _c : instance.originatorInfo,
                            engine: Engine_1["default"],
                            updateOriginatorInfos: updateOriginatorInfos,
                            approveHost: approveHost,
                            onError: function (error) {
                                var _c;
                                Logger_1["default"].error(error, '');
                                instance.setLoading(false);
                                // Remove connection from SDK completely
                                SDKConnect_1["default"].getInstance().removeChannel({
                                    channelId: instance.channelId,
                                    sendTerminate: true
                                });
                                // Redirect on deeplinks
                                if (instance.trigger === 'deeplink' &&
                                    instance.origin !== AppConstants_1["default"].DEEPLINKS.ORIGIN_QR_CODE) {
                                    // Check for iOS 17 and above to use a custom modal, as Minimizer.goBack() is incompatible with these versions
                                    if (device_1["default"].isIos() && parseInt(react_native_1.Platform.Version) >= 17) {
                                        (_c = instance.navigation) === null || _c === void 0 ? void 0 : _c.navigate(Routes_1["default"].MODAL.ROOT_MODAL_FLOW, {
                                            screen: Routes_1["default"].SHEET.RETURN_TO_DAPP_MODAL
                                        });
                                    }
                                }
                            },
                            disapprove: disapprove,
                            connection: instance
                        })];
                case 1:
                    _d.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _d.sent();
                    DevLogger_1["default"].log("Connection::CLIENTS_READY error", error_1);
                    instance.setLoading(false);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
}
exports["default"] = handleClientsReady;
