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
exports.controllerList = void 0;
var utils_1 = require("@metamask/utils");
var react_native_1 = require("@sentry/react-native");
var general_1 = require("../../util/general");
var redux_persist_filesystem_storage_1 = require("redux-persist-filesystem-storage");
var device_1 = require("../../util/device");
exports.controllerList = [
    { name: 'AccountTrackerController' },
    { name: 'AddressBookController' },
    { name: 'AssetsContractController' },
    { name: 'NftController' },
    { name: 'TokensController' },
    { name: 'TokenDetectionController' },
    { name: 'NftDetectionController' },
    {
        name: 'KeyringController'
    },
    { name: 'AccountTrackerController' },
    {
        name: 'NetworkController'
    },
    { name: 'PhishingController' },
    { name: 'PreferencesController' },
    { name: 'TokenBalancesController' },
    { name: 'TokenRatesController' },
    { name: 'TransactionController' },
    { name: 'SwapsController' },
    {
        name: 'TokenListController'
    },
    {
        name: 'CurrencyRateController'
    },
    {
        name: 'GasFeeController'
    },
    {
        name: 'ApprovalController'
    },
    {
        name: 'SnapController'
    },
    {
        name: 'subjectMetadataController'
    },
    {
        name: 'PermissionController'
    },
    {
        name: 'LoggingController'
    },
    {
        name: 'PPOMController'
    },
];
/**
 * Migrate back to use the old root architecture (Single root object)
 *
 * @param {unknown} state - Redux state
 * @returns
 */
function migrate(state) {
    return __awaiter(this, void 0, void 0, function () {
        var newEngineState, controllerMergeMigration, rootKey, controllerDeleteMigration, e_1;
        var _this = this;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!(0, utils_1.isObject)(state)) {
                        (0, react_native_1.captureException)(new Error("Migration 28: Invalid root state: root state is not an object"));
                        return [2 /*return*/, state];
                    }
                    // Engine already exists. No need to migrate.
                    if (state.engine) {
                        return [2 /*return*/, state];
                    }
                    newEngineState = { backgroundState: {} };
                    controllerMergeMigration = exports.controllerList.map(function (_c) {
                        var controllerName = _c.name;
                        return __awaiter(_this, void 0, void 0, function () {
                            var persistedControllerKey, persistedControllerData, persistedControllerJSON, _persist, controllerJSON, e_2;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        persistedControllerKey = "persist:".concat(controllerName);
                                        _d.label = 1;
                                    case 1:
                                        _d.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, redux_persist_filesystem_storage_1["default"].getItem(persistedControllerKey)];
                                    case 2:
                                        persistedControllerData = _d.sent();
                                        if (persistedControllerData) {
                                            persistedControllerJSON = (0, general_1.deepJSONParse)({
                                                jsonString: persistedControllerData
                                            });
                                            if ((0, utils_1.hasProperty)(persistedControllerJSON, '_persist')) {
                                                _persist = persistedControllerJSON._persist, controllerJSON = __rest(persistedControllerJSON, ["_persist"]);
                                                newEngineState.backgroundState[controllerName] = controllerJSON;
                                            }
                                            else {
                                                newEngineState.backgroundState[controllerName] =
                                                    persistedControllerJSON;
                                            }
                                        }
                                        return [3 /*break*/, 4];
                                    case 3:
                                        e_2 = _d.sent();
                                        (0, react_native_1.captureException)(new Error("Migration 28: Failed to populate root object with persisted controller data for key ".concat(persistedControllerKey, ": ").concat(String(e_2))));
                                        return [3 /*break*/, 4];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    // Execute controller merge migration in parallel
                    return [4 /*yield*/, Promise.all(controllerMergeMigration)];
                case 1:
                    // Execute controller merge migration in parallel
                    _c.sent();
                    // Set engine on root object
                    state.engine = newEngineState;
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 5, , 6]);
                    rootKey = "persist:root";
                    // Manually update the persisted root file
                    return [4 /*yield*/, redux_persist_filesystem_storage_1["default"].setItem(rootKey, JSON.stringify(state), device_1["default"].isIos())];
                case 3:
                    // Manually update the persisted root file
                    _c.sent();
                    controllerDeleteMigration = exports.controllerList.map(function (_c) {
                        var name = _c.name;
                        return __awaiter(_this, void 0, void 0, function () {
                            var persistedControllerKey, e_3;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        persistedControllerKey = "persist:".concat(name);
                                        _d.label = 1;
                                    case 1:
                                        _d.trys.push([1, 3, , 4]);
                                        // Remove persisted controller file
                                        return [4 /*yield*/, redux_persist_filesystem_storage_1["default"].removeItem(persistedControllerKey)];
                                    case 2:
                                        // Remove persisted controller file
                                        _d.sent();
                                        return [3 /*break*/, 4];
                                    case 3:
                                        e_3 = _d.sent();
                                        (0, react_native_1.captureException)(new Error("Migration 28: Failed to remove key ".concat(persistedControllerKey, ": ").concat(String(e_3))));
                                        return [3 /*break*/, 4];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    // Execute deleting persisted controller files in parallel
                    return [4 /*yield*/, Promise.all(controllerDeleteMigration)];
                case 4:
                    // Execute deleting persisted controller files in parallel
                    _c.sent();
                    return [3 /*break*/, 6];
                case 5:
                    e_1 = _c.sent();
                    (0, react_native_1.captureException)(new Error("Migration 28: Failed to get root data: ".concat(String(e_1))));
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/, state];
            }
        });
    });
}
exports["default"] = migrate;
