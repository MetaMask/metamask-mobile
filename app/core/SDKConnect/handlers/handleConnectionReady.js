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
exports.handleConnectionReady = void 0;
var sdk_communication_layer_1 = require("@metamask/sdk-communication-layer");
var AppConstants_1 = require("../../../../app/core/AppConstants");
var Logger_1 = require("../../../util/Logger");
var DevLogger_1 = require("../utils/DevLogger");
var checkPermissions_1 = require("./checkPermissions");
var handleSendMessage_1 = require("./handleSendMessage");
var rpc_errors_1 = require("@metamask/rpc-errors");
var generateOTP_util_1 = require("../utils/generateOTP.util");
var setupBridge_1 = require("./setupBridge");
var SDKConnectConstants_1 = require("../SDKConnectConstants");
var handleConnectionReady = function (_c) {
    var originatorInfo = _c.originatorInfo, engine = _c.engine, connection = _c.connection, approveHost = _c.approveHost, disapprove = _c.disapprove, onError = _c.onError, updateOriginatorInfos = _c.updateOriginatorInfos;
    return __awaiter(void 0, void 0, void 0, function () {
        var approvalController, apiVersion, dappUrl, urlObj, hasPort, currentTime, OTPExpirationDuration, channelWasActiveRecently, msg, hostname, error_1;
        var _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    approvalController = engine.context.ApprovalController;
                    apiVersion = originatorInfo === null || originatorInfo === void 0 ? void 0 : originatorInfo.apiVersion;
                    connection.receivedClientsReady = true;
                    // backward compatibility with older sdk -- always first request approval
                    if (!apiVersion) {
                        // clear previous pending approval
                        if (approvalController.get(connection.channelId)) {
                            approvalController.reject(connection.channelId, rpc_errors_1.providerErrors.userRejectedRequest());
                        }
                        connection.approvalPromise = undefined;
                    }
                    DevLogger_1["default"].log("SDKConnect::CLIENTS_READY id=".concat(connection.channelId, " apiVersion=").concat(apiVersion, " origin=").concat(connection.origin, " trigger=").concat(connection.trigger));
                    if (!originatorInfo) {
                        return [2 /*return*/];
                    }
                    dappUrl = '';
                    try {
                        urlObj = new URL(originatorInfo === null || originatorInfo === void 0 ? void 0 : originatorInfo.url);
                        hasPort = !!urlObj.port;
                        if (hasPort) {
                            dappUrl = "".concat(urlObj.protocol, "//").concat(urlObj.hostname, ":").concat(urlObj.port);
                        }
                        else {
                            dappUrl = "".concat(urlObj.protocol, "//").concat(urlObj.hostname);
                        }
                    }
                    catch (e) {
                        DevLogger_1["default"].log('Invalid URL:', originatorInfo === null || originatorInfo === void 0 ? void 0 : originatorInfo.url);
                    }
                    connection.originatorInfo = __assign(__assign({}, originatorInfo), { url: dappUrl });
                    updateOriginatorInfos({
                        channelId: connection.channelId,
                        originatorInfo: __assign(__assign({}, originatorInfo), { url: dappUrl })
                    });
                    DevLogger_1["default"].log("SDKConnect::CLIENTS_READY originatorInfo updated", originatorInfo);
                    if (connection.isReady) {
                        DevLogger_1["default"].log("SDKConnect::CLIENTS_READY already ready");
                        return [2 /*return*/];
                    }
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 11, , 12]);
                    if (!(connection.initialConnection &&
                        connection.origin === AppConstants_1["default"].DEEPLINKS.ORIGIN_QR_CODE)) return [3 /*break*/, 2];
                    // Ask for authorisation?
                    // Always need to re-approve connection first.
                    // await checkPermissions({
                    //   connection,
                    //   engine,
                    //   lastAuthorized: connection.lastAuthorized,
                    // });
                    connection.sendAuthorized(true);
                    return [3 /*break*/, 10];
                case 2:
                    if (!(!connection.initialConnection &&
                        connection.origin === AppConstants_1["default"].DEEPLINKS.ORIGIN_QR_CODE)) return [3 /*break*/, 7];
                    currentTime = Date.now();
                    OTPExpirationDuration = Number(process.env.OTP_EXPIRATION_DURATION_IN_MS) || SDKConnectConstants_1.HOUR_IN_MS;
                    channelWasActiveRecently = !!connection.lastAuthorized &&
                        currentTime - connection.lastAuthorized < OTPExpirationDuration;
                    if (!channelWasActiveRecently) return [3 /*break*/, 4];
                    connection.approvalPromise = undefined;
                    // Prevent auto approval if metamask is killed and restarted
                    disapprove(connection.channelId);
                    // Always need to re-approve connection first.
                    return [4 /*yield*/, (0, checkPermissions_1["default"])({
                            connection: connection,
                            engine: engine,
                            lastAuthorized: connection.lastAuthorized
                        })];
                case 3:
                    // Always need to re-approve connection first.
                    _e.sent();
                    connection.sendAuthorized(true);
                    return [3 /*break*/, 6];
                case 4:
                    if (approvalController.get(connection.channelId)) {
                        DevLogger_1["default"].log("SDKConnect::CLIENTS_READY reject previous approval");
                        // cleaning previous pending approval
                        approvalController.reject(connection.channelId, rpc_errors_1.providerErrors.userRejectedRequest());
                    }
                    connection.approvalPromise = undefined;
                    if (!connection.otps) {
                        connection.otps = (0, generateOTP_util_1["default"])();
                    }
                    msg = {
                        type: sdk_communication_layer_1.MessageType.OTP,
                        otpAnswer: (_d = connection.otps) === null || _d === void 0 ? void 0 : _d[0]
                    };
                    (0, handleSendMessage_1["default"])({
                        msg: msg,
                        connection: connection
                    })["catch"](function (err) {
                        Logger_1["default"].log(err, "SDKConnect:: Connection failed to send otp");
                    });
                    // Prevent auto approval if metamask is killed and restarted
                    disapprove(connection.channelId);
                    // Always need to re-approve connection first.
                    return [4 /*yield*/, (0, checkPermissions_1["default"])({
                            connection: connection,
                            engine: engine
                        })];
                case 5:
                    // Always need to re-approve connection first.
                    _e.sent();
                    connection.sendAuthorized(true);
                    connection.lastAuthorized = Date.now();
                    _e.label = 6;
                case 6: return [3 /*break*/, 10];
                case 7:
                    if (!(!connection.initialConnection &&
                        (connection.origin === AppConstants_1["default"].DEEPLINKS.ORIGIN_DEEPLINK ||
                            connection.trigger === 'deeplink'))) return [3 /*break*/, 8];
                    hostname = AppConstants_1["default"].MM_SDK.SDK_REMOTE_ORIGIN + connection.channelId;
                    approveHost({
                        host: hostname,
                        hostname: hostname,
                        context: 'clients_ready'
                    });
                    connection.remote
                        .sendMessage({ type: 'authorized' })["catch"](function (err) {
                        Logger_1["default"].log(err, "Connection failed to send 'authorized");
                    });
                    return [3 /*break*/, 10];
                case 8:
                    if (!(connection.initialConnection &&
                        connection.origin === AppConstants_1["default"].DEEPLINKS.ORIGIN_DEEPLINK)) return [3 /*break*/, 10];
                    // Should ask for confirmation to reconnect?
                    return [4 /*yield*/, (0, checkPermissions_1["default"])({ connection: connection, engine: engine })];
                case 9:
                    // Should ask for confirmation to reconnect?
                    _e.sent();
                    connection.sendAuthorized(true);
                    _e.label = 10;
                case 10:
                    // }
                    DevLogger_1["default"].log("SDKConnect::CLIENTS_READY setup bridge");
                    connection.backgroundBridge = (0, setupBridge_1.setupBridge)({
                        originatorInfo: originatorInfo,
                        connection: connection
                    });
                    connection.isReady = true;
                    return [3 /*break*/, 12];
                case 11:
                    error_1 = _e.sent();
                    onError === null || onError === void 0 ? void 0 : onError(error_1);
                    return [3 /*break*/, 12];
                case 12: return [2 /*return*/];
            }
        });
    });
};
exports.handleConnectionReady = handleConnectionReady;
exports["default"] = exports.handleConnectionReady;
