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
exports.getRpcMethodMiddleware = exports.checkActiveAccountAndChainId = exports.ApprovalTypes = void 0;
var react_native_1 = require("react-native");
var react_native_device_info_1 = require("react-native-device-info");
var json_rpc_engine_1 = require("json-rpc-engine");
var rpc_errors_1 = require("@metamask/rpc-errors");
var eth_sig_util_1 = require("@metamask/eth-sig-util");
var index_1 = require("./index");
var network_1 = require("../../constants/network");
var controller_utils_1 = require("@metamask/controller-utils");
var permission_controller_2 = require("@metamask/permission-controller");
var networks_1 = require("../../util/networks");
var utils_1 = require("./utils");
var spam_1 = require("./spam");
var Engine_1 = require("../Engine");
var i18n_1 = require("../../../locales/i18n");
var address_1 = require("../../util/address");
var store_1 = require("../../store");
var bookmarks_1 = require("../../actions/bookmarks");
var wizard_1 = require("../../actions/wizard");
var uuid_2 = require("uuid");
var Permissions_1 = require("../Permissions");
var AppConstants_1 = require("../AppConstants");
var ppom_util_1 = require("../../lib/ppom/ppom-util");
var networkController_1 = require("../../selectors/networkController");
var rpcEvents_1 = require("../../actions/rpcEvents");
var rpcEvents_2 = require("../../reducers/rpcEvents");
var regex_1 = require("../../../app/util/regex");
var Logger_1 = require("../../../app/util/Logger");
var DevLogger_1 = require("../SDKConnect/utils/DevLogger");
var transaction_controller_1 = require("../../util/transaction-controller");
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var Engine = Engine_1["default"];
var appVersion = '';
var ApprovalTypes;
(function (ApprovalTypes) {
    ApprovalTypes["CONNECT_ACCOUNTS"] = "CONNECT_ACCOUNTS";
    ApprovalTypes["SIGN_MESSAGE"] = "SIGN_MESSAGE";
    ApprovalTypes["ADD_ETHEREUM_CHAIN"] = "ADD_ETHEREUM_CHAIN";
    ApprovalTypes["SWITCH_ETHEREUM_CHAIN"] = "SWITCH_ETHEREUM_CHAIN";
    ApprovalTypes["REQUEST_PERMISSIONS"] = "wallet_requestPermissions";
    ApprovalTypes["WALLET_CONNECT"] = "WALLET_CONNECT";
    ApprovalTypes["ETH_SIGN"] = "eth_sign";
    ApprovalTypes["PERSONAL_SIGN"] = "personal_sign";
    ApprovalTypes["ETH_SIGN_TYPED_DATA"] = "eth_signTypedData";
    ApprovalTypes["WATCH_ASSET"] = "wallet_watchAsset";
    ApprovalTypes["TRANSACTION"] = "transaction";
    ApprovalTypes["RESULT_ERROR"] = "result_error";
    ApprovalTypes["RESULT_SUCCESS"] = "result_success";
    ApprovalTypes["SMART_TRANSACTION_STATUS"] = "smart_transaction_status";
    ///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
    ApprovalTypes["INSTALL_SNAP"] = "wallet_installSnap";
    ApprovalTypes["UPDATE_SNAP"] = "wallet_updateSnap";
    ///: END:ONLY_INCLUDE_IF
})(ApprovalTypes = exports.ApprovalTypes || (exports.ApprovalTypes = {}));
// Also used by WalletConnect.js.
var checkActiveAccountAndChainId = function (_c) {
    var address = _c.address, chainId = _c.chainId, channelId = _c.channelId, hostname = _c.hostname, isWalletConnect = _c.isWalletConnect;
    return __awaiter(void 0, void 0, void 0, function () {
        var isInvalidAccount, formattedAddress, permissionsController, origin_1, accounts, normalizedAccounts, providerConfig, networkType, isInitialNetwork, activeChainId, chainIdRequest;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    isInvalidAccount = false;
                    if (!address) return [3 /*break*/, 2];
                    formattedAddress = (0, address_1.safeToChecksumAddress)(address);
                    DevLogger_1["default"].log('checkActiveAccountAndChainId', {
                        address: address,
                        chainId: chainId,
                        channelId: channelId,
                        hostname: hostname,
                        formattedAddress: formattedAddress
                    });
                    permissionsController = Engine.context.PermissionController;
                    DevLogger_1["default"].log("checkActiveAccountAndChainId channelId=".concat(channelId, " isWalletConnect=").concat(isWalletConnect, " hostname=").concat(hostname), permissionsController.state);
                    origin_1 = isWalletConnect ? hostname : channelId !== null && channelId !== void 0 ? channelId : hostname;
                    return [4 /*yield*/, (0, Permissions_1.getPermittedAccounts)(origin_1)];
                case 1:
                    accounts = _d.sent();
                    normalizedAccounts = accounts.map(address_1.safeToChecksumAddress);
                    if (!normalizedAccounts.includes(formattedAddress)) {
                        DevLogger_1["default"].log("invalid accounts ".concat(formattedAddress), normalizedAccounts);
                        isInvalidAccount = true;
                        if (accounts.length > 0) {
                            // Permissions issue --- requesting incorrect address
                            throw rpc_errors_1.rpcErrors.invalidParams({
                                message: "Invalid parameters: must provide a permitted Ethereum address."
                            });
                        }
                    }
                    if (isInvalidAccount) {
                        throw rpc_errors_1.rpcErrors.invalidParams({
                            message: "Invalid parameters: must provide an Ethereum address."
                        });
                    }
                    _d.label = 2;
                case 2:
                    DevLogger_1["default"].log("checkActiveAccountAndChainId isInvalidAccount=".concat(isInvalidAccount));
                    if (chainId) {
                        providerConfig = (0, networkController_1.selectProviderConfig)(store_1.store.getState());
                        networkType = providerConfig.type;
                        isInitialNetwork = networkType && (0, networks_1.getAllNetworks)().includes(networkType);
                        activeChainId = void 0;
                        if (isInitialNetwork) {
                            activeChainId = controller_utils_1.ChainId[networkType];
                        }
                        else if (networkType === network_1.RPC) {
                            activeChainId = providerConfig.chainId;
                        }
                        if (activeChainId && !activeChainId.startsWith('0x')) {
                            // Convert to hex
                            activeChainId = "0x".concat(parseInt(activeChainId, 10).toString(16));
                        }
                        chainIdRequest = String(chainId);
                        if (chainIdRequest && !chainIdRequest.startsWith('0x')) {
                            // Convert to hex
                            chainIdRequest = "0x".concat(parseInt(chainIdRequest, 10).toString(16));
                        }
                        if (activeChainId !== chainIdRequest) {
                            react_native_1.Alert.alert("Active chainId is ".concat(activeChainId, " but received ").concat(chainIdRequest));
                            throw rpc_errors_1.rpcErrors.invalidParams({
                                message: "Invalid parameters: active chainId is different than the one provided."
                            });
                        }
                    }
                    return [2 /*return*/];
            }
        });
    });
};
exports.checkActiveAccountAndChainId = checkActiveAccountAndChainId;
var generateRawSignature = function (_c) {
    var version = _c.version, req = _c.req, hostname = _c.hostname, url = _c.url, title = _c.title, icon = _c.icon, analytics = _c.analytics, chainId = _c.chainId, channelId = _c.channelId, getSource = _c.getSource, isWalletConnect = _c.isWalletConnect, checkTabActive = _c.checkTabActive;
    return __awaiter(void 0, void 0, void 0, function () {
        var SignatureController, pageMeta, rawSig;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    SignatureController = Engine.context.SignatureController;
                    pageMeta = {
                        meta: {
                            url: url.current,
                            title: title.current,
                            icon: icon.current,
                            channelId: channelId,
                            analytics: {
                                request_source: getSource(),
                                request_platform: analytics === null || analytics === void 0 ? void 0 : analytics.platform
                            }
                        }
                    };
                    checkTabActive();
                    return [4 /*yield*/, (0, exports.checkActiveAccountAndChainId)({
                            hostname: hostname,
                            channelId: channelId,
                            address: req.params[0],
                            chainId: chainId,
                            isWalletConnect: isWalletConnect
                        })];
                case 1:
                    _d.sent();
                    return [4 /*yield*/, SignatureController.newUnsignedTypedMessage(__assign(__assign({ data: req.params[1], from: req.params[0] }, pageMeta), { channelId: channelId, origin: hostname, securityAlertResponse: req.securityAlertResponse }), req, version, {
                            parseJsonData: false
                        })];
                case 2:
                    rawSig = _d.sent();
                    return [2 /*return*/, rawSig];
            }
        });
    });
};
/**
 * Handle RPC methods called by dapps
 */
