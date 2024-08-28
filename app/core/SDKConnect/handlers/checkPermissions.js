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
exports.checkPermissions = void 0;
var AppConstants_1 = require("../../AppConstants");
var Permissions_1 = require("../../Permissions");
var SDKConnectConstants_1 = require("../SDKConnectConstants");
var DevLogger_1 = require("../utils/DevLogger");
var wait_util_1 = require("../utils/wait.util");
var Routes_1 = require("../../../constants/navigation/Routes");
// TODO: should be more generic and be used in wallet connect and android service as well
var checkPermissions = function (_c) {
    var connection = _c.connection, engine = _c.engine, message = _c.message, lastAuthorized = _c.lastAuthorized;
    return __awaiter(void 0, void 0, void 0, function () {
        var OTPExpirationDuration, currentRouteName, channelWasActiveRecently, permittedAccounts, permissionsController, approved, keyringController, allowed, accountPermission, moreAccountPermission, res, err_1;
        var _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    _f.trys.push([0, 9, , 10]);
                    OTPExpirationDuration = Number(process.env.OTP_EXPIRATION_DURATION_IN_MS) || SDKConnectConstants_1.HOUR_IN_MS;
                    // close poientially open loading modal
                    connection.setLoading(false);
                    currentRouteName = (_e = (_d = connection.navigation) === null || _d === void 0 ? void 0 : _d.getCurrentRoute()) === null || _e === void 0 ? void 0 : _e.name;
                    channelWasActiveRecently = !!lastAuthorized && Date.now() - lastAuthorized < OTPExpirationDuration;
                    DevLogger_1["default"].log("checkPermissions initialConnection=".concat(connection.initialConnection, " method=").concat(message === null || message === void 0 ? void 0 : message.method, " lastAuthorized=").concat(lastAuthorized, " OTPExpirationDuration ").concat(OTPExpirationDuration, " channelWasActiveRecently ").concat(channelWasActiveRecently), connection.originatorInfo);
                    return [4 /*yield*/, (0, Permissions_1.getPermittedAccounts)(connection.channelId)];
                case 1:
                    permittedAccounts = _f.sent();
                    DevLogger_1["default"].log("checkPermissions permittedAccounts", permittedAccounts);
                    if (permittedAccounts.length > 0) {
                        return [2 /*return*/, true];
                    }
                    permissionsController = engine.context.PermissionController;
                    approved = connection.isApproved({
                        channelId: connection.channelId,
                        context: 'checkPermission'
                    });
                    DevLogger_1["default"].log("checkPermissions approved=".concat(approved, " approvalPromise=").concat(connection.approvalPromise !== undefined ? 'exists' : 'undefined'));
                    if (approved) {
                        return [2 /*return*/, true];
                    }
                    DevLogger_1["default"].log("checkPermissions channelWasActiveRecently=".concat(channelWasActiveRecently, " OTPExpirationDuration=").concat(OTPExpirationDuration));
                    if (channelWasActiveRecently) {
                        return [2 /*return*/, true];
                    }
                    DevLogger_1["default"].log("checkPermissions keychain unlocked -- route=".concat(currentRouteName));
                    if (!(currentRouteName === Routes_1["default"].LOCK_SCREEN)) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, wait_util_1.waitForCondition)({
                            fn: function () {
                                var _c, _d;
                                var activeRoute = (_d = (_c = connection.navigation) === null || _c === void 0 ? void 0 : _c.getCurrentRoute()) === null || _d === void 0 ? void 0 : _d.name;
                                return activeRoute !== Routes_1["default"].LOCK_SCREEN;
                            },
                            waitTime: 1000,
                            context: 'checkPermissions'
                        })];
                case 2:
                    _f.sent();
                    _f.label = 3;
                case 3:
                    keyringController = engine.context.KeyringController;
                    return [4 /*yield*/, (0, wait_util_1.waitForKeychainUnlocked)({
                            keyringController: keyringController,
                            context: 'connection::on_message'
                        })];
                case 4:
                    _f.sent();
                    if (!connection.approvalPromise) return [3 /*break*/, 7];
                    DevLogger_1["default"].log("checkPermissions approvalPromise exists currentRouteName=".concat(currentRouteName));
                    return [4 /*yield*/, connection.approvalPromise];
                case 5:
                    allowed = _f.sent();
                    DevLogger_1["default"].log("checkPermissions approvalPromise exists completed -- allowed", allowed);
                    // Add delay for backgroundBridge to complete setup
                    return [4 /*yield*/, (0, wait_util_1.wait)(300)];
                case 6:
                    // Add delay for backgroundBridge to complete setup
                    _f.sent();
                    return [2 /*return*/, allowed];
                case 7:
                    if (!connection.initialConnection &&
                        AppConstants_1["default"].DEEPLINKS.ORIGIN_DEEPLINK) {
                        connection.revalidate({ channelId: connection.channelId });
                    }
                    accountPermission = permissionsController.getPermission(connection.channelId, 'eth_accounts');
                    moreAccountPermission = permissionsController.getPermissions(connection.channelId);
                    DevLogger_1["default"].log("checkPermissions accountPermission", accountPermission, moreAccountPermission);
                    if (!accountPermission) {
                        connection.approvalPromise = permissionsController.requestPermissions({ origin: connection.channelId }, { eth_accounts: {} }, {
                            preserveExistingPermissions: false
                        });
                    }
                    return [4 /*yield*/, connection.approvalPromise];
                case 8:
                    res = _f.sent();
                    DevLogger_1["default"].log("checkPermissions approvalPromise completed", res);
                    // Clear previous permissions if already approved.
                    connection.revalidate({ channelId: connection.channelId });
                    return [2 /*return*/, true];
                case 9:
                    err_1 = _f.sent();
                    console.warn("checkPermissions error", err_1);
                    connection.approvalPromise = undefined;
                    throw err_1;
                case 10: return [2 /*return*/];
            }
        });
    });
};
exports.checkPermissions = checkPermissions;
exports["default"] = exports.checkPermissions;
