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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
exports.__esModule = true;
var redux_persist_1 = require("redux-persist");
var async_storage_1 = require("@react-native-async-storage/async-storage");
var redux_persist_filesystem_storage_1 = require("redux-persist-filesystem-storage");
var autoMergeLevel2_1 = require("redux-persist/lib/stateReconciler/autoMergeLevel2");
var migrations_1 = require("./migrations");
var Logger_1 = require("../util/Logger");
var device_1 = require("../util/device");
var TIMEOUT = 40000;
var MigratedStorage = {
    getItem: function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var res, error_1, res, error_2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, redux_persist_filesystem_storage_1["default"].getItem(key)];
                    case 1:
                        res = _c.sent();
                        if (res) {
                            // Using new storage system
                            return [2 /*return*/, res];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _c.sent();
                        Logger_1["default"].error(error_1, {
                            message: "Failed to get item for ".concat(key)
                        });
                        return [3 /*break*/, 3];
                    case 3:
                        _c.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, async_storage_1["default"].getItem(key)];
                    case 4:
                        res = _c.sent();
                        if (res) {
                            // Using old storage system
                            return [2 /*return*/, res];
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        error_2 = _c.sent();
                        Logger_1["default"].error(error_2, { message: 'Failed to run migration' });
                        throw new Error('Failed async storage storage fetch.');
                    case 6: return [2 /*return*/];
                }
            });
        });
    },
    setItem: function (key, value) {
        return __awaiter(this, void 0, void 0, function () {
            var error_3;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, redux_persist_filesystem_storage_1["default"].setItem(key, value, device_1["default"].isIos())];
                    case 1: return [2 /*return*/, _c.sent()];
                    case 2:
                        error_3 = _c.sent();
                        Logger_1["default"].error(error_3, {
                            message: "Failed to set item for ".concat(key)
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    },
    removeItem: function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var error_4;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, redux_persist_filesystem_storage_1["default"].removeItem(key)];
                    case 1: return [2 /*return*/, _c.sent()];
                    case 2:
                        error_4 = _c.sent();
                        Logger_1["default"].error(error_4, {
                            message: "Failed to remove item for ".concat(key)
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    }
};
/**
 * Transform middleware that blacklists fields from redux persist that we deem too large for persisted storage
 */
var persistTransform = (0, redux_persist_1.createTransform)(function (inboundState) {
    if (!inboundState ||
        Object.keys(inboundState.backgroundState).length === 0) {
        return inboundState;
    }
    var _c = inboundState.backgroundState || {}, TokenListController = _c.TokenListController, SwapsController = _c.SwapsController, PhishingController = _c.PhishingController, controllers = __rest(_c, ["TokenListController", "SwapsController", "PhishingController"]);
    var tokenList = TokenListController.tokenList, tokensChainsCache = TokenListController.tokensChainsCache, persistedTokenListController = __rest(TokenListController, ["tokenList", "tokensChainsCache"]);
    var aggregatorMetadata = SwapsController.aggregatorMetadata, aggregatorMetadataLastFetched = SwapsController.aggregatorMetadataLastFetched, chainCache = SwapsController.chainCache, tokens = SwapsController.tokens, tokensLastFetched = SwapsController.tokensLastFetched, topAssets = SwapsController.topAssets, topAssetsLastFetched = SwapsController.topAssetsLastFetched, persistedSwapsController = __rest(SwapsController, ["aggregatorMetadata", "aggregatorMetadataLastFetched", "chainCache", "tokens", "tokensLastFetched", "topAssets", "topAssetsLastFetched"]);
    var phishingLists = PhishingController.phishingLists, whitelist = PhishingController.whitelist, persistedPhishingController = __rest(PhishingController, ["phishingLists", "whitelist"]);
    // Reconstruct data to persist
    var newState = {
        backgroundState: __assign(__assign({}, controllers), { TokenListController: persistedTokenListController, SwapsController: persistedSwapsController, PhishingController: persistedPhishingController })
    };
    return newState;
}, null, { whitelist: ['engine'] });
var persistUserTransform = (0, redux_persist_1.createTransform)(function (inboundState) {
    var initialScreen = inboundState.initialScreen, isAuthChecked = inboundState.isAuthChecked, state = __rest(inboundState, ["initialScreen", "isAuthChecked"]);
    // Reconstruct data to persist
    return state;
}, null, { whitelist: ['user'] });
var persistConfig = {
    key: 'root',
    version: migrations_1.version,
    blacklist: ['onboarding', 'rpcEvents', 'accounts'],
    storage: MigratedStorage,
    transforms: [persistTransform, persistUserTransform],
    stateReconciler: autoMergeLevel2_1["default"],
    migrate: (0, redux_persist_1.createMigrate)(migrations_1.migrations, { debug: false }),
    timeout: TIMEOUT,
    writeFailHandler: function (error) {
        return Logger_1["default"].error(error, { message: 'Error persisting data' });
    }
};
exports["default"] = persistConfig;
