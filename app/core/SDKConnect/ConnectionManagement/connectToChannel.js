"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var sdk_communication_layer_1 = require("@metamask/sdk-communication-layer");
var react_native_1 = require("react-native");
var sdk_1 = require("../../../../app/actions/sdk");
var store_1 = require("../../../../app/store");
var Routes_1 = require("../../../constants/navigation/Routes");
var networkController_1 = require("../../../selectors/networkController");
var device_1 = require("../../../util/device");
var Engine_1 = require("../../Engine");
var NativeModules_1 = require("../../NativeModules");
var Permissions_1 = require("../../Permissions");
var Connection_1 = require("../Connection");
var checkPermissions_1 = require("../handlers/checkPermissions");
var SDKConnectConstants_1 = require("../SDKConnectConstants");
var DevLogger_1 = require("../utils/DevLogger");
var wait_util_1 = require("../utils/wait.util");
var Logger_1 = require("../../../util/Logger");
var AppConstants_1 = require("../../AppConstants");
function connectToChannel(_c) {
    var _d, _e, _f, _g, _h, _j, _k, _l;
    var id = _c.id, trigger = _c.trigger, otherPublicKey = _c.otherPublicKey, originatorInfo = _c.originatorInfo, protocolVersion = _c.protocolVersion, initialConnection = _c.initialConnection, origin = _c.origin, _m = _c.validUntil, validUntil = _m === void 0 ? Date.now() + SDKConnectConstants_1.DEFAULT_SESSION_TIMEOUT_MS : _m, instance = _c.instance;
    return __awaiter(this, void 0, void 0, function () {
        var existingConnection, isReady, connected, privateKey, authorized, error_1, accounts, currentChainId, data, currentRouteName, error_2;
        return __generator(this, function (_o) {
            switch (_o.label) {
                case 0:
                    existingConnection = instance.state.connected[id] !== undefined;
                    isReady = existingConnection && instance.state.connected[id].isReady;
                    DevLogger_1["default"].log("SDKConnect::connectToChannel id=".concat(id, " trigger=").concat(trigger, " isReady=").concat(isReady, " existingConnection=").concat(existingConnection));
                    if (isReady) {
                        DevLogger_1["default"].log("SDKConnect::connectToChannel - INTERRUPT  - already ready");
                        // Nothing to do, already connected.
                        return [2 /*return*/];
                    }
                    if (!(existingConnection && !instance.state.paused)) return [3 /*break*/, 2];
                    DevLogger_1["default"].log("SDKConnect::connectToChannel -- CONNECTION SEEMS TO EXISTS ? --");
                    // if paused --- wait for resume --- otherwise reconnect.
                    return [4 /*yield*/, instance.reconnect({
                            channelId: id,
                            initialConnection: false,
                            protocolVersion: protocolVersion,
                            trigger: trigger,
                            otherPublicKey: (_e = (_d = instance.state.connected[id].remote.getKeyInfo()) === null || _d === void 0 ? void 0 : _d.ecies.otherPubKey) !== null && _e !== void 0 ? _e : '',
                            context: 'connectToChannel'
                        })];
                case 1:
                    // if paused --- wait for resume --- otherwise reconnect.
                    _o.sent();
                    return [2 /*return*/];
                case 2:
                    if (existingConnection && instance.state.paused) {
                        DevLogger_1["default"].log("SDKConnect::connectToChannel - INTERRUPT - connection is paused");
                        return [2 /*return*/];
                    }
                    _o.label = 3;
                case 3:
                    instance.state.connecting[id] = true;
                    instance.state.connections[id] = {
                        id: id,
                        otherPublicKey: otherPublicKey,
                        origin: origin,
                        initialConnection: initialConnection,
                        validUntil: validUntil,
                        originatorInfo: originatorInfo,
                        lastAuthorized: initialConnection ? 0 : instance.state.approvedHosts[id]
                    };
                    DevLogger_1["default"].log("SDKConnect connections[".concat(id, "]"), instance.state.connections[id]);
                    connected = new Connection_1.Connection(__assign(__assign({}, instance.state.connections[id]), { socketServerUrl: instance.state.socketServerUrl, protocolVersion: protocolVersion, initialConnection: initialConnection, trigger: trigger, rpcQueueManager: instance.state.rpcqueueManager, originatorInfo: originatorInfo, navigation: instance.state.navigation, updateOriginatorInfos: instance.updateOriginatorInfos.bind(instance), approveHost: instance._approveHost.bind(instance), disapprove: instance.disapproveChannel.bind(instance), getApprovedHosts: instance.getApprovedHosts.bind(instance), revalidate: instance.revalidateChannel.bind(instance), isApproved: instance.isApproved.bind(instance), onTerminate: function (_c) {
                            var channelId = _c.channelId, sendTerminate = _c.sendTerminate;
                            instance.removeChannel({ channelId: channelId, sendTerminate: sendTerminate });
                        } }));
                    privateKey = (_f = connected.remote.getKeyInfo()) === null || _f === void 0 ? void 0 : _f.ecies.private;
                    instance.state.connections[id].privateKey = privateKey;
                    instance.state.connections[id].protocolVersion = protocolVersion !== null && protocolVersion !== void 0 ? protocolVersion : 1;
                    instance.state.connections[id].originatorInfo = originatorInfo;
                    instance.state.connected[id] = connected;
                    authorized = false;
                    DevLogger_1["default"].log("SDKConnect::connectToChannel - originatorInfo", originatorInfo);
                    if (!originatorInfo) return [3 /*break*/, 12];
                    // Only check permissions if we have originatorInfo with the deeplink (not available in protocol V1)
                    DevLogger_1["default"].log("SDKConnect::connectToChannel checkPermissions", originatorInfo);
                    _o.label = 4;
                case 4:
                    _o.trys.push([4, 6, , 12]);
                    return [4 /*yield*/, (0, checkPermissions_1["default"])({
                            connection: connected,
                            engine: Engine_1["default"]
                        })];
                case 5:
                    _o.sent();
                    authorized = true;
                    return [3 /*break*/, 12];
                case 6:
                    error_1 = _o.sent();
                    instance.removeChannel({ channelId: id, sendTerminate: true });
                    // cleanup connection
                    return [4 /*yield*/, (0, wait_util_1.wait)(100)];
                case 7:
                    // cleanup connection
                    _o.sent(); // Add delay for connect modal to be fully closed
                    return [4 /*yield*/, instance.updateSDKLoadingState({ channelId: id, loading: false })];
                case 8:
                    _o.sent();
                    if (!(device_1["default"].isIos() && parseInt(react_native_1.Platform.Version) >= 17)) return [3 /*break*/, 9];
                    (_g = connected.navigation) === null || _g === void 0 ? void 0 : _g.navigate(Routes_1["default"].MODAL.ROOT_MODAL_FLOW, {
                        screen: Routes_1["default"].SHEET.RETURN_TO_DAPP_MODAL
                    });
                    return [3 /*break*/, 11];
                case 9:
                    DevLogger_1["default"].log("[handleSendMessage] goBack()");
                    return [4 /*yield*/, NativeModules_1.Minimizer.goBack()];
                case 10:
                    _o.sent();
                    _o.label = 11;
                case 11: return [2 /*return*/];
                case 12:
                    _o.trys.push([12, 21, , 22]);
                    // Make sure to watch event before you connect
                    instance.watchConnection(instance.state.connected[id]);
                    store_1.store.dispatch((0, sdk_1.resetConnections)(instance.state.connections));
                    // Initialize connection
                    return [4 /*yield*/, instance.state.connected[id].connect({
                            withKeyExchange: true,
                            authorized: authorized
                        })];
                case 13:
                    // Initialize connection
                    _o.sent();
                    instance.state.connecting[id] = false;
                    DevLogger_1["default"].log("SDKConnect::connectToChannel - connected - authorized=".concat(authorized, " initialConnection=").concat(initialConnection));
                    if (authorized) {
                        connected.remote.state.relayPersistence = true;
                    }
                    if (!(authorized && initialConnection)) return [3 /*break*/, 20];
                    return [4 /*yield*/, (0, Permissions_1.getPermittedAccounts)(id)];
                case 14:
                    accounts = _o.sent();
                    currentChainId = (0, networkController_1.selectChainId)(store_1.store.getState());
                    data = {
                        accounts: accounts,
                        chainId: currentChainId,
                        walletKey: (_h = instance.state.connected[id].remote.getKeyInfo()) === null || _h === void 0 ? void 0 : _h.ecies.public
                    };
                    DevLogger_1["default"].log("send account / chainId to dapp", data);
                    // Directly send the account / chainId to the dapp
                    return [4 /*yield*/, connected.remote.sendMessage({
                            type: sdk_communication_layer_1.MessageType.WALLET_INIT,
                            data: data
                        })];
                case 15:
                    // Directly send the account / chainId to the dapp
                    _o.sent();
                    // Make sure connect modal has enough time to fully close.
                    return [4 /*yield*/, (0, wait_util_1.waitForCondition)({
                            fn: function () {
                                var _c, _d;
                                var checkRoute = (_d = (_c = connected.navigation) === null || _c === void 0 ? void 0 : _c.getCurrentRoute()) === null || _d === void 0 ? void 0 : _d.name;
                                return checkRoute !== Routes_1["default"].SHEET.ACCOUNT_CONNECT;
                            },
                            context: 'connectToChannel',
                            waitTime: 100
                        })];
                case 16:
                    // Make sure connect modal has enough time to fully close.
                    _o.sent();
                    return [4 /*yield*/, instance.updateSDKLoadingState({ channelId: id, loading: false })];
                case 17:
                    _o.sent();
                    currentRouteName = (_k = (_j = connected.navigation) === null || _j === void 0 ? void 0 : _j.getCurrentRoute()) === null || _k === void 0 ? void 0 : _k.name;
                    DevLogger_1["default"].log("connectToChannel:: initialConnection=".concat(initialConnection, " trigger=").concat(trigger, " origin=").concat(origin, "  routeName: ").concat(currentRouteName));
                    if (!(initialConnection &&
                        connected.trigger === AppConstants_1["default"].DEEPLINKS.ORIGIN_DEEPLINK &&
                        connected.origin === AppConstants_1["default"].DEEPLINKS.ORIGIN_DEEPLINK)) return [3 /*break*/, 20];
                    if (!(device_1["default"].isIos() && parseInt(react_native_1.Platform.Version) >= 17)) return [3 /*break*/, 18];
                    DevLogger_1["default"].log("[handleSendMessage] display RETURN_TO_DAPP_MODAL");
                    (_l = connected.navigation) === null || _l === void 0 ? void 0 : _l.navigate(Routes_1["default"].MODAL.ROOT_MODAL_FLOW, {
                        screen: Routes_1["default"].SHEET.RETURN_TO_DAPP_MODAL
                    });
                    return [3 /*break*/, 20];
                case 18: return [4 /*yield*/, NativeModules_1.Minimizer.goBack()];
                case 19:
                    _o.sent();
                    _o.label = 20;
                case 20: return [3 /*break*/, 22];
                case 21:
                    error_2 = _o.sent();
                    Logger_1["default"].error(error_2, 'Failed to connect to channel');
                    return [3 /*break*/, 22];
                case 22: return [2 /*return*/];
            }
        });
    });
}
exports["default"] = connectToChannel;
