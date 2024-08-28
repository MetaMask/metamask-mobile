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
var react_native_1 = require("@sentry/react-native");
var utils_1 = require("@metamask/utils");
var network_controller_1 = require("@metamask/network-controller");
var controller_utils_1 = require("@metamask/controller-utils");
/**
 * This migration removes networkDetails and networkStatus property
 * This migration add a new property `networkMetadata` to the NetworkController
 * This migrations adds a new property called `selectedNetworkClientId` to the NetworkController
 * @param {unknown} stateAsync - Promise Redux state.
 * @returns Migrated Redux state.
 */
function migrate(stateAsync) {
    var _c;
    return __awaiter(this, void 0, void 0, function () {
        var state, keyringControllerState, networkControllerState, newNetworkControllerState, infuraNetworksMetadata, customNetworksMetadata;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, stateAsync];
                case 1:
                    state = _d.sent();
                    if (!(0, utils_1.isObject)(state)) {
                        (0, react_native_1.captureException)(new Error("Migration 35: Invalid root state: '".concat(typeof state, "'")));
                        return [2 /*return*/, state];
                    }
                    if (!(0, utils_1.isObject)(state.engine)) {
                        (0, react_native_1.captureException)(new Error("Migration 35: Invalid root engine state: '".concat(typeof state.engine, "'")));
                        return [2 /*return*/, state];
                    }
                    if (!(0, utils_1.isObject)(state.engine.backgroundState)) {
                        (0, react_native_1.captureException)(new Error("Migration 35: Invalid root engine backgroundState: '".concat(typeof state
                            .engine.backgroundState, "'")));
                        return [2 /*return*/, state];
                    }
                    keyringControllerState = state.engine.backgroundState.KeyringController;
                    if (!(0, utils_1.isObject)(keyringControllerState)) {
                        (0, react_native_1.captureException)("Migration 35: Invalid vault in KeyringController: '".concat(typeof keyringControllerState, "'"));
                    }
                    networkControllerState = state.engine.backgroundState.NetworkController;
                    newNetworkControllerState = state.engine.backgroundState
                        .NetworkController;
                    if (!(0, utils_1.isObject)(networkControllerState)) {
                        (0, react_native_1.captureException)(new Error("Migration 35: Invalid NetworkController state: '".concat(typeof networkControllerState, "'")));
                        return [2 /*return*/, state];
                    }
                    if (!(0, utils_1.isObject)(networkControllerState.networkDetails) ||
                        !(0, utils_1.hasProperty)(networkControllerState, 'networkDetails')) {
                        (0, react_native_1.captureException)(new Error("Migration 35: Invalid NetworkController networkDetails state: '".concat(typeof networkControllerState.networkDetails, "'")));
                        return [2 /*return*/, state];
                    }
                    if (!(0, utils_1.isObject)(networkControllerState.networkConfigurations) ||
                        !(0, utils_1.hasProperty)(networkControllerState, 'networkConfigurations')) {
                        (0, react_native_1.captureException)(new Error("Migration 35: Invalid NetworkController networkConfigurations state: '".concat(typeof networkControllerState.networkConfigurations, "'")));
                        return [2 /*return*/, state];
                    }
                    if (!(0, utils_1.isObject)(networkControllerState.providerConfig) ||
                        !(0, utils_1.hasProperty)(networkControllerState, 'providerConfig')) {
                        (0, react_native_1.captureException)(new Error("Migration 35: Invalid NetworkController providerConfig state: '".concat(typeof networkControllerState.providerConfig, "'")));
                        return [2 /*return*/, state];
                    }
                    if (networkControllerState.networkDetails) {
                        delete networkControllerState.networkDetails;
                    }
                    if (networkControllerState.networkStatus) {
                        delete networkControllerState.networkStatus;
                    }
                    newNetworkControllerState.selectedNetworkClientId =
                        (_c = networkControllerState.providerConfig.id) !== null && _c !== void 0 ? _c : networkControllerState.providerConfig.type;
                    infuraNetworksMetadata = {};
                    customNetworksMetadata = {};
                    Object.values(controller_utils_1.InfuraNetworkType).forEach(function (network) {
                        var _c;
                        infuraNetworksMetadata = __assign(__assign({}, infuraNetworksMetadata), (_c = {}, _c[network] = { status: network_controller_1.NetworkStatus.Unknown, EIPS: {} }, _c));
                    });
                    Object.keys(networkControllerState.networkConfigurations).forEach(function (networkConfigurationId) {
                        var _c;
                        customNetworksMetadata = __assign(__assign({}, customNetworksMetadata), (_c = {}, _c[networkConfigurationId] = { status: network_controller_1.NetworkStatus.Unknown, EIPS: {} }, _c));
                    });
                    newNetworkControllerState.networksMetadata = __assign(__assign({}, infuraNetworksMetadata), customNetworksMetadata);
                    return [2 /*return*/, state];
            }
        });
    });
}
exports["default"] = migrate;
