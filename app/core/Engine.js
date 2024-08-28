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
/* eslint-disable @typescript-eslint/no-shadow */
var react_native_quick_crypto_1 = require("react-native-quick-crypto");
var assets_controllers_1 = require("@metamask/assets-controllers");
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
var react_native_1 = require("react-native");
var preinstalled_snaps_1 = require("../lib/snaps/preinstalled-snaps");
///: END:ONLY_INCLUDE_IF
var address_book_controller_1 = require("@metamask/address-book-controller");
var composable_controller_1 = require("@metamask/composable-controller");
var keyring_controller_1 = require("@metamask/keyring-controller");
var network_controller_1 = require("@metamask/network-controller");
var phishing_controller_1 = require("@metamask/phishing-controller");
var preferences_controller_1 = require("@metamask/preferences-controller");
var transaction_controller_1 = require("@metamask/transaction-controller");
var gas_fee_controller_1 = require("@metamask/gas-fee-controller");
var approval_controller_1 = require("@metamask/approval-controller");
var permission_controller_2 = require("@metamask/permission-controller");
var swaps_controller_1 = require("@metamask/swaps-controller");
var ppom_validator_1 = require("@metamask/ppom-validator");
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
var snaps_controllers_1 = require("@metamask/snaps-controllers");
var react_native_2 = require("@metamask/snaps-controllers/react-native");
var snaps_1 = require("../lib/snaps");
var snaps_rpc_methods_2 = require("@metamask/snaps-rpc-methods");
///: END:ONLY_INCLUDE_IF
var metamask_airgapped_keyring_1 = require("@keystonehq/metamask-airgapped-keyring");
var logging_controller_1 = require("@metamask/logging-controller");
var eth_ledger_bridge_keyring_1 = require("@metamask/eth-ledger-bridge-keyring");
var Encryptor_1 = require("./Encryptor");
var networks_1 = require("../util/networks");
var AppConstants_1 = require("./AppConstants");
var store_1 = require("../store");
var number_1 = require("../util/number");
var NotificationManager_1 = require("./NotificationManager");
var Logger_1 = require("../util/Logger");
var lodash_1 = require("../util/lodash");
var Analytics_1 = require("./Analytics");
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
var Snaps_1 = require("./Snaps");
var RPCMethodMiddleware_1 = require("./RPCMethods/RPCMethodMiddleware");
var profile_sync_controller_1 = require("@metamask/profile-sync-controller");
var notification_services_controller_1 = require("@metamask/notification-services-controller");
///: END:ONLY_INCLUDE_IF
var specifications_js_1 = require("./Permissions/specifications.js");
var BackupVault_1 = require("./BackupVault");
var signature_controller_1 = require("@metamask/signature-controller");
var utils_1 = require("@metamask/utils");
var rpc_errors_1 = require("@metamask/rpc-errors");
var PPOMView_1 = require("../lib/ppom/PPOMView");
var ppom_storage_backend_1 = require("../lib/ppom/ppom-storage-backend");
var accounts_controller_1 = require("@metamask/accounts-controller");
var react_native_3 = require("@sentry/react-native");
var lodash_2 = require("lodash");
var inpageProvider_1 = require("../core/redux/slices/inpageProvider");
var smart_transactions_controller_1 = require("@metamask/smart-transactions-controller");
var smartTransactions_1 = require("../../app/constants/smartTransactions");
var smartTransactionsController_1 = require("../selectors/smartTransactionsController");
var swaps_1 = require("../reducers/swaps");
var types_1 = require("@metamask/smart-transactions-controller/dist/types");
var smart_publish_hook_1 = require("../util/smart-transactions/smart-publish-hook");
var ethereumjs_util_1 = require("ethereumjs-util");
var controller_utils_1 = require("@metamask/controller-utils");
var ExtendedControllerMessenger_1 = require("./ExtendedControllerMessenger");
var eth_query_1 = require("@metamask/eth-query");
var NON_EMPTY = 'NON_EMPTY';
var encryptor = new Encryptor_1.Encryptor({
    keyDerivationOptions: Encryptor_1.LEGACY_DERIVATION_OPTIONS
});
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var currentChainId;
/**
 * Core controller responsible for composing other metamask controllers together
 * and exposing convenience methods for common wallet operations.
 */
