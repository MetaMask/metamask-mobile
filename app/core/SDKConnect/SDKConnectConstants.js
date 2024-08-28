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
var _c, _d;
exports.__esModule = true;
exports.METHODS_TO_DELAY = exports.METHODS_TO_REDIRECT = exports.CONNECTION_LOADING_EVENT = exports.RPC_METHODS = exports.TIMEOUT_PAUSE_CONNECTIONS = exports.DEFAULT_SESSION_TIMEOUT_MS = exports.DAY_IN_MS = exports.HOUR_IN_MS = exports.MIN_IN_MS = void 0;
exports.MIN_IN_MS = 1000 * 60;
exports.HOUR_IN_MS = exports.MIN_IN_MS * 60;
exports.DAY_IN_MS = exports.HOUR_IN_MS * 24;
exports.DEFAULT_SESSION_TIMEOUT_MS = 30 * exports.DAY_IN_MS;
exports.TIMEOUT_PAUSE_CONNECTIONS = 25000;
exports.RPC_METHODS = {
    METAMASK_GETPROVIDERSTATE: 'metamask_getProviderState',
    METAMASK_CONNECTSIGN: 'metamask_connectSign',
    METAMASK_CONNECTWITH: 'metamask_connectWith',
    METAMASK_OPEN: 'metamask_open',
    METAMASK_BATCH: 'metamask_batch',
    PERSONAL_SIGN: 'personal_sign',
    ETH_SIGN: 'eth_sign',
    ETH_REQUESTACCOUNTS: 'eth_requestAccounts',
    ETH_SENDTRANSACTION: 'eth_sendTransaction',
    ETH_SIGNTRANSACTION: 'eth_signTransaction',
    ETH_SIGNTYPEDEATA: 'eth_signTypedData',
    ETH_SIGNTYPEDEATAV3: 'eth_signTypedData_v3',
    ETH_SIGNTYPEDEATAV4: 'eth_signTypedData_v4',
    WALLET_WATCHASSET: 'wallet_watchAsset',
    WALLET_ADDETHEREUMCHAIN: 'wallet_addEthereumChain',
    WALLET_SWITCHETHEREUMCHAIN: 'wallet_switchEthereumChain',
    WALLET_REQUESTPERMISSIONS: 'wallet_requestPermissions',
    WALLET_GETPERMISSIONS: 'wallet_getPermissions',
    ETH_ACCOUNTS: 'eth_accounts',
    ETH_CHAINID: 'eth_chainId'
};
exports.CONNECTION_LOADING_EVENT = 'loading';
exports.METHODS_TO_REDIRECT = (_c = {},
    _c[exports.RPC_METHODS.ETH_REQUESTACCOUNTS] = true,
    _c[exports.RPC_METHODS.ETH_SENDTRANSACTION] = true,
    _c[exports.RPC_METHODS.ETH_SIGNTRANSACTION] = true,
    _c[exports.RPC_METHODS.ETH_SIGN] = true,
    _c[exports.RPC_METHODS.PERSONAL_SIGN] = true,
    _c[exports.RPC_METHODS.ETH_SIGNTRANSACTION] = true,
    _c[exports.RPC_METHODS.ETH_SIGNTYPEDEATAV3] = true,
    _c[exports.RPC_METHODS.ETH_SIGNTYPEDEATAV4] = true,
    _c[exports.RPC_METHODS.WALLET_WATCHASSET] = true,
    _c[exports.RPC_METHODS.WALLET_ADDETHEREUMCHAIN] = true,
    _c[exports.RPC_METHODS.WALLET_SWITCHETHEREUMCHAIN] = true,
    _c[exports.RPC_METHODS.WALLET_REQUESTPERMISSIONS] = true,
    _c[exports.RPC_METHODS.WALLET_GETPERMISSIONS] = true,
    _c[exports.RPC_METHODS.METAMASK_CONNECTSIGN] = true,
    _c[exports.RPC_METHODS.METAMASK_BATCH] = true,
    _c);
exports.METHODS_TO_DELAY = __assign(__assign({}, exports.METHODS_TO_REDIRECT), (_d = {}, _d[exports.RPC_METHODS.ETH_REQUESTACCOUNTS] = false, _d));