var getRpcMethodMiddleware = function (_c) {
    var hostname = _c.hostname, channelId = _c.channelId, getProviderState = _c.getProviderState, navigation = _c.navigation, 
    // Website info
    url = _c.url, title = _c.title, icon = _c.icon, 
    // Bookmarks
    isHomepage = _c.isHomepage, 
    // Show autocomplete
    fromHomepage = _c.fromHomepage, toggleUrlModal = _c.toggleUrlModal, 
    // Wizard
    wizardScrollAdjusted = _c.wizardScrollAdjusted, 
    // For the browser
    tabId = _c.tabId, 
    // For WalletConnect
    isWalletConnect = _c.isWalletConnect, 
    // For MM SDK
    isMMSDK = _c.isMMSDK, injectHomePageScripts = _c.injectHomePageScripts, 
    // For analytics
    analytics = _c.analytics;
    // Make sure to always have the correct origin
    hostname = hostname.replace(AppConstants_1["default"].MM_SDK.SDK_REMOTE_ORIGIN, '');
    DevLogger_1["default"].log("getRpcMethodMiddleware hostname=".concat(hostname, " channelId=").concat(channelId));
    // all user facing RPC calls not implemented by the provider
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (0, json_rpc_engine_1.createAsyncMiddleware)(function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
        var getEthAccounts, checkTabActive, getSource, startApprovalFlow, endApprovalFlow, setApprovalFlowLoadingText, requestUserApproval, _c, requestPermissionsHandler, getPermissionsHandler, rpcMethods, blockRefIndex, blockRef, isWhiteListedMethod, error_1;
        var _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    getEthAccounts = function () { return __awaiter(void 0, void 0, void 0, function () {
                        var origin, accounts;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    origin = isWalletConnect ? hostname : channelId !== null && channelId !== void 0 ? channelId : hostname;
                                    return [4 /*yield*/, (0, Permissions_1.getPermittedAccounts)(origin)];
                                case 1:
                                    accounts = _c.sent();
                                    res.result = accounts;
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    checkTabActive = function () {
                        if (!tabId)
                            return true;
                        var browser = store_1.store.getState().browser;
                        if (tabId !== browser.activeTab)
                            throw rpc_errors_1.providerErrors.userRejectedRequest();
                    };
                    getSource = function () {
                        if (analytics === null || analytics === void 0 ? void 0 : analytics.isRemoteConn)
                            return AppConstants_1["default"].REQUEST_SOURCES.SDK_REMOTE_CONN;
                        if (isWalletConnect)
                            return AppConstants_1["default"].REQUEST_SOURCES.WC;
                        return AppConstants_1["default"].REQUEST_SOURCES.IN_APP_BROWSER;
                    };
                    startApprovalFlow = function (opts) {
                        checkTabActive();
                        Engine.context.ApprovalController.clear(rpc_errors_1.providerErrors.userRejectedRequest());
                        return Engine.context.ApprovalController.startFlow(opts);
                    };
                    endApprovalFlow = function (opts) {
                        Engine.context.ApprovalController.endFlow(opts);
                    };
                    setApprovalFlowLoadingText = function (opts) {
                        Engine.context.ApprovalController.setFlowLoadingText(opts);
                    };
                    requestUserApproval = function (_c) {
                        var _d = _c.type, type = _d === void 0 ? '' : _d, _e = _c.requestData, requestData = _e === void 0 ? {} : _e;
                        return __awaiter(void 0, void 0, void 0, function () {
                            var responseData;
                            return __generator(this, function (_f) {
                                switch (_f.label) {
                                    case 0:
                                        checkTabActive();
                                        return [4 /*yield*/, Engine.context.ApprovalController.clear(rpc_errors_1.providerErrors.userRejectedRequest())];
                                    case 1:
                                        _f.sent();
                                        return [4 /*yield*/, Engine.context.ApprovalController.add({
                                                origin: hostname,
                                                type: type,
                                                requestData: __assign(__assign({}, requestData), { pageMeta: {
                                                        url: url.current,
                                                        title: title.current,
                                                        icon: icon.current,
                                                        channelId: channelId,
                                                        analytics: {
                                                            request_source: getSource(),
                                                            request_platform: analytics === null || analytics === void 0 ? void 0 : analytics.platform
                                                        }
                                                    } }),
                                                id: (0, uuid_2.v1)()
                                            })];
                                    case 2:
                                        responseData = _f.sent();
                                        return [2 /*return*/, responseData];
                                }
                            });
                        });
                    };
                    _c = permission_controller_2.permissionRpcMethods.handlers, requestPermissionsHandler = _c[0], getPermissionsHandler = _c[1];
                    rpcMethods = {
                        wallet_getPermissions: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_c) {
                                // TODO: Replace "any" with type
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                return [2 /*return*/, new Promise(function (resolve) {
                                        var handle = getPermissionsHandler.implementation(req, res, next, function () {
                                            resolve(undefined);
                                        }, {
                                            getPermissionsForOrigin: Engine.context.PermissionController.getPermissions.bind(Engine.context.PermissionController, channelId !== null && channelId !== void 0 ? channelId : hostname)
                                        });
                                        handle === null || handle === void 0 ? void 0 : handle["catch"](function (error) {
                                            Logger_1["default"].error(error, 'Failed to get permissions');
                                        });
                                    })];
                            });
                        }); },
                        wallet_requestPermissions: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_c) {
                                // TODO: Replace "any" with type
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                return [2 /*return*/, new Promise(function (resolve, reject) {
                                        var _c;
                                        (_c = requestPermissionsHandler
                                            .implementation(req, res, next, function (err) {
                                            if (err) {
                                                return reject(err);
                                            }
                                            resolve(undefined);
                                        }, {
                                            requestPermissionsForOrigin: Engine.context.PermissionController.requestPermissions.bind(Engine.context.PermissionController, { origin: channelId !== null && channelId !== void 0 ? channelId : hostname }, req.params[0])
                                        })) === null || _c === void 0 ? void 0 : _c.then(resolve)["catch"](reject);
                                    })];
                            });
                        }); },
                        eth_getTransactionByHash: function () { return __awaiter(void 0, void 0, void 0, function () {
                            var _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        _c = res;
                                        return [4 /*yield*/, (0, utils_1.polyfillGasPrice)('getTransactionByHash', req.params)];
                                    case 1:
                                        _c.result = _d.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); },
                        eth_getTransactionByBlockHashAndIndex: function () { return __awaiter(void 0, void 0, void 0, function () {
                            var _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        _c = res;
                                        return [4 /*yield*/, (0, utils_1.polyfillGasPrice)('getTransactionByBlockHashAndIndex', req.params)];
                                    case 1:
                                        _c.result = _d.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); },
                        eth_getTransactionByBlockNumberAndIndex: function () { return __awaiter(void 0, void 0, void 0, function () {
                            var _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        _c = res;
                                        return [4 /*yield*/, (0, utils_1.polyfillGasPrice)('getTransactionByBlockNumberAndIndex', req.params)];
                                    case 1:
                                        _c.result = _d.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); },
                        eth_chainId: function () { return __awaiter(void 0, void 0, void 0, function () {
                            var providerConfig, networkType, isInitialNetwork, chainId;
                            return __generator(this, function (_c) {
                                providerConfig = (0, networkController_1.selectProviderConfig)(store_1.store.getState());
                                networkType = providerConfig.type;
                                isInitialNetwork = networkType && (0, networks_1.getAllNetworks)().includes(networkType);
                                if (isInitialNetwork) {
                                    chainId = controller_utils_1.ChainId[networkType];
                                }
                                else if (networkType === network_1.RPC) {
                                    chainId = providerConfig.chainId;
                                }
                                if (chainId && !chainId.startsWith('0x')) {
                                    chainId = (0, controller_utils_1.toHex)(chainId);
                                }
                                res.result = chainId;
                                return [2 /*return*/];
                            });
                        }); },
                        eth_hashrate: function () {
                            res.result = '0x00';
                        },
                        eth_mining: function () {
                            res.result = false;
                        },
                        net_listening: function () {
                            res.result = true;
                        },
                        net_version: function () { return __awaiter(void 0, void 0, void 0, function () {
                            var networkType, isInitialNetwork;
                            return __generator(this, function (_c) {
                                networkType = (0, networkController_1.selectProviderType)(store_1.store.getState());
                                isInitialNetwork = networkType && (0, networks_1.getAllNetworks)().includes(networkType);
                                if (isInitialNetwork) {
                                    // TODO: Replace "any" with type
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    res.result = networks_1["default"][networkType].networkId;
                                }
                                else {
                                    return [2 /*return*/, next()];
                                }
                                return [2 /*return*/];
                            });
                        }); },
                        eth_requestAccounts: function () { return __awaiter(void 0, void 0, void 0, function () {
                            var params, origin, permittedAccounts, acc, error_2;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        params = req.params;
                                        origin = isWalletConnect ? hostname : channelId !== null && channelId !== void 0 ? channelId : hostname;
                                        return [4 /*yield*/, (0, Permissions_1.getPermittedAccounts)(origin)];
                                    case 1:
                                        permittedAccounts = _c.sent();
                                        if (!(!(params === null || params === void 0 ? void 0 : params.force) && permittedAccounts.length)) return [3 /*break*/, 2];
                                        res.result = permittedAccounts;
                                        return [3 /*break*/, 6];
                                    case 2:
                                        _c.trys.push([2, 5, , 6]);
                                        checkTabActive();
                                        return [4 /*yield*/, Engine.context.PermissionController.requestPermissions({ origin: origin }, { eth_accounts: {} })];
                                    case 3:
                                        _c.sent();
                                        DevLogger_1["default"].log("eth_requestAccounts requestPermissions");
                                        return [4 /*yield*/, (0, Permissions_1.getPermittedAccounts)(origin)];
                                    case 4:
                                        acc = _c.sent();
                                        DevLogger_1["default"].log("eth_requestAccounts getPermittedAccounts", acc);
                                        res.result = acc;
                                        return [3 /*break*/, 6];
                                    case 5:
                                        error_2 = _c.sent();
                                        DevLogger_1["default"].log("eth_requestAccounts error", error_2);
                                        if (error_2) {
                                            throw rpc_errors_1.providerErrors.userRejectedRequest('User denied account authorization.');
                                        }
                                        return [3 /*break*/, 6];
                                    case 6: return [2 /*return*/];
                                }
                            });
                        }); },
                        eth_coinbase: getEthAccounts,
                        parity_defaultAccount: getEthAccounts,
                        eth_sendTransaction: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_c) {
                                checkTabActive();
                                return [2 /*return*/, index_1["default"].eth_sendTransaction({
                                        hostname: hostname,
                                        req: req,
                                        res: res,
                                        sendTransaction: transaction_controller_1.addTransaction,
                                        validateAccountAndChainId: function (_c) {
                                            var from = _c.from, chainId = _c.chainId;
                                            return __awaiter(void 0, void 0, void 0, function () {
                                                return __generator(this, function (_d) {
                                                    switch (_d.label) {
                                                        case 0: return [4 /*yield*/, (0, exports.checkActiveAccountAndChainId)({
                                                                hostname: hostname,
                                                                address: from,
                                                                channelId: channelId,
                                                                chainId: chainId,
                                                                isWalletConnect: isWalletConnect
                                                            })];
                                                        case 1:
                                                            _d.sent();
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            });
                                        }
                                    })];
                            });
                        }); },
                        eth_sign: function () { return __awaiter(void 0, void 0, void 0, function () {
                            var _c, SignatureController, PreferencesController, disabledRpcMethodPreferences, eth_sign, pageMeta, rawSig;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        _c = Engine.context, SignatureController = _c.SignatureController, PreferencesController = _c.PreferencesController;
                                        disabledRpcMethodPreferences = PreferencesController.state.disabledRpcMethodPreferences;
                                        eth_sign = disabledRpcMethodPreferences.eth_sign;
                                        if (!eth_sign) {
                                            throw rpc_errors_1.rpcErrors.methodNotFound('eth_sign has been disabled. You must enable it in the advanced settings');
                                        }
                                        pageMeta = {
                                            meta: {
                                                url: url.current,
                                                title: title.current,
                                                icon: icon.current,
                                                channelId: channelId,
                                                analytics: {
                                                    request_source: getSource(),
                                                    request_platform: analytics === null || analytics === void 0 ? void 0 : analytics.platform
                                                }
                                            }
                                        };
                                        checkTabActive();
                                        if (!(req.params[1].length === 66 || req.params[1].length === 67)) return [3 /*break*/, 3];
                                        return [4 /*yield*/, (0, exports.checkActiveAccountAndChainId)({
                                                hostname: hostname,
                                                channelId: channelId,
                                                address: req.params[0].from,
                                                isWalletConnect: isWalletConnect
                                            })];
                                    case 1:
                                        _d.sent();
                                        ppom_util_1["default"].validateRequest(req);
                                        return [4 /*yield*/, SignatureController.newUnsignedMessage(__assign(__assign({ data: req.params[1], from: req.params[0] }, pageMeta), { origin: hostname }))];
                                    case 2:
                                        rawSig = _d.sent();
                                        res.result = rawSig;
                                        return [3 /*break*/, 4];
                                    case 3:
                                        res.result = AppConstants_1["default"].ETH_SIGN_ERROR;
                                        throw rpc_errors_1.rpcErrors.invalidParams(AppConstants_1["default"].ETH_SIGN_ERROR);
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); },
                        personal_sign: function () { return __awaiter(void 0, void 0, void 0, function () {
                            var SignatureController, firstParam, secondParam, params, pageMeta, rawSig;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        SignatureController = Engine.context.SignatureController;
                                        firstParam = req.params[0];
                                        secondParam = req.params[1];
                                        params = {
                                            data: firstParam,
                                            from: secondParam
                                        };
                                        if ((0, address_1.resemblesAddress)(firstParam) && !(0, address_1.resemblesAddress)(secondParam)) {
                                            params.data = secondParam;
                                            params.from = firstParam;
                                        }
                                        pageMeta = {
                                            meta: {
                                                url: url.current,
                                                channelId: channelId,
                                                title: title.current,
                                                icon: icon.current,
                                                analytics: {
                                                    request_source: getSource(),
                                                    request_platform: analytics === null || analytics === void 0 ? void 0 : analytics.platform
                                                }
                                            }
                                        };
                                        checkTabActive();
                                        return [4 /*yield*/, (0, exports.checkActiveAccountAndChainId)({
                                                hostname: hostname,
                                                channelId: channelId,
                                                address: params.from,
                                                isWalletConnect: isWalletConnect
                                            })];
                                    case 1:
                                        _c.sent();
                                        DevLogger_1["default"].log("personal_sign", params, pageMeta, hostname);
                                        ppom_util_1["default"].validateRequest(req);
                                        return [4 /*yield*/, SignatureController.newUnsignedPersonalMessage(__assign(__assign(__assign({}, params), pageMeta), { origin: hostname }))];
                                    case 2:
                                        rawSig = _c.sent();
                                        res.result = rawSig;
                                        return [2 /*return*/];
                                }
                            });
                        }); },
                        personal_ecRecover: function () {
                            var data = req.params[0];
                            var signature = req.params[1];
                            var address = (0, eth_sig_util_1.recoverPersonalSignature)({ data: data, signature: signature });
                            res.result = address;
                        },
                        parity_checkRequest: function () {
                            // This method is retained for legacy reasons
                            // It doesn't serve it's intended purpose anymore of checking parity requests,
                            // because our API doesn't support parity requests.
                            res.result = null;
                        },
                        eth_signTypedData: function () { return __awaiter(void 0, void 0, void 0, function () {
                            var SignatureController, pageMeta, rawSig;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        SignatureController = Engine.context.SignatureController;
                                        pageMeta = {
                                            meta: {
                                                url: url.current,
                                                title: title.current,
                                                icon: icon.current,
                                                channelId: channelId,
                                                analytics: {
                                                    request_source: getSource(),
                                                    request_platform: analytics === null || analytics === void 0 ? void 0 : analytics.platform
                                                }
                                            }
                                        };
                                        checkTabActive();
                                        return [4 /*yield*/, (0, exports.checkActiveAccountAndChainId)({
                                                hostname: hostname,
                                                channelId: channelId,
                                                address: req.params[1],
                                                isWalletConnect: isWalletConnect
                                            })];
                                    case 1:
                                        _c.sent();
                                        ppom_util_1["default"].validateRequest(req);
                                        return [4 /*yield*/, SignatureController.newUnsignedTypedMessage(__assign(__assign({ data: req.params[0], from: req.params[1] }, pageMeta), { origin: hostname }), req, 'V1')];
                                    case 2:
                                        rawSig = _c.sent();
                                        res.result = rawSig;
                                        return [2 /*return*/];
                                }
                            });
                        }); },
                        eth_signTypedData_v3: function () { return __awaiter(void 0, void 0, void 0, function () {
                            var data, chainId, _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        data = typeof req.params[1] === 'string'
                                            ? JSON.parse(req.params[1])
                                            : req.params[1];
                                        chainId = data.domain.chainId;
                                        ppom_util_1["default"].validateRequest(req);
                                        _c = res;
                                        return [4 /*yield*/, generateRawSignature({
                                                version: 'V3',
                                                req: req,
                                                hostname: hostname,
                                                url: url,
                                                title: title,
                                                icon: icon,
                                                analytics: analytics,
                                                isMMSDK: isMMSDK,
                                                channelId: channelId,
                                                isWalletConnect: isWalletConnect,
                                                chainId: chainId,
                                                getSource: getSource,
                                                checkTabActive: checkTabActive
                                            })];
                                    case 1:
                                        _c.result = _d.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); },
                        eth_signTypedData_v4: function () { return __awaiter(void 0, void 0, void 0, function () {
                            var data, chainId, _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        data = JSON.parse(req.params[1]);
                                        chainId = data.domain.chainId;
                                        ppom_util_1["default"].validateRequest(req);
                                        _c = res;
                                        return [4 /*yield*/, generateRawSignature({
                                                version: 'V4',
                                                req: req,
                                                hostname: hostname,
                                                url: url,
                                                title: title,
                                                icon: icon,
                                                analytics: analytics,
                                                isMMSDK: isMMSDK,
                                                channelId: channelId,
                                                isWalletConnect: isWalletConnect,
                                                chainId: chainId,
                                                getSource: getSource,
                                                checkTabActive: checkTabActive
                                            })];
                                    case 1:
                                        _c.result = _d.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); },
                        web3_clientVersion: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        if (!!appVersion) return [3 /*break*/, 2];
                                        return [4 /*yield*/, (0, react_native_device_info_1.getVersion)()];
                                    case 1:
                                        appVersion = _c.sent();
                                        _c.label = 2;
                                    case 2:
                                        res.result = "MetaMask/".concat(appVersion, "/Mobile");
                                        return [2 /*return*/];
                                }
                            });
                        }); },
                        wallet_scanQRCode: function () {
                            return new Promise(function (resolve, reject) {
                                checkTabActive();
                                navigation.navigate('QRScanner', {
                                    // TODO: Replace "any" with type
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    onScanSuccess: function (data) {
                                        if (!regex_1.regex.exec(req.params[0], data)) {
                                            reject({ message: 'NO_REGEX_MATCH', data: data });
                                        }
                                        else if (regex_1.regex.walletAddress.exec(data.target_address)) {
                                            reject({
                                                message: 'INVALID_ETHEREUM_ADDRESS',
                                                data: data.target_address
                                            });
                                        }
                                        var result = data;
                                        if (data.target_address) {
                                            result = data.target_address;
                                        }
                                        else if (data.scheme) {
                                            result = JSON.stringify(data);
                                        }
                                        res.result = result;
                                        resolve();
                                    },
                                    // TODO: Replace "any" with type
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    onScanError: function (e) {
                                        throw rpc_errors_1.rpcErrors.internal(e.toString());
                                    }
                                });
                            });
                        },
                        wallet_watchAsset: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_c) {
                            return [2 /*return*/, index_1["default"].wallet_watchAsset({ req: req, res: res, hostname: hostname, checkTabActive: checkTabActive })];
                        }); }); },
                        metamask_removeFavorite: function () { return __awaiter(void 0, void 0, void 0, function () {
                            var bookmarks;
                            return __generator(this, function (_c) {
                                checkTabActive();
                                if (!isHomepage()) {
                                    throw rpc_errors_1.providerErrors.unauthorized('Forbidden.');
                                }
                                bookmarks = store_1.store.getState().bookmarks;
                                return [2 /*return*/, new Promise(function (resolve) {
                                        react_native_1.Alert.alert((0, i18n_1.strings)('browser.remove_bookmark_title'), (0, i18n_1.strings)('browser.remove_bookmark_msg'), [
                                            {
                                                text: (0, i18n_1.strings)('browser.cancel'),
                                                onPress: function () {
                                                    res.result = {
                                                        favorites: bookmarks
                                                    };
                                                    resolve();
                                                },
                                                style: 'cancel'
                                            },
                                            {
                                                text: (0, i18n_1.strings)('browser.yes'),
                                                onPress: function () {
                                                    var bookmark = { url: req.params[0] };
                                                    store_1.store.dispatch((0, bookmarks_1.removeBookmark)(bookmark));
                                                    var updatedBookmarks = store_1.store.getState().bookmarks;
                                                    if (isHomepage()) {
                                                        injectHomePageScripts(updatedBookmarks);
                                                    }
                                                    res.result = {
                                                        favorites: bookmarks
                                                    };
                                                    resolve();
                                                }
                                            },
                                        ]);
                                    })];
                            });
                        }); },
                        metamask_showTutorial: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_c) {
                                checkTabActive();
                                if (!isHomepage()) {
                                    throw rpc_errors_1.providerErrors.unauthorized('Forbidden.');
                                }
                                wizardScrollAdjusted.current = false;
                                store_1.store.dispatch((0, wizard_1["default"])(1));
                                navigation.navigate('WalletView');
                                res.result = true;
                                return [2 /*return*/];
                            });
                        }); },
                        metamask_showAutocomplete: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_c) {
                                checkTabActive();
                                if (!isHomepage()) {
                                    throw rpc_errors_1.providerErrors.unauthorized('Forbidden.');
                                }
                                fromHomepage.current = true;
                                toggleUrlModal(true);
                                setTimeout(function () {
                                    fromHomepage.current = false;
                                }, 1500);
                                res.result = true;
                                return [2 /*return*/];
                            });
                        }); },
                        metamask_injectHomepageScripts: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_c) {
                                if (isHomepage()) {
                                    injectHomePageScripts();
                                }
                                res.result = true;
                                return [2 /*return*/];
                            });
                        }); },
                        /**
                         * This method is used by the inpage provider or sdk to get its state on
                         * initialization.
                         */
                        metamask_getProviderState: function () { return __awaiter(void 0, void 0, void 0, function () {
                            var origin, accounts;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        origin = isWalletConnect ? hostname : channelId !== null && channelId !== void 0 ? channelId : hostname;
                                        return [4 /*yield*/, (0, Permissions_1.getPermittedAccounts)(origin)];
                                    case 1:
                                        accounts = _c.sent();
                                        res.result = __assign(__assign({}, getProviderState()), { accounts: accounts });
                                        return [2 /*return*/];
                                }
                            });
                        }); },
                        /**
                         * This method is sent by the window.web3 shim. It can be used to
                         * record web3 shim usage metrics. These metrics are already collected
                         * in the extension, and can optionally be added to mobile as well.
                         *
                         * For now, we need to respond to this method to not throw errors on
                         * the page, and we implement it as a no-op.
                         */
                        metamask_logWeb3ShimUsage: function () { return (res.result = null); },
                        wallet_addEthereumChain: function () {
                            checkTabActive();
                            return index_1["default"].wallet_addEthereumChain({
                                req: req,
                                res: res,
                                requestUserApproval: requestUserApproval,
                                analytics: {
                                    request_source: getSource(),
                                    request_platform: analytics === null || analytics === void 0 ? void 0 : analytics.platform
                                },
                                startApprovalFlow: startApprovalFlow,
                                endApprovalFlow: endApprovalFlow
                            });
                        },
                        wallet_switchEthereumChain: function () {
                            checkTabActive();
                            return index_1["default"].wallet_switchEthereumChain({
                                req: req,
                                res: res,
                                requestUserApproval: requestUserApproval,
                                analytics: {
                                    request_source: getSource(),
                                    request_platform: analytics === null || analytics === void 0 ? void 0 : analytics.platform
                                }
                            });
                        }
                    };
                    blockRefIndex = (0, networks_1.blockTagParamIndex)(req);
                    if (blockRefIndex) {
                        blockRef = (_d = req.params) === null || _d === void 0 ? void 0 : _d[blockRefIndex];
                        // omitted blockRef implies "latest"
                        if (blockRef === undefined) {
                            req.params[blockRefIndex] = 'latest';
                        }
                    }
                    if (!rpcMethods[req.method]) {
                        return [2 /*return*/, next()];
                    }
                    (0, spam_1.validateOriginThrottling)({ req: req, store: store_1.store });
                    isWhiteListedMethod = (0, rpcEvents_2.isWhitelistedRPC)(req.method);
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 3, , 4]);
                    isWhiteListedMethod &&
                        store_1.store.dispatch((0, rpcEvents_1.setEventStage)(req.method, rpcEvents_2.RPCStageTypes.REQUEST_SEND));
                    return [4 /*yield*/, rpcMethods[req.method]()];
                case 2:
                    _e.sent();
                    isWhiteListedMethod &&
                        store_1.store.dispatch((0, rpcEvents_1.setEventStage)(req.method, rpcEvents_2.RPCStageTypes.COMPLETE));
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _e.sent();
                    (0, spam_1.processOriginThrottlingRejection)({
                        req: req,
                        error: error_1,
                        store: store_1.store,
                        navigation: navigation
                    });
                    isWhiteListedMethod &&
                        store_1.store.dispatch((0, rpcEvents_1.setEventStageError)(req.method, error_1));
                    throw error_1;
                case 4: return [2 /*return*/];
            }
        });
    }); });
};
exports.getRpcMethodMiddleware = getRpcMethodMiddleware;
exports["default"] = exports.getRpcMethodMiddleware;
