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
var Engine_1 = require("../Engine");
var AppConstants_1 = require("../AppConstants");
var BackupVault_1 = require("../BackupVault");
var store_1 = require("../../store");
var Logger_1 = require("../../util/Logger");
var error_1 = require("../../constants/error");
var UPDATE_BG_STATE_KEY = 'UPDATE_BG_STATE';
var INIT_BG_STATE_KEY = 'INIT_BG_STATE';
var EngineService = /** @class */ (function () {
    function EngineService() {
        var _this = this;
        this.engineInitialized = false;
        /**
         * Initializer for the EngineService
         *
         * @param store - Redux store
         */
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.initalizeEngine = function (store) {
            var _c, _d;
            var reduxState = (_c = store.getState) === null || _c === void 0 ? void 0 : _c.call(store);
            var state = ((_d = reduxState === null || reduxState === void 0 ? void 0 : reduxState.engine) === null || _d === void 0 ? void 0 : _d.backgroundState) || {};
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            var Engine = Engine_1["default"];
            Engine.init(state);
            _this.updateControllers(store, Engine);
        };
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.updateControllers = function (store, engine) {
            var _c, _d;
            if (!engine.context) {
                Logger_1["default"].error(new Error('Engine context does not exists. Redux will not be updated from controller state updates!'));
                return;
            }
            var controllers = [
                { name: 'AddressBookController' },
                { name: 'AssetsContractController' },
                { name: 'NftController' },
                {
                    name: 'TokensController'
                },
                {
                    name: 'TokenDetectionController',
                    key: "".concat(engine.context.TokenDetectionController.name, ":stateChange")
                },
                { name: 'NftDetectionController' },
                {
                    name: 'KeyringController',
                    key: "".concat(engine.context.KeyringController.name, ":stateChange")
                },
                { name: 'AccountTrackerController' },
                {
                    name: 'NetworkController',
                    key: AppConstants_1["default"].NETWORK_STATE_CHANGE_EVENT
                },
                {
                    name: 'PhishingController',
                    key: "".concat(engine.context.PhishingController.name, ":maybeUpdateState")
                },
                {
                    name: 'PreferencesController',
                    key: "".concat(engine.context.PreferencesController.name, ":stateChange")
                },
                {
                    name: 'TokenBalancesController',
                    key: "".concat(engine.context.TokenBalancesController.name, ":stateChange")
                },
                { name: 'TokenRatesController' },
                {
                    name: 'TransactionController',
                    key: "".concat(engine.context.TransactionController.name, ":stateChange")
                },
                { name: 'SmartTransactionsController' },
                { name: 'SwapsController' },
                {
                    name: 'TokenListController',
                    key: "".concat(engine.context.TokenListController.name, ":stateChange")
                },
                {
                    name: 'CurrencyRateController',
                    key: "".concat(engine.context.CurrencyRateController.name, ":stateChange")
                },
                {
                    name: 'GasFeeController',
                    key: "".concat(engine.context.GasFeeController.name, ":stateChange")
                },
                {
                    name: 'ApprovalController',
                    key: "".concat(engine.context.ApprovalController.name, ":stateChange")
                },
                ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
                {
                    name: 'SnapController',
                    key: "".concat(engine.context.SnapController.name, ":stateChange")
                },
                {
                    name: 'SubjectMetadataController',
                    key: "".concat(engine.context.SubjectMetadataController.name, ":stateChange")
                },
                {
                    name: 'AuthenticationController',
                    key: 'AuthenticationController:stateChange'
                },
                {
                    name: 'UserStorageController',
                    key: 'UserStorageController:stateChange'
                },
                {
                    name: 'NotificationServicesController',
                    key: 'NotificationServicesController:stateChange'
                },
                ///: END:ONLY_INCLUDE_IF
                {
                    name: 'PermissionController',
                    key: "".concat(engine.context.PermissionController.name, ":stateChange")
                },
                {
                    name: 'LoggingController',
                    key: "".concat(engine.context.LoggingController.name, ":stateChange")
                },
                {
                    name: 'AccountsController',
                    key: "".concat(engine.context.AccountsController.name, ":stateChange")
                },
                {
                    name: 'PPOMController',
                    key: "".concat(engine.context.PPOMController.name, ":stateChange")
                },
                {
                    name: 'AuthenticationController',
                    key: "AuthenticationController:stateChange"
                },
                {
                    name: 'UserStorageController',
                    key: "UserStorageController:stateChange"
                },
                {
                    name: 'NotificationServicesController',
                    key: "NotificationServicesController:stateChange"
                },
            ];
            (_d = (_c = engine === null || engine === void 0 ? void 0 : engine.datamodel) === null || _c === void 0 ? void 0 : _c.subscribe) === null || _d === void 0 ? void 0 : _d.call(_c, function () {
                if (!engine.context.KeyringController.metadata.vault) {
                    Logger_1["default"].log('keyringController vault missing for INIT_BG_STATE_KEY');
                }
                if (!_this.engineInitialized) {
                    store.dispatch({ type: INIT_BG_STATE_KEY });
                    _this.engineInitialized = true;
                }
            });
            controllers.forEach(function (controller) {
                var name = controller.name, _c = controller.key, key = _c === void 0 ? undefined : _c;
                var update_bg_state_cb = function () {
                    if (!engine.context.KeyringController.metadata.vault) {
                        Logger_1["default"].log('keyringController vault missing for UPDATE_BG_STATE_KEY');
                    }
                    store.dispatch({ type: UPDATE_BG_STATE_KEY, payload: { key: name } });
                };
                if (key) {
                    engine.controllerMessenger.subscribe(key, update_bg_state_cb);
                }
                else {
                    engine.context[name].subscribe(update_bg_state_cb);
                }
            });
        };
    }
    /**
     * Initialize the engine with a backup vault from the Secure KeyChain
     *
     * @returns Promise<InitializeEngineResult>
     * InitializeEngineResult {
          success: boolean;
          error?: string;
        }
     */
    EngineService.prototype.initializeVaultFromBackup = function () {
        var _c, _d;
        return __awaiter(this, void 0, void 0, function () {
            var keyringState, reduxState, state, Engine, newKeyringState, instance;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, (0, BackupVault_1.getVaultFromBackup)()];
                    case 1:
                        keyringState = _e.sent();
                        reduxState = (_c = store_1.store.getState) === null || _c === void 0 ? void 0 : _c.call(store_1.store);
                        state = ((_d = reduxState === null || reduxState === void 0 ? void 0 : reduxState.engine) === null || _d === void 0 ? void 0 : _d.backgroundState) || {};
                        Engine = Engine_1["default"];
                        // This ensures we create an entirely new engine
                        return [4 /*yield*/, Engine.destroyEngine()];
                    case 2:
                        // This ensures we create an entirely new engine
                        _e.sent();
                        this.engineInitialized = false;
                        if (!keyringState) return [3 /*break*/, 5];
                        newKeyringState = {
                            keyrings: [],
                            vault: keyringState.vault
                        };
                        instance = Engine.init(state, newKeyringState);
                        if (!instance) return [3 /*break*/, 4];
                        this.updateControllers(store_1.store, instance);
                        // this is a hack to give the engine time to reinitialize
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 2000); })];
                    case 3:
                        // this is a hack to give the engine time to reinitialize
                        _e.sent();
                        return [2 /*return*/, {
                                success: true
                            }];
                    case 4: return [2 /*return*/, {
                            success: false,
                            error: error_1.VAULT_CREATION_ERROR
                        }];
                    case 5: return [2 /*return*/, {
                            success: false,
                            error: error_1.NO_VAULT_IN_BACKUP_ERROR
                        }];
                }
            });
        });
    };
    return EngineService;
}());
/**
 * EngineService class used for initializing and subscribing to the engine controllers
 */
exports["default"] = new EngineService();