var Engine = /** @class */ (function () {
    /**
     * Creates a CoreController instance
     */
    // eslint-disable-next-line @typescript-eslint/default-param-last
    function Engine(initialState, initialKeyringState) {
        if (initialState === void 0) { initialState = {}; }
        var _this = this;
        var _c, _d, _e, _f, _g;
        this.getTotalFiatAccountBalance = function () {
            var _c, _d, _e, _f, _g, _h;
            var _j = _this.context, CurrencyRateController = _j.CurrencyRateController, AccountsController = _j.AccountsController, AccountTrackerController = _j.AccountTrackerController, TokenBalancesController = _j.TokenBalancesController, TokenRatesController = _j.TokenRatesController, TokensController = _j.TokensController, NetworkController = _j.NetworkController;
            var selectedInternalAccount = AccountsController.getAccount(AccountsController.state.internalAccounts.selectedAccount);
            if (selectedInternalAccount) {
                var selectSelectedInternalAccountChecksummedAddress = (0, controller_utils_1.toChecksumHexAddress)(selectedInternalAccount.address);
                var currentCurrency = CurrencyRateController.state.currentCurrency;
                var _k = NetworkController.state.providerConfig, chainId = _k.chainId, ticker = _k.ticker;
                var _l = store_1.store.getState().settings, _m = _l === void 0 ? {} : _l, showFiatOnTestnets = _m.showFiatOnTestnets;
                if ((0, networks_1.isTestNet)(chainId) && !showFiatOnTestnets) {
                    return { ethFiat: 0, tokenFiat: 0, ethFiat1dAgo: 0, tokenFiat1dAgo: 0 };
                }
                var conversionRate_1 = (_f = (_e = (_d = (_c = CurrencyRateController.state) === null || _c === void 0 ? void 0 : _c.currencyRates) === null || _d === void 0 ? void 0 : _d[ticker]) === null || _e === void 0 ? void 0 : _e.conversionRate) !== null && _f !== void 0 ? _f : 0;
                var accountsByChainId = AccountTrackerController.state.accountsByChainId;
                var tokens = TokensController.state.tokens;
                var marketData = TokenRatesController.state.marketData;
                var tokenExchangeRates_1 = marketData === null || marketData === void 0 ? void 0 : marketData[(0, number_1.toHexadecimal)(chainId)];
                var ethFiat = 0;
                var ethFiat1dAgo = 0;
                var tokenFiat_1 = 0;
                var tokenFiat1dAgo_1 = 0;
                var decimalsToShow_1 = (currentCurrency === 'usd' && 2) || undefined;
                if ((_g = accountsByChainId === null || accountsByChainId === void 0 ? void 0 : accountsByChainId[(0, number_1.toHexadecimal)(chainId)]) === null || _g === void 0 ? void 0 : _g[selectSelectedInternalAccountChecksummedAddress]) {
                    ethFiat = (0, number_1.weiToFiatNumber)(accountsByChainId[(0, number_1.toHexadecimal)(chainId)][selectSelectedInternalAccountChecksummedAddress].balance, conversionRate_1, decimalsToShow_1);
                }
                var ethPricePercentChange1d = (_h = tokenExchangeRates_1 === null || tokenExchangeRates_1 === void 0 ? void 0 : tokenExchangeRates_1[(0, ethereumjs_util_1.zeroAddress)()]) === null || _h === void 0 ? void 0 : _h.pricePercentChange1d;
                ethFiat1dAgo =
                    ethPricePercentChange1d !== undefined
                        ? ethFiat / (1 + ethPricePercentChange1d / 100)
                        : ethFiat;
                if (tokens.length > 0) {
                    var tokenBalances_1 = TokenBalancesController.state.contractBalances;
                    tokens.forEach(function (item) {
                        var _c, _d;
                        var exchangeRate = (_c = tokenExchangeRates_1 === null || tokenExchangeRates_1 === void 0 ? void 0 : tokenExchangeRates_1[item.address]) === null || _c === void 0 ? void 0 : _c.price;
                        var tokenBalance = item.balance ||
                            (item.address in tokenBalances_1
                                ? (0, number_1.renderFromTokenMinimalUnit)(tokenBalances_1[item.address], item.decimals)
                                : undefined);
                        var tokenBalanceFiat = (0, number_1.balanceToFiatNumber)(
                        // TODO: Fix this by handling or eliminating the undefined case
                        // @ts-expect-error This variable can be `undefined`, which would break here.
                        tokenBalance, conversionRate_1, exchangeRate, decimalsToShow_1);
                        var tokenPricePercentChange1d = (_d = tokenExchangeRates_1 === null || tokenExchangeRates_1 === void 0 ? void 0 : tokenExchangeRates_1[item.address]) === null || _d === void 0 ? void 0 : _d.pricePercentChange1d;
                        var tokenBalance1dAgo = tokenPricePercentChange1d !== undefined
                            ? tokenBalanceFiat / (1 + tokenPricePercentChange1d / 100)
                            : tokenBalanceFiat;
                        tokenFiat_1 += tokenBalanceFiat;
                        tokenFiat1dAgo_1 += tokenBalance1dAgo;
                    });
                }
                return {
                    ethFiat: ethFiat !== null && ethFiat !== void 0 ? ethFiat : 0,
                    ethFiat1dAgo: ethFiat1dAgo !== null && ethFiat1dAgo !== void 0 ? ethFiat1dAgo : 0,
                    tokenFiat: tokenFiat_1 !== null && tokenFiat_1 !== void 0 ? tokenFiat_1 : 0,
                    tokenFiat1dAgo: tokenFiat1dAgo_1 !== null && tokenFiat1dAgo_1 !== void 0 ? tokenFiat1dAgo_1 : 0
                };
            }
            // if selectedInternalAccount is undefined, return default 0 value.
            return {
                ethFiat: 0,
                tokenFiat: 0,
                ethFiat1dAgo: 0,
                tokenFiat1dAgo: 0
            };
        };
        /**
         * Returns true or false whether the user has funds or not
         */
        this.hasFunds = function () {
            try {
                var backgroundState = store_1.store.getState().engine.backgroundState;
                // TODO: Check `allNfts[currentChainId]` property instead
                // @ts-expect-error This property does not exist
                var nfts = backgroundState.NftController.nfts;
                var tokens = backgroundState.TokensController.tokens;
                var tokenBalances_2 = backgroundState.TokenBalancesController.contractBalances;
                var tokenFound_1 = false;
                tokens.forEach(function (token) {
                    if (tokenBalances_2[token.address] &&
                        !(0, lodash_1.isZero)(tokenBalances_2[token.address])) {
                        tokenFound_1 = true;
                    }
                });
                var fiatBalance = _this.getTotalFiatAccountBalance() || 0;
                var totalFiatBalance = fiatBalance.ethFiat + fiatBalance.ethFiat;
                return totalFiatBalance > 0 || tokenFound_1 || nfts.length > 0;
            }
            catch (e) {
                Logger_1["default"].log('Error while getting user funds', e);
            }
        };
        this.resetState = function () { return __awaiter(_this, void 0, void 0, function () {
            var _c, TransactionController, TokensController, NftController, TokenBalancesController, TokenRatesController, PermissionController, 
            ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
            SnapController, 
            ///: END:ONLY_INCLUDE_IF
            LoggingController;
            var _d;
            return __generator(this, function (_e) {
                _c = this.context, TransactionController = _c.TransactionController, TokensController = _c.TokensController, NftController = _c.NftController, TokenBalancesController = _c.TokenBalancesController, TokenRatesController = _c.TokenRatesController, PermissionController = _c.PermissionController, SnapController = _c.SnapController, LoggingController = _c.LoggingController;
                // Remove all permissions.
                (_d = PermissionController === null || PermissionController === void 0 ? void 0 : PermissionController.clearState) === null || _d === void 0 ? void 0 : _d.call(PermissionController);
                ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
                SnapController.clearState();
                ///: END:ONLY_INCLUDE_IF
                //Clear assets info
                TokensController.update({
                    allTokens: {},
                    allIgnoredTokens: {},
                    ignoredTokens: [],
                    tokens: []
                });
                NftController.update({
                    allNftContracts: {},
                    allNfts: {},
                    ignoredNfts: []
                });
                TokenBalancesController.reset();
                TokenRatesController.update({ marketData: {} });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                TransactionController.update(function () { return ({
                    methodData: {},
                    transactions: [],
                    lastFetchedBlockNumbers: {},
                    submitHistory: []
                }); });
                LoggingController.clear();
                return [2 /*return*/];
            });
        }); };
        this.controllerMessenger = new ExtendedControllerMessenger_1.ExtendedControllerMessenger();
        /**
         * Subscribes a listener to the state change events of Preferences Controller.
         *
         * @param listener - The callback function to execute when the state changes.
         */
        var onPreferencesStateChange = function (listener) {
            var eventName = "PreferencesController:stateChange";
            _this.controllerMessenger.subscribe(eventName, listener);
        };
        var approvalController = new approval_controller_1.ApprovalController({
            messenger: this.controllerMessenger.getRestricted({
                name: 'ApprovalController',
                allowedEvents: [],
                allowedActions: []
            }),
            showApprovalRequest: function () { return undefined; },
            typesExcludedFromRateLimiting: [
                // TODO: Replace with ApprovalType enum from @metamask/controller-utils when breaking change is fixed
                'eth_sign',
                'personal_sign',
                'eth_signTypedData',
                'transaction',
                'wallet_watchAsset',
            ]
        });
        var preferencesController = new preferences_controller_1.PreferencesController({
            // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
            messenger: this.controllerMessenger.getRestricted({
                name: 'PreferencesController',
                allowedActions: [],
                allowedEvents: ['KeyringController:stateChange']
            }),
            state: __assign({ ipfsGateway: AppConstants_1["default"].IPFS_DEFAULT_GATEWAY_URL, useTokenDetection: (_d = (_c = initialState === null || initialState === void 0 ? void 0 : initialState.PreferencesController) === null || _c === void 0 ? void 0 : _c.useTokenDetection) !== null && _d !== void 0 ? _d : true, useNftDetection: true, displayNftMedia: true, securityAlertsEnabled: true }, initialState.PreferencesController)
        });
        var networkControllerOpts = {
            infuraProjectId: process.env.MM_INFURA_PROJECT_ID || NON_EMPTY,
            state: initialState.NetworkController,
            messenger: this.controllerMessenger.getRestricted({
                name: 'NetworkController',
                allowedEvents: [],
                allowedActions: []
            }),
            // Metrics event tracking is handled in this repository instead
            // TODO: Use events for controller metric events
            trackMetaMetricsEvent: function () {
                // noop
            }
        };
        var networkController = new network_controller_1.NetworkController(networkControllerOpts);
        networkController.initializeProvider();
        var assetsContractController = new assets_controllers_1.AssetsContractController({
            onPreferencesStateChange: onPreferencesStateChange,
            onNetworkDidChange: function (listener) {
                return _this.controllerMessenger.subscribe(AppConstants_1["default"].NETWORK_DID_CHANGE_EVENT, listener);
            },
            chainId: networkController.state.providerConfig.chainId,
            // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
            getNetworkClientById: networkController.getNetworkClientById.bind(networkController)
        });
        var nftController = new assets_controllers_1.NftController({
            onPreferencesStateChange: onPreferencesStateChange,
            onNetworkStateChange: function (listener) {
                return _this.controllerMessenger.subscribe(AppConstants_1["default"].NETWORK_STATE_CHANGE_EVENT, listener);
            },
            // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
            getNetworkClientById: networkController.getNetworkClientById.bind(networkController),
            // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
            messenger: this.controllerMessenger.getRestricted({
                name: 'NftController',
                allowedActions: [
                    "".concat(approvalController.name, ":addRequest"),
                    "".concat(networkController.name, ":getNetworkClientById"),
                ],
                allowedEvents: []
            }),
            chainId: networkController.state.providerConfig.chainId,
            getERC721AssetName: assetsContractController.getERC721AssetName.bind(assetsContractController),
            getERC721AssetSymbol: assetsContractController.getERC721AssetSymbol.bind(assetsContractController),
            getERC721TokenURI: assetsContractController.getERC721TokenURI.bind(assetsContractController),
            getERC721OwnerOf: assetsContractController.getERC721OwnerOf.bind(assetsContractController),
            getERC1155BalanceOf: assetsContractController.getERC1155BalanceOf.bind(assetsContractController),
            getERC1155TokenURI: assetsContractController.getERC1155TokenURI.bind(assetsContractController)
        }, {
            useIPFSSubdomains: false,
            chainId: networkController.state.providerConfig.chainId
        });
        var loggingController = new logging_controller_1.LoggingController({
            // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
            messenger: this.controllerMessenger.getRestricted({
                name: 'LoggingController',
                allowedActions: [],
                allowedEvents: []
            }),
            state: initialState.LoggingController
        });
        // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
        var accountsControllerMessenger = this.controllerMessenger.getRestricted({
            name: 'AccountsController',
            allowedEvents: [
                'SnapController:stateChange',
                'KeyringController:accountRemoved',
                'KeyringController:stateChange',
            ],
            allowedActions: [
                'KeyringController:getAccounts',
                'KeyringController:getKeyringsByType',
                'KeyringController:getKeyringForAccount',
            ]
        });
        var defaultAccountsControllerState = {
            internalAccounts: {
                accounts: {},
                selectedAccount: ''
            }
        };
        var accountsController = new accounts_controller_1.AccountsController({
            messenger: accountsControllerMessenger,
            state: (_e = initialState.AccountsController) !== null && _e !== void 0 ? _e : defaultAccountsControllerState
        });
        var tokensController = new assets_controllers_1.TokensController({
            chainId: networkController.state.providerConfig.chainId,
            config: {
                // @ts-expect-error TODO: Resolve mismatch between network-controller versions.
                provider: networkController.getProviderAndBlockTracker().provider,
                chainId: networkController.state.providerConfig.chainId,
                selectedAddress: preferencesController.state.selectedAddress
            },
            state: initialState.TokensController,
            // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
            messenger: this.controllerMessenger.getRestricted({
                name: 'TokensController',
                allowedActions: [
                    "".concat(approvalController.name, ":addRequest"),
                    'NetworkController:getNetworkClientById',
                ],
                allowedEvents: [
                    'PreferencesController:stateChange',
                    'NetworkController:networkDidChange',
                    'TokenListController:stateChange',
                ]
            })
        });
        var tokenListController = new assets_controllers_1.TokenListController({
            chainId: networkController.state.providerConfig.chainId,
            onNetworkStateChange: function (listener) {
                return _this.controllerMessenger.subscribe(AppConstants_1["default"].NETWORK_STATE_CHANGE_EVENT, listener);
            },
            // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
            messenger: this.controllerMessenger.getRestricted({
                name: 'TokenListController',
                allowedActions: [],
                allowedEvents: ["".concat(networkController.name, ":stateChange")]
            })
        });
        var currencyRateController = new assets_controllers_1.CurrencyRateController({
            // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
            messenger: this.controllerMessenger.getRestricted({
                name: 'CurrencyRateController',
                allowedActions: ["".concat(networkController.name, ":getNetworkClientById")],
                allowedEvents: []
            }),
            state: initialState.CurrencyRateController
        });
        currencyRateController.startPollingByNetworkClientId(networkController.state.selectedNetworkClientId);
        var gasFeeController = new gas_fee_controller_1.GasFeeController({
            messenger: this.controllerMessenger.getRestricted({
                name: 'GasFeeController',
                allowedActions: [
                    "".concat(networkController.name, ":getNetworkClientById"),
                    "".concat(networkController.name, ":getEIP1559Compatibility"),
                    "".concat(networkController.name, ":getState"),
                ],
                allowedEvents: [AppConstants_1["default"].NETWORK_DID_CHANGE_EVENT]
            }),
            getProvider: function () {
                // @ts-expect-error at this point in time the provider will be defined by the `networkController.initializeProvider`
                return networkController.getProviderAndBlockTracker().provider;
            },
            getCurrentNetworkEIP1559Compatibility: function () { return __awaiter(_this, void 0, void 0, function () { var _c; return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, networkController.getEIP1559Compatibility()];
                    case 1: return [2 /*return*/, (_c = (_d.sent())) !== null && _c !== void 0 ? _c : false];
                }
            }); }); },
            getCurrentNetworkLegacyGasAPICompatibility: function () {
                var chainId = networkController.state.providerConfig.chainId;
                return ((0, networks_1.isMainnetByChainId)(chainId) ||
                    chainId === (0, number_1.addHexPrefix)(swaps_controller_1.swapsUtils.BSC_CHAIN_ID) ||
                    chainId === (0, number_1.addHexPrefix)(swaps_controller_1.swapsUtils.POLYGON_CHAIN_ID));
            },
            clientId: AppConstants_1["default"].SWAPS.CLIENT_ID,
            legacyAPIEndpoint: 'https://gas.api.cx.metamask.io/networks/<chain_id>/gasPrices',
            EIP1559APIEndpoint: 'https://gas.api.cx.metamask.io/networks/<chain_id>/suggestedGasFees'
        });
        var phishingController = new phishing_controller_1.PhishingController({
            // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
            messenger: this.controllerMessenger.getRestricted({
                name: 'PhishingController',
                allowedActions: [],
                allowedEvents: []
            })
        });
        phishingController.maybeUpdateState();
        var qrKeyringBuilder = function () {
            var keyring = new metamask_airgapped_keyring_1.MetaMaskKeyring();
            // to fix the bug in #9560, forgetDevice will reset all keyring properties to default.
            keyring.forgetDevice();
            return keyring;
        };
        qrKeyringBuilder.type = metamask_airgapped_keyring_1.MetaMaskKeyring.type;
        var bridge = new eth_ledger_bridge_keyring_1.LedgerMobileBridge(new eth_ledger_bridge_keyring_1.LedgerTransportMiddleware());
        var ledgerKeyringBuilder = function () { return new eth_ledger_bridge_keyring_1.LedgerKeyring({ bridge: bridge }); };
        ledgerKeyringBuilder.type = eth_ledger_bridge_keyring_1.LedgerKeyring.type;
        var keyringController = new keyring_controller_1.KeyringController({
            removeIdentity: preferencesController.removeIdentity.bind(preferencesController),
            encryptor: encryptor,
            // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
            messenger: this.controllerMessenger.getRestricted({
                name: 'KeyringController',
                allowedActions: [],
                allowedEvents: []
            }),
            state: initialKeyringState || initialState.KeyringController,
            // @ts-expect-error To Do: Update the type of QRHardwareKeyring to Keyring<Json>
            keyringBuilders: [qrKeyringBuilder, ledgerKeyringBuilder]
        });
        ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
        /**
         * Gets the mnemonic of the user's primary keyring.
         */
        var getPrimaryKeyringMnemonic = function () {
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            var keyring = keyringController.getKeyringsByType(keyring_controller_1.KeyringTypes.hd)[0];
            if (!keyring.mnemonic) {
                throw new Error('Primary keyring mnemonic unavailable.');
            }
            return keyring.mnemonic;
        };
        var getAppState = function () {
            var state = react_native_1.AppState.currentState;
            return state === 'active';
        };
        var getSnapPermissionSpecifications = function () { return (__assign(__assign({}, (0, snaps_rpc_methods_2.buildSnapEndowmentSpecifications)(Object.keys(Snaps_1.ExcludedSnapEndowments))), (0, snaps_rpc_methods_2.buildSnapRestrictedMethodSpecifications)(Object.keys(Snaps_1.ExcludedSnapPermissions), {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            clearSnapState: _this.controllerMessenger.call.bind(_this.controllerMessenger, 'SnapController:clearSnapState'),
            getMnemonic: getPrimaryKeyringMnemonic.bind(_this),
            getUnlockPromise: getAppState.bind(_this),
            getSnap: _this.controllerMessenger.call.bind(_this.controllerMessenger, 'SnapController:get'),
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            handleSnapRpcRequest: _this.controllerMessenger.call.bind(_this.controllerMessenger, 'SnapController:handleRequest'),
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            getSnapState: _this.controllerMessenger.call.bind(_this.controllerMessenger, 'SnapController:getSnapState'),
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            updateSnapState: _this.controllerMessenger.call.bind(_this.controllerMessenger, 'SnapController:updateSnapState'),
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            maybeUpdatePhishingList: _this.controllerMessenger.call.bind(_this.controllerMessenger, 'PhishingController:maybeUpdateState'),
            isOnPhishingList: function (origin) {
                return _this.controllerMessenger.call('PhishingController:testOrigin', 
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                origin).result;
            },
            showDialog: function (origin, type, 
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            content, // should be Component from '@metamask/snaps-ui';
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            placeholder) {
                return approvalController.addAndShowApprovalRequest({
                    origin: origin,
                    type: type,
                    requestData: { content: content, placeholder: placeholder }
                });
            },
            showInAppNotification: function (origin, args) {
                Logger_1["default"].log('Snaps/ showInAppNotification called with args: ', args, ' and origin: ', origin);
            }
        }))); };
        ///: END:ONLY_INCLUDE_IF
        var accountTrackerController = new assets_controllers_1.AccountTrackerController({
            onPreferencesStateChange: onPreferencesStateChange,
            getIdentities: function () { return preferencesController.state.identities; },
            getSelectedAddress: function () { return accountsController.getSelectedAccount().address; },
            getMultiAccountBalancesEnabled: function () {
                return preferencesController.state.isMultiAccountBalancesEnabled;
            },
            getCurrentChainId: function () {
                return (0, number_1.toHexadecimal)(networkController.state.providerConfig.chainId);
            },
            // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
            getNetworkClientById: networkController.getNetworkClientById.bind(networkController)
        });
        var permissionController = new permission_controller_2.PermissionController({
            messenger: this.controllerMessenger.getRestricted({
                name: 'PermissionController',
                allowedActions: [
                    "".concat(approvalController.name, ":addRequest"),
                    "".concat(approvalController.name, ":hasRequest"),
                    "".concat(approvalController.name, ":acceptRequest"),
                    "".concat(approvalController.name, ":rejectRequest"),
                    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
                    "SnapController:getPermitted",
                    "SnapController:install",
                    "SubjectMetadataController:getSubjectMetadata",
                    ///: END:ONLY_INCLUDE_IF
                ],
                allowedEvents: []
            }),
            state: initialState.PermissionController,
            caveatSpecifications: (0, specifications_js_1.getCaveatSpecifications)({
                getInternalAccounts: accountsController.listAccounts.bind(accountsController)
            }),
            // @ts-expect-error Typecast permissionType from getPermissionSpecifications to be of type PermissionType.RestrictedMethod
            permissionSpecifications: __assign(__assign({}, (0, specifications_js_1.getPermissionSpecifications)({
                getAllAccounts: function () { return keyringController.getAccounts(); },
                getInternalAccounts: accountsController.listAccounts.bind(accountsController),
                captureKeyringTypesWithMissingIdentities: function (internalAccounts, accounts) {
                    if (internalAccounts === void 0) { internalAccounts = []; }
                    if (accounts === void 0) { accounts = []; }
                    var accountsMissingIdentities = accounts.filter(function (address) {
                        var lowerCaseAddress = (0, lodash_2.lowerCase)(address);
                        return !internalAccounts.some(function (account) { return account.address.toLowerCase() === lowerCaseAddress; });
                    });
                    var keyringTypesWithMissingIdentities = accountsMissingIdentities.map(function (address) {
                        return keyringController.getAccountKeyringType(address);
                    });
                    var internalAccountCount = internalAccounts.length;
                    var accountTrackerCount = Object.keys(accountTrackerController.state.accounts || {}).length;
                    (0, react_native_3.captureException)(new Error("Attempt to get permission specifications failed because there were ".concat(accounts.length, " accounts, but ").concat(internalAccountCount, " identities, and the ").concat(keyringTypesWithMissingIdentities, " keyrings included accounts with missing identities. Meanwhile, there are ").concat(accountTrackerCount, " accounts in the account tracker.")));
                }
            })), getSnapPermissionSpecifications()),
            unrestrictedMethods: specifications_js_1.unrestrictedMethods
        });
        ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
        var subjectMetadataController = new permission_controller_2.SubjectMetadataController({
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore TODO: Resolve/patch mismatch between base-controller versions. Before: never, never. Now: string, string, which expects 3rd and 4th args to be informed for restrictedControllerMessengers
            messenger: this.controllerMessenger.getRestricted({
                name: 'SubjectMetadataController',
                allowedActions: ["".concat(permissionController.name, ":hasPermissions")],
                allowedEvents: []
            }),
            state: initialState.SubjectMetadataController || {},
            subjectCacheLimit: 100
        });
        var setupSnapProvider = function (snapId, connectionStream) {
            Logger_1["default"].log('[ENGINE LOG] Engine+setupSnapProvider: Setup stream for Snap', snapId);
            // TO DO:
            // Develop a simpler getRpcMethodMiddleware object for SnapBridge
            // Consider developing an abstract class to derived custom implementations for each use case
            var bridge = new Snaps_1.SnapBridge({
                snapId: snapId,
                connectionStream: connectionStream,
                getRPCMethodMiddleware: function (_c) {
                    var hostname = _c.hostname, getProviderState = _c.getProviderState;
                    return (0, RPCMethodMiddleware_1.getRpcMethodMiddleware)({
                        hostname: hostname,
                        getProviderState: getProviderState,
                        navigation: null,
                        getApprovedHosts: function () { return null; },
                        setApprovedHosts: function () { return null; },
                        approveHost: function () { return null; },
                        title: { current: 'Snap' },
                        icon: { current: undefined },
                        isHomepage: function () { return false; },
                        fromHomepage: { current: false },
                        toggleUrlModal: function () { return null; },
                        wizardScrollAdjusted: { current: false },
                        tabId: false,
                        isWalletConnect: true,
                        isMMSDK: false,
                        url: { current: '' },
                        analytics: {},
                        injectHomePageScripts: function () { return null; }
                    });
                }
            });
            bridge.setupProviderConnection();
        };
        var requireAllowlist = process.env.METAMASK_BUILD_TYPE === 'main';
        var disableSnapInstallation = process.env.METAMASK_BUILD_TYPE === 'main';
        var allowLocalSnaps = process.env.METAMASK_BUILD_TYPE === 'flask';
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore TODO: Resolve/patch mismatch between base-controller versions.
        var snapsRegistryMessenger = this.controllerMessenger.getRestricted({
            name: 'SnapsRegistry',
            allowedEvents: [],
            allowedActions: []
        });
        var snapsRegistry = new snaps_controllers_1.JsonSnapsRegistry({
            state: initialState.SnapsRegistry,
            messenger: snapsRegistryMessenger,
            refetchOnAllowlistMiss: requireAllowlist,
            url: {
                registry: 'https://acl.execution.metamask.io/latest/registry.json',
                signature: 'https://acl.execution.metamask.io/latest/signature.json'
            },
            publicKey: '0x025b65308f0f0fb8bc7f7ff87bfc296e0330eee5d3c1d1ee4a048b2fd6a86fa0a6'
        });
        this.snapExecutionService = new react_native_2.WebViewExecutionService({
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore TODO: Resolve/patch mismatch between base-controller versions.
            messenger: this.controllerMessenger.getRestricted({
                name: 'ExecutionService',
                allowedActions: [],
                allowedEvents: []
            }),
            setupSnapProvider: setupSnapProvider.bind(this),
            getWebView: function () { return snaps_1.getSnapsWebViewPromise; }
        });
        var snapControllerMessenger = this.controllerMessenger.getRestricted({
            name: 'SnapController',
            allowedEvents: [
                'ExecutionService:unhandledError',
                'ExecutionService:outboundRequest',
                'ExecutionService:outboundResponse',
            ],
            allowedActions: [
                "".concat(approvalController.name, ":addRequest"),
                "".concat(permissionController.name, ":getEndowments"),
                "".concat(permissionController.name, ":getPermissions"),
                "".concat(permissionController.name, ":hasPermission"),
                "".concat(permissionController.name, ":hasPermissions"),
                "".concat(permissionController.name, ":requestPermissions"),
                "".concat(permissionController.name, ":revokeAllPermissions"),
                "".concat(permissionController.name, ":revokePermissions"),
                "".concat(permissionController.name, ":revokePermissionForAllSubjects"),
                "".concat(permissionController.name, ":getSubjectNames"),
                "".concat(permissionController.name, ":updateCaveat"),
                "".concat(approvalController.name, ":addRequest"),
                "".concat(approvalController.name, ":updateRequestState"),
                "".concat(permissionController.name, ":grantPermissions"),
                "".concat(subjectMetadataController.name, ":getSubjectMetadata"),
                "".concat(subjectMetadataController.name, ":addSubjectMetadata"),
                "".concat(phishingController.name, ":maybeUpdateState"),
                "".concat(phishingController.name, ":testOrigin"),
                "".concat(snapsRegistry.name, ":get"),
                "".concat(snapsRegistry.name, ":getMetadata"),
                "".concat(snapsRegistry.name, ":update"),
                'ExecutionService:executeSnap',
                'ExecutionService:terminateSnap',
                'ExecutionService:terminateAllSnaps',
                'ExecutionService:handleRpcRequest',
                'SnapsRegistry:get',
                'SnapsRegistry:getMetadata',
                'SnapsRegistry:update',
                'SnapsRegistry:resolveVersion',
            ]
        });
        var snapController = new snaps_controllers_1.SnapController({
            environmentEndowmentPermissions: Object.values(Snaps_1.EndowmentPermissions),
            featureFlags: {
                requireAllowlist: requireAllowlist,
                allowLocalSnaps: allowLocalSnaps,
                disableSnapInstallation: disableSnapInstallation
            },
            state: initialState.SnapController || undefined,
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            messenger: snapControllerMessenger,
            detectSnapLocation: function (location, options) {
                return (0, Snaps_1.detectSnapLocation)(location, __assign(__assign({}, options), { fetch: Snaps_1.fetchFunction }));
            },
            //@ts-expect-error types need to be aligned with snaps-controllers
            preinstalledSnaps: preinstalled_snaps_1["default"],
            //@ts-expect-error types need to be aligned between new encryptor and snaps-controllers
            encryptor: encryptor,
            getMnemonic: getPrimaryKeyringMnemonic.bind(this),
            getFeatureFlags: function () { return ({
                disableSnaps: store_1.store.getState().settings.basicFunctionalityEnabled === false
            }); }
        });
        var authenticationController = new profile_sync_controller_1.AuthenticationController.Controller({
            state: initialState.AuthenticationController,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore TODO: Resolve/patch mismatch between messenger types
            messenger: this.controllerMessenger.getRestricted({
                name: 'AuthenticationController',
                allowedActions: [
                    'KeyringController:getState',
                    'KeyringController:getAccounts',
                    'SnapController:handleRequest',
                    'UserStorageController:enableProfileSyncing',
                ],
                allowedEvents: ['KeyringController:unlock', 'KeyringController:lock']
            }),
            metametrics: {
                agent: 'mobile',
                getMetaMetricsId: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, Analytics_1.MetaMetrics.getInstance().getMetaMetricsId()];
                        case 1: return [2 /*return*/, (_c.sent()) || ''];
                    }
                }); }); }
            }
        });
        var userStorageController = new profile_sync_controller_1.UserStorageController.Controller({
            getMetaMetricsState: function () { return Analytics_1.MetaMetrics.getInstance().isEnabled(); },
            state: initialState.UserStorageController,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore TODO: Resolve/patch mismatch between messenger types
            messenger: this.controllerMessenger.getRestricted({
                name: 'UserStorageController',
                allowedActions: [
                    'SnapController:handleRequest',
                    'KeyringController:getState',
                    'AuthenticationController:getBearerToken',
                    'AuthenticationController:getSessionProfile',
                    'AuthenticationController:isSignedIn',
                    'AuthenticationController:performSignOut',
                    'AuthenticationController:performSignIn',
                    'NotificationServicesController:disableNotificationServices',
                    'NotificationServicesController:selectIsNotificationServicesEnabled',
                ],
                allowedEvents: ['KeyringController:unlock', 'KeyringController:lock']
            })
        });
        var notificationServicesController = new notification_services_controller_1.NotificationServicesController.Controller({
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore TODO: Resolve/patch mismatch between messenger types
            messenger: this.controllerMessenger.getRestricted({
                name: 'NotificationServicesController',
                allowedActions: [
                    'KeyringController:getState',
                    'KeyringController:getAccounts',
                    'AuthenticationController:getBearerToken',
                    'AuthenticationController:isSignedIn',
                    'UserStorageController:enableProfileSyncing',
                    'UserStorageController:getStorageKey',
                    'UserStorageController:performGetStorage',
                    'UserStorageController:performSetStorage',
                ],
                allowedEvents: [
                    'KeyringController:unlock',
                    'KeyringController:lock',
                    'KeyringController:stateChange',
                ]
            }),
            state: initialState.NotificationServicesController,
            env: {
                isPushIntegrated: false,
                featureAnnouncements: {
                    platform: 'mobile',
                    accessToken: process.env
                        .FEATURES_ANNOUNCEMENTS_ACCESS_TOKEN,
                    spaceId: process.env.FEATURES_ANNOUNCEMENTS_SPACE_ID
                }
            }
        });
        ///: END:ONLY_INCLUDE_IF
        this.transactionController = new transaction_controller_1.TransactionController({
            // @ts-expect-error at this point in time the provider will be defined by the `networkController.initializeProvider`
            blockTracker: networkController.getProviderAndBlockTracker().blockTracker,
            disableHistory: true,
            disableSendFlowHistory: true,
            disableSwaps: true,
            // @ts-expect-error TransactionController is missing networkClientId argument in type
            getCurrentNetworkEIP1559Compatibility: networkController.getEIP1559Compatibility.bind(networkController),
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            getExternalPendingTransactions: function (address) {
                return _this.smartTransactionsController.getTransactions({
                    addressFrom: address,
                    status: types_1.SmartTransactionStatuses.PENDING
                });
            },
            getGasFeeEstimates: gasFeeController.fetchGasFeeEstimates.bind(gasFeeController),
            // but only breaking change is Node version and bumped dependencies
            getNetworkClientRegistry: networkController.getNetworkClientRegistry.bind(networkController),
            getNetworkState: function () { return networkController.state; },
            hooks: {
                publish: function (transactionMeta) {
                    var shouldUseSmartTransaction = (0, smartTransactionsController_1.selectShouldUseSmartTransaction)(store_1.store.getState());
                    return (0, smart_publish_hook_1.submitSmartTransactionHook)({
                        transactionMeta: transactionMeta,
                        transactionController: _this.transactionController,
                        smartTransactionsController: _this.smartTransactionsController,
                        shouldUseSmartTransaction: shouldUseSmartTransaction,
                        approvalController: approvalController,
                        featureFlags: (0, swaps_1.selectSwapsChainFeatureFlags)(store_1.store.getState())
                    });
                }
            },
            incomingTransactions: {
                isEnabled: function () {
                    var _c;
                    var currentHexChainId = networkController.state.providerConfig.chainId;
                    var showIncomingTransactions = (_c = preferencesController === null || preferencesController === void 0 ? void 0 : preferencesController.state) === null || _c === void 0 ? void 0 : _c.showIncomingTransactions;
                    return Boolean((0, utils_1.hasProperty)(showIncomingTransactions, currentChainId) &&
                        (showIncomingTransactions === null || showIncomingTransactions === void 0 ? void 0 : showIncomingTransactions[currentHexChainId]));
                },
                updateTransactions: true
            },
            isSimulationEnabled: function () {
                return preferencesController.state.useTransactionSimulations;
            },
            // but only breaking change is Node version
            messenger: this.controllerMessenger.getRestricted({
                name: 'TransactionController',
                allowedActions: [
                    "".concat(accountsController.name, ":getSelectedAccount"),
                    "".concat(approvalController.name, ":addRequest"),
                    "".concat(networkController.name, ":getNetworkClientById"),
                ],
                allowedEvents: ["NetworkController:stateChange"]
            }),
            onNetworkStateChange: function (listener) {
                return _this.controllerMessenger.subscribe(AppConstants_1["default"].NETWORK_STATE_CHANGE_EVENT, listener);
            },
            pendingTransactions: {
                isResubmitEnabled: function () { return false; }
            },
            // @ts-expect-error at this point in time the provider will be defined by the `networkController.initializeProvider`
            provider: networkController.getProviderAndBlockTracker().provider,
            sign: keyringController.signTransaction.bind(keyringController),
            state: initialState.TransactionController
        });
        var codefiTokenApiV2 = new assets_controllers_1.CodefiTokenPricesServiceV2();
        var smartTransactionsControllerTrackMetaMetricsEvent = function (params) {
            var event = params.event, category = params.category, restParams = __rest(params, ["event", "category"]);
            Analytics_1.MetaMetrics.getInstance().trackEvent({
                category: category,
                properties: {
                    name: event
                }
            }, restParams);
        };
        this.smartTransactionsController = new smart_transactions_controller_1["default"]({
            confirmExternalTransaction: this.transactionController.confirmExternalTransaction.bind(this.transactionController),
            getNetworkClientById: networkController.getNetworkClientById.bind(networkController),
            getNonceLock: this.transactionController.getNonceLock.bind(this.transactionController),
            getTransactions: this.transactionController.getTransactions.bind(this.transactionController),
            onNetworkStateChange: function (listener) {
                return _this.controllerMessenger.subscribe(AppConstants_1["default"].NETWORK_STATE_CHANGE_EVENT, listener);
            },
            // TODO: Replace "any" with type
            provider: 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            networkController.getProviderAndBlockTracker().provider,
            trackMetaMetricsEvent: smartTransactionsControllerTrackMetaMetricsEvent,
            getMetaMetricsProps: function () { return Promise.resolve({}); }
        }, {
            // @ts-expect-error TODO: resolve types
            supportedChainIds: (0, smartTransactions_1.getAllowedSmartTransactionsChainIds)()
        }, initialState.SmartTransactionsController);
        var controllers = [
            keyringController,
            accountTrackerController,
            new address_book_controller_1.AddressBookController(),
            assetsContractController,
            nftController,
            tokensController,
            tokenListController,
            new assets_controllers_1.TokenDetectionController({
                // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
                messenger: this.controllerMessenger.getRestricted({
                    name: 'TokenDetectionController',
                    allowedActions: [
                        'AccountsController:getSelectedAccount',
                        'NetworkController:getNetworkClientById',
                        'NetworkController:getNetworkConfigurationByNetworkClientId',
                        'NetworkController:getState',
                        'KeyringController:getState',
                        'PreferencesController:getState',
                        'TokenListController:getState',
                        'TokensController:getState',
                        'TokensController:addDetectedTokens',
                    ],
                    allowedEvents: [
                        'AccountsController:selectedAccountChange',
                        'KeyringController:lock',
                        'KeyringController:unlock',
                        'PreferencesController:stateChange',
                        'NetworkController:networkDidChange',
                        'TokenListController:stateChange',
                        'TokensController:stateChange',
                    ]
                }),
                trackMetaMetricsEvent: function () {
                    return Analytics_1.MetaMetrics.getInstance().trackEvent(Analytics_1.MetaMetricsEvents.TOKEN_DETECTED, {
                        token_standard: 'ERC20',
                        asset_type: 'token',
                        chain_id: (0, networks_1.getDecimalChainId)(networkController.state.providerConfig.chainId)
                    });
                },
                // Remove this when TokensController is extending Base Controller v2
                getTokensState: function () { return tokensController.state; },
                getBalancesInSingleCall: assetsContractController.getBalancesInSingleCall.bind(assetsContractController)
            }),
            new assets_controllers_1.NftDetectionController({
                onNftsStateChange: function (listener) { return nftController.subscribe(listener); },
                onPreferencesStateChange: onPreferencesStateChange,
                onNetworkStateChange: function (listener) {
                    return _this.controllerMessenger.subscribe(AppConstants_1["default"].NETWORK_STATE_CHANGE_EVENT, listener);
                },
                chainId: networkController.state.providerConfig.chainId,
                getOpenSeaApiKey: function () { return nftController.openSeaApiKey; },
                addNft: nftController.addNft.bind(nftController),
                getNftApi: nftController.getNftApi.bind(nftController),
                getNftState: function () { return nftController.state; },
                // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
                getNetworkClientById: networkController.getNetworkClientById.bind(networkController),
                disabled: false,
                selectedAddress: preferencesController.state.selectedAddress
            }),
            currencyRateController,
            networkController,
            phishingController,
            preferencesController,
            new assets_controllers_1.TokenBalancesController({
                // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
                messenger: this.controllerMessenger.getRestricted({
                    name: 'TokenBalancesController',
                    allowedActions: ['PreferencesController:getState'],
                    allowedEvents: ['TokensController:stateChange']
                }),
                //@ts-expect-error onTokensStateChange will be removed when Tokens Controller extends Base Controller v2
                onTokensStateChange: function (listener) { return tokensController.subscribe(listener); },
                getERC20BalanceOf: assetsContractController.getERC20BalanceOf.bind(assetsContractController),
                interval: 180000
            }),
            new assets_controllers_1.TokenRatesController({
                onTokensStateChange: function (listener) { return tokensController.subscribe(listener); },
                onNetworkStateChange: function (listener) {
                    return _this.controllerMessenger.subscribe(AppConstants_1["default"].NETWORK_STATE_CHANGE_EVENT, listener);
                },
                onPreferencesStateChange: onPreferencesStateChange,
                chainId: networkController.state.providerConfig.chainId,
                ticker: networkController.state.providerConfig.ticker,
                selectedAddress: preferencesController.state.selectedAddress,
                tokenPricesService: codefiTokenApiV2,
                interval: 30 * 60 * 1000,
                // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
                getNetworkClientById: networkController.getNetworkClientById.bind(networkController)
            }),
            this.transactionController,
            this.smartTransactionsController,
            new swaps_controller_1["default"]({
                fetchGasFeeEstimates: function () { return gasFeeController.fetchGasFeeEstimates(); },
                // @ts-expect-error TODO: Resolve mismatch between gas fee and swaps controller types
                fetchEstimatedMultiLayerL1Fee: networks_1.fetchEstimatedMultiLayerL1Fee
            }, {
                clientId: AppConstants_1["default"].SWAPS.CLIENT_ID,
                fetchAggregatorMetadataThreshold: AppConstants_1["default"].SWAPS.CACHE_AGGREGATOR_METADATA_THRESHOLD,
                fetchTokensThreshold: AppConstants_1["default"].SWAPS.CACHE_TOKENS_THRESHOLD,
                fetchTopAssetsThreshold: AppConstants_1["default"].SWAPS.CACHE_TOP_ASSETS_THRESHOLD,
                supportedChainIds: [
                    swaps_controller_1.swapsUtils.ETH_CHAIN_ID,
                    swaps_controller_1.swapsUtils.BSC_CHAIN_ID,
                    swaps_controller_1.swapsUtils.SWAPS_TESTNET_CHAIN_ID,
                    swaps_controller_1.swapsUtils.POLYGON_CHAIN_ID,
                    swaps_controller_1.swapsUtils.AVALANCHE_CHAIN_ID,
                    swaps_controller_1.swapsUtils.ARBITRUM_CHAIN_ID,
                    swaps_controller_1.swapsUtils.OPTIMISM_CHAIN_ID,
                    swaps_controller_1.swapsUtils.ZKSYNC_ERA_CHAIN_ID,
                    swaps_controller_1.swapsUtils.LINEA_CHAIN_ID,
                    swaps_controller_1.swapsUtils.BASE_CHAIN_ID,
                ]
            }),
            gasFeeController,
            approvalController,
            permissionController,
            new signature_controller_1.SignatureController({
                // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
                messenger: this.controllerMessenger.getRestricted({
                    name: 'SignatureController',
                    allowedActions: [
                        "".concat(approvalController.name, ":addRequest"),
                        "".concat(keyringController.name, ":signPersonalMessage"),
                        "".concat(keyringController.name, ":signMessage"),
                        "".concat(keyringController.name, ":signTypedMessage"),
                        "".concat(loggingController.name, ":add"),
                    ],
                    allowedEvents: []
                }),
                isEthSignEnabled: function () {
                    var _c, _d;
                    return Boolean((_d = (_c = preferencesController.state) === null || _c === void 0 ? void 0 : _c.disabledRpcMethodPreferences) === null || _d === void 0 ? void 0 : _d.eth_sign);
                },
                getAllState: function () { return store_1.store.getState(); },
                getCurrentChainId: function () { return networkController.state.providerConfig.chainId; }
            }),
            loggingController,
            ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
            snapController,
            subjectMetadataController,
            authenticationController,
            userStorageController,
            notificationServicesController,
            ///: END:ONLY_INCLUDE_IF
            accountsController,
            new ppom_validator_1.PPOMController({
                chainId: networkController.state.providerConfig.chainId,
                blockaidPublicKey: process.env.BLOCKAID_PUBLIC_KEY,
                cdnBaseUrl: process.env.BLOCKAID_FILE_CDN,
                // @ts-expect-error TODO: Resolve/patch mismatch between base-controller versions. Before: never, never. Now: string, string, which expects 3rd and 4th args to be informed for restrictedControllerMessengers
                messenger: this.controllerMessenger.getRestricted({
                    name: 'PPOMController',
                    allowedActions: [],
                    allowedEvents: ["".concat(networkController.name, ":stateChange")]
                }),
                onPreferencesChange: function (listener) {
                    return _this.controllerMessenger.subscribe("".concat(preferencesController.name, ":stateChange"), listener);
                },
                // TODO: Replace "any" with type
                provider: 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                networkController.getProviderAndBlockTracker().provider,
                ppomProvider: {
                    // TODO: Replace "any" with type
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    PPOM: PPOMView_1.PPOM,
                    ppomInit: PPOMView_1.ppomInit
                },
                storageBackend: new ppom_storage_backend_1["default"]('PPOMDB'),
                securityAlertsEnabled: (_g = (_f = initialState.PreferencesController) === null || _f === void 0 ? void 0 : _f.securityAlertsEnabled) !== null && _g !== void 0 ? _g : false,
                state: initialState.PPOMController,
                // TODO: Replace "any" with type
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                nativeCrypto: react_native_quick_crypto_1["default"]
            }),
        ];
        // set initial state
        // TODO: Pass initial state into each controller constructor instead
        // This is being set post-construction for now to ensure it's functionally equivalent with
        // how the `ComponsedController` used to set initial state.
        //
        // The check for `controller.subscribe !== undefined` is to filter out BaseControllerV2
        // controllers. They should be initialized via the constructor instead.
        for (var _i = 0, controllers_1 = controllers; _i < controllers_1.length; _i++) {
            var controller = controllers_1[_i];
            if ((0, utils_1.hasProperty)(initialState, controller.name) &&
                // Use `in` operator here because the `subscribe` function is one level up the prototype chain
                'subscribe' in controller &&
                controller.subscribe !== undefined) {
                // The following type error can be addressed by passing initial state into controller constructors instead
                // @ts-expect-error No type-level guarantee that the correct state is being applied to the correct controller here.
                controller.update(initialState[controller.name]);
            }
        }
        this.datamodel = new composable_controller_1.ComposableController(
        // @ts-expect-error The ComposableController needs to be updated to support BaseControllerV2
        controllers, this.controllerMessenger);
        this.context = controllers.reduce(function (context, controller) {
            var _c;
            return (__assign(__assign({}, context), (_c = {}, _c[controller.name] = controller, _c)));
        }, {});
        var nfts = this.context.NftController;
        if (process.env.MM_OPENSEA_KEY) {
            nfts.setApiKey(process.env.MM_OPENSEA_KEY);
        }
        this.controllerMessenger.subscribe('TransactionController:incomingTransactionBlockReceived', function (blockNumber) {
            NotificationManager_1["default"].gotIncomingTransaction(blockNumber);
        });
        this.controllerMessenger.subscribe(AppConstants_1["default"].NETWORK_STATE_CHANGE_EVENT, function (state) {
            if (state.networksMetadata[state.selectedNetworkClientId].status ===
                network_controller_1.NetworkStatus.Available &&
                state.providerConfig.chainId !== currentChainId) {
                // We should add a state or event emitter saying the provider changed
                setTimeout(function () {
                    _this.configureControllersOnNetworkChange();
                    currentChainId = state.providerConfig.chainId;
                }, 500);
            }
        });
        this.controllerMessenger.subscribe(AppConstants_1["default"].NETWORK_STATE_CHANGE_EVENT, function () { return __awaiter(_this, void 0, void 0, function () {
            var networkId, error_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, (0, networks_1.deprecatedGetNetworkId)()];
                    case 1:
                        networkId = _c.sent();
                        store_1.store.dispatch((0, inpageProvider_1.networkIdUpdated)(networkId));
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _c.sent();
                        console.error(error_1, "Network ID not changed, current chainId: ".concat(networkController.state.providerConfig.chainId));
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); });
        this.controllerMessenger.subscribe("".concat(networkController.name, ":networkWillChange"), function () {
            store_1.store.dispatch((0, inpageProvider_1.networkIdWillUpdate)());
        });
        this.configureControllersOnNetworkChange();
        this.startPolling();
        this.handleVaultBackup();
        Engine.instance = this;
    }
    Engine.prototype.handleVaultBackup = function () {
        this.controllerMessenger.subscribe(AppConstants_1["default"].KEYRING_STATE_CHANGE_EVENT, function (state) {
            return (0, BackupVault_1.backupVault)(state)
                .then(function (result) {
                if (result.success) {
                    Logger_1["default"].log('Engine', 'Vault back up successful');
                }
                else {
                    Logger_1["default"].log('Engine', 'Vault backup failed', result.error);
                }
            })["catch"](function (error) {
                Logger_1["default"].error(error, 'Engine Vault backup failed');
            });
        });
    };
    Engine.prototype.startPolling = function () {
        var _c = this.context, TokenDetectionController = _c.TokenDetectionController, TokenListController = _c.TokenListController, TransactionController = _c.TransactionController, TokenRatesController = _c.TokenRatesController;
        TokenListController.start();
        TokenDetectionController.start();
        // leaving the reference of TransactionController here, rather than importing it from utils to avoid circular dependency
        TransactionController.startIncomingTransactionPolling();
        TokenRatesController.start();
    };
    Engine.prototype.configureControllersOnNetworkChange = function () {
        var _c, _d;
        var _e = this.context, AccountTrackerController = _e.AccountTrackerController, AssetsContractController = _e.AssetsContractController, TokenDetectionController = _e.TokenDetectionController, NetworkController = _e.NetworkController, SwapsController = _e.SwapsController;
        var provider = NetworkController.getProviderAndBlockTracker().provider;
        // Skip configuration if this is called before the provider is initialized
        if (!provider) {
            return;
        }
        provider.sendAsync = provider.sendAsync.bind(provider);
        AccountTrackerController.configure({ provider: provider });
        // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
        AssetsContractController.configure({ provider: provider });
        SwapsController.configure({
            provider: provider,
            chainId: (_d = (_c = NetworkController.state) === null || _c === void 0 ? void 0 : _c.providerConfig) === null || _d === void 0 ? void 0 : _d.chainId,
            pollCountLimit: AppConstants_1["default"].SWAPS.POLL_COUNT_LIMIT
        });
        TokenDetectionController.detectTokens();
        AccountTrackerController.refresh();
    };
    Engine.prototype.removeAllListeners = function () {
        this.controllerMessenger.clearSubscriptions();
    };
    Engine.prototype.destroyEngineInstance = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        // TODO: Replace "any" with type
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        Object.values(this.context).forEach(function (controller) {
                            if (controller.destroy) {
                                controller.destroy();
                            }
                        });
                        this.removeAllListeners();
                        return [4 /*yield*/, this.resetState()];
                    case 1:
                        _c.sent();
                        Engine.instance = null;
                        return [2 /*return*/];
                }
            });
        });
    };
    Engine.prototype.rejectPendingApproval = function (id, reason, opts) {
        if (reason === void 0) { reason = rpc_errors_1.providerErrors.userRejectedRequest(); }
        if (opts === void 0) { opts = {}; }
        var ApprovalController = this.context.ApprovalController;
        if (opts.ignoreMissing && !ApprovalController.has({ id: id })) {
            return;
        }
        try {
            ApprovalController.reject(id, reason);
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (error) {
            if (opts.logErrors !== false) {
                Logger_1["default"].error(error, 'Reject while rejecting pending connection request');
            }
        }
    };
    Engine.prototype.acceptPendingApproval = function (id, requestData, opts) {
        if (opts === void 0) { opts = {
            waitForResult: false,
            handleErrors: true
        }; }
        return __awaiter(this, void 0, void 0, function () {
            var ApprovalController, err_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        ApprovalController = this.context.ApprovalController;
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, ApprovalController.accept(id, requestData, {
                                waitForResult: opts.waitForResult
                            })];
                    case 2: return [2 /*return*/, _c.sent()];
                    case 3:
                        err_1 = _c.sent();
                        if (opts.handleErrors === false) {
                            throw err_1;
                        }
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // This should be used instead of directly calling PreferencesController.setSelectedAddress or AccountsController.setSelectedAccount
    Engine.prototype.setSelectedAccount = function (address) {
        var _c = this.context, AccountsController = _c.AccountsController, PreferencesController = _c.PreferencesController;
        var account = AccountsController.getAccountByAddress(address);
        if (account) {
            AccountsController.setSelectedAccount(account.id);
            PreferencesController.setSelectedAddress(address);
        }
        else {
            throw new Error("No account found for address: ".concat(address));
        }
    };
    /**
     * This should be used instead of directly calling PreferencesController.setAccountLabel or AccountsController.setAccountName in order to keep the names in sync
     * We are currently incrementally migrating the accounts data to the AccountsController so we must keep these values
     * in sync until the migration is complete.
     */
    Engine.prototype.setAccountLabel = function (address, label) {
        var _c = this.context, AccountsController = _c.AccountsController, PreferencesController = _c.PreferencesController;
        var accountToBeNamed = AccountsController.getAccountByAddress(address);
        if (accountToBeNamed === undefined) {
            throw new Error("No account found for address: ".concat(address));
        }
        AccountsController.setAccountName(accountToBeNamed.id, label);
        PreferencesController.setAccountLabel(address, label);
    };
    Engine.prototype.getGlobalEthQuery = function () {
        var _c;
        var NetworkController = this.context.NetworkController;
        var provider = ((_c = NetworkController.getSelectedNetworkClient()) !== null && _c !== void 0 ? _c : {}).provider;
        if (!provider) {
            throw new Error('No selected network client');
        }
        return new eth_query_1["default"](provider);
    };
    return Engine;
}());
/**
 * Assert that the given Engine instance has been initialized
 *
 * @param instance - Either an Engine instance, or null
 */
function assertEngineExists(instance) {
    if (!instance) {
        throw new Error('Engine does not exist');
    }
}
var instance;
exports["default"] = {
    get context() {
        assertEngineExists(instance);
        return instance.context;
    },
    get controllerMessenger() {
        assertEngineExists(instance);
        return instance.controllerMessenger;
    },
    get state() {
        assertEngineExists(instance);
        var _c = instance.datamodel.state, AccountTrackerController = _c.AccountTrackerController, AddressBookController = _c.AddressBookController, AssetsContractController = _c.AssetsContractController, NftController = _c.NftController, TokenListController = _c.TokenListController, CurrencyRateController = _c.CurrencyRateController, KeyringController = _c.KeyringController, NetworkController = _c.NetworkController, PreferencesController = _c.PreferencesController, PhishingController = _c.PhishingController, PPOMController = _c.PPOMController, TokenBalancesController = _c.TokenBalancesController, TokenRatesController = _c.TokenRatesController, TransactionController = _c.TransactionController, SmartTransactionsController = _c.SmartTransactionsController, SwapsController = _c.SwapsController, GasFeeController = _c.GasFeeController, TokensController = _c.TokensController, TokenDetectionController = _c.TokenDetectionController, NftDetectionController = _c.NftDetectionController, 
        ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
        SnapController = _c.SnapController, SubjectMetadataController = _c.SubjectMetadataController, AuthenticationController = _c.AuthenticationController, UserStorageController = _c.UserStorageController, NotificationServicesController = _c.NotificationServicesController, 
        ///: END:ONLY_INCLUDE_IF
        PermissionController = _c.PermissionController, ApprovalController = _c.ApprovalController, LoggingController = _c.LoggingController, AccountsController = _c.AccountsController;
        // normalize `null` currencyRate to `0`
        // TODO: handle `null` currencyRate by hiding fiat values instead
        var modifiedCurrencyRateControllerState = __assign(__assign({}, CurrencyRateController), { conversionRate: CurrencyRateController.conversionRate === null
                ? 0
                : CurrencyRateController.conversionRate });
        return {
            AccountTrackerController: AccountTrackerController,
            AddressBookController: AddressBookController,
            AssetsContractController: AssetsContractController,
            NftController: NftController,
            TokenListController: TokenListController,
            CurrencyRateController: modifiedCurrencyRateControllerState,
            KeyringController: KeyringController,
            NetworkController: NetworkController,
            PhishingController: PhishingController,
            PPOMController: PPOMController,
            PreferencesController: PreferencesController,
            TokenBalancesController: TokenBalancesController,
            TokenRatesController: TokenRatesController,
            TokensController: TokensController,
            TransactionController: TransactionController,
            SmartTransactionsController: SmartTransactionsController,
            SwapsController: SwapsController,
            GasFeeController: GasFeeController,
            TokenDetectionController: TokenDetectionController,
            NftDetectionController: NftDetectionController,
            ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
            SnapController: SnapController,
            SubjectMetadataController: SubjectMetadataController,
            AuthenticationController: AuthenticationController,
            UserStorageController: UserStorageController,
            NotificationServicesController: NotificationServicesController,
            ///: END:ONLY_INCLUDE_IF
            PermissionController: PermissionController,
            ApprovalController: ApprovalController,
            LoggingController: LoggingController,
            AccountsController: AccountsController
        };
    },
    get datamodel() {
        assertEngineExists(instance);
        return instance.datamodel;
    },
    getTotalFiatAccountBalance: function () {
        assertEngineExists(instance);
        return instance.getTotalFiatAccountBalance();
    },
    hasFunds: function () {
        assertEngineExists(instance);
        return instance.hasFunds();
    },
    resetState: function () {
        assertEngineExists(instance);
        return instance.resetState();
    },
    destroyEngine: function () {
        instance === null || instance === void 0 ? void 0 : instance.destroyEngineInstance();
        instance = null;
    },
    init: function (state, keyringState) {
        if (keyringState === void 0) { keyringState = null; }
        instance = Engine.instance || new Engine(state, keyringState);
        Object.freeze(instance);
        return instance;
    },
    acceptPendingApproval: function (id, requestData, opts) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_c) {
        return [2 /*return*/, instance === null || instance === void 0 ? void 0 : instance.acceptPendingApproval(id, requestData, opts)];
    }); }); },
    rejectPendingApproval: function (id, reason, opts) {
        if (opts === void 0) { opts = {}; }
        return instance === null || instance === void 0 ? void 0 : instance.rejectPendingApproval(id, reason, opts);
    },
    setSelectedAddress: function (address) {
        assertEngineExists(instance);
        instance.setSelectedAccount(address);
    },
    setAccountLabel: function (address, label) {
        assertEngineExists(instance);
        instance.setAccountLabel(address, label);
    },
    getGlobalEthQuery: function () {
        assertEngineExists(instance);
        return instance.getGlobalEthQuery();
    }
};
