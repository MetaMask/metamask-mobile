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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.initialState = exports.networkShortNameSelector = exports.getRampNetworks = exports.getHasOrders = exports.getActivationKeys = exports.getAuthenticationUrls = exports.getOrderById = exports.getCustomOrderIds = exports.getPendingOrders = exports.getOrders = exports.getOrdersProviders = exports.fiatOrdersGetStartedSell = exports.fiatOrdersGetStartedAgg = exports.fiatOrdersPaymentMethodSelectorAgg = exports.fiatOrdersRegionSelectorAgg = exports.selectedAddressSelector = exports.chainIdSelector = exports.getProviderName = exports.removeFiatSellTxHash = exports.setFiatSellTxHash = exports.updateOnRampNetworks = exports.updateActivationKey = exports.removeActivationKey = exports.addActivationKey = exports.removeAuthenticationUrl = exports.addAuthenticationUrl = exports.removeFiatCustomIdData = exports.updateFiatCustomIdData = exports.addFiatCustomIdData = exports.setFiatOrdersGetStartedSell = exports.setFiatOrdersGetStartedAGG = exports.setFiatOrdersPaymentMethodAGG = exports.setFiatOrdersRegionAGG = exports.updateFiatOrder = exports.removeFiatOrder = exports.addFiatOrder = exports.resetFiatOrders = void 0;
var reselect_1 = require("reselect");
var networkController_1 = require("../../selectors/networkController");
var accountsController_1 = require("../../selectors/accountsController");
var on_ramp_1 = require("../../constants/on-ramp");
var types_1 = require("./types");
var networks_1 = require("../../util/networks");
var controller_utils_1 = require("@metamask/controller-utils");
/** Action Creators */
var resetFiatOrders = function () { return ({
    type: types_1.ACTIONS.FIAT_RESET
}); };
exports.resetFiatOrders = resetFiatOrders;
var addFiatOrder = function (order) { return ({
    type: types_1.ACTIONS.FIAT_ADD_ORDER,
    payload: order
}); };
exports.addFiatOrder = addFiatOrder;
var removeFiatOrder = function (order) { return ({
    type: types_1.ACTIONS.FIAT_REMOVE_ORDER,
    payload: order
}); };
exports.removeFiatOrder = removeFiatOrder;
var updateFiatOrder = function (order) { return ({
    type: types_1.ACTIONS.FIAT_UPDATE_ORDER,
    payload: order
}); };
exports.updateFiatOrder = updateFiatOrder;
var setFiatOrdersRegionAGG = function (region) { return ({
    type: types_1.ACTIONS.FIAT_SET_REGION_AGG,
    payload: region
}); };
exports.setFiatOrdersRegionAGG = setFiatOrdersRegionAGG;
var setFiatOrdersPaymentMethodAGG = function (paymentMethodId) { return ({
    type: types_1.ACTIONS.FIAT_SET_PAYMENT_METHOD_AGG,
    payload: paymentMethodId
}); };
exports.setFiatOrdersPaymentMethodAGG = setFiatOrdersPaymentMethodAGG;
var setFiatOrdersGetStartedAGG = function (getStartedFlag) { return ({
    type: types_1.ACTIONS.FIAT_SET_GETSTARTED_AGG,
    payload: getStartedFlag
}); };
exports.setFiatOrdersGetStartedAGG = setFiatOrdersGetStartedAGG;
var setFiatOrdersGetStartedSell = function (getStartedFlag) { return ({
    type: types_1.ACTIONS.FIAT_SET_GETSTARTED_SELL,
    payload: getStartedFlag
}); };
exports.setFiatOrdersGetStartedSell = setFiatOrdersGetStartedSell;
var addFiatCustomIdData = function (customIdData) { return ({
    type: types_1.ACTIONS.FIAT_ADD_CUSTOM_ID_DATA,
    payload: customIdData
}); };
exports.addFiatCustomIdData = addFiatCustomIdData;
var updateFiatCustomIdData = function (customIdData) { return ({
    type: types_1.ACTIONS.FIAT_UPDATE_CUSTOM_ID_DATA,
    payload: customIdData
}); };
exports.updateFiatCustomIdData = updateFiatCustomIdData;
var removeFiatCustomIdData = function (customIdData) { return ({
    type: types_1.ACTIONS.FIAT_REMOVE_CUSTOM_ID_DATA,
    payload: customIdData
}); };
exports.removeFiatCustomIdData = removeFiatCustomIdData;
var addAuthenticationUrl = function (authenticationUrl) { return ({
    type: types_1.ACTIONS.FIAT_ADD_AUTHENTICATION_URL,
    payload: authenticationUrl
}); };
exports.addAuthenticationUrl = addAuthenticationUrl;
var removeAuthenticationUrl = function (authenticationUrl) { return ({
    type: types_1.ACTIONS.FIAT_REMOVE_AUTHENTICATION_URL,
    payload: authenticationUrl
}); };
exports.removeAuthenticationUrl = removeAuthenticationUrl;
var addActivationKey = function (activationKey, label) { return ({
    type: types_1.ACTIONS.FIAT_ADD_ACTIVATION_KEY,
    payload: { key: activationKey, label: label }
}); };
exports.addActivationKey = addActivationKey;
var removeActivationKey = function (activationKey) { return ({
    type: types_1.ACTIONS.FIAT_REMOVE_ACTIVATION_KEY,
    payload: activationKey
}); };
exports.removeActivationKey = removeActivationKey;
var updateActivationKey = function (activationKey, label, active) { return ({
    type: types_1.ACTIONS.FIAT_UPDATE_ACTIVATION_KEY,
    payload: { key: activationKey, active: active, label: label }
}); };
exports.updateActivationKey = updateActivationKey;
var updateOnRampNetworks = function (networks) { return ({
    type: types_1.ACTIONS.FIAT_UPDATE_NETWORKS,
    payload: networks
}); };
exports.updateOnRampNetworks = updateOnRampNetworks;
var setFiatSellTxHash = function (orderId, txHash) { return ({
    type: types_1.ACTIONS.FIAT_SET_SELL_TX_HASH,
    payload: { orderId: orderId, txHash: txHash }
}); };
exports.setFiatSellTxHash = setFiatSellTxHash;
var removeFiatSellTxHash = function (orderId) { return ({
    type: types_1.ACTIONS.FIAT_REMOVE_SELL_TX_HASH,
    payload: orderId
}); };
exports.removeFiatSellTxHash = removeFiatSellTxHash;
/**
 * Selectors
 */
/**
 * Get the provider display name
 * @param {FIAT_ORDER_PROVIDERS} provider
 */
var getProviderName = function (provider, data) {
    var _c;
    switch (provider) {
        case on_ramp_1.FIAT_ORDER_PROVIDERS.WYRE:
        case on_ramp_1.FIAT_ORDER_PROVIDERS.WYRE_APPLE_PAY: {
            return 'Wyre';
        }
        case on_ramp_1.FIAT_ORDER_PROVIDERS.TRANSAK: {
            return 'Transak';
        }
        case on_ramp_1.FIAT_ORDER_PROVIDERS.MOONPAY: {
            return 'MoonPay';
        }
        case on_ramp_1.FIAT_ORDER_PROVIDERS.AGGREGATOR: {
            var providerName = (_c = data.provider) === null || _c === void 0 ? void 0 : _c.name;
            return providerName ? "".concat(providerName) : '...';
        }
        default: {
            return provider;
        }
    }
};
exports.getProviderName = getProviderName;
var ordersSelector = function (state) {
    return state.fiatOrders.orders || [];
};
var chainIdSelector = function (state) { return (0, networks_1.getDecimalChainId)((0, networkController_1.selectChainId)(state)); };
exports.chainIdSelector = chainIdSelector;
var selectedAddressSelector = function (state) {
    return (0, accountsController_1.selectSelectedInternalAccountChecksummedAddress)(state);
};
exports.selectedAddressSelector = selectedAddressSelector;
var fiatOrdersRegionSelectorAgg = function (state) {
    return state.fiatOrders.selectedRegionAgg;
};
exports.fiatOrdersRegionSelectorAgg = fiatOrdersRegionSelectorAgg;
var fiatOrdersPaymentMethodSelectorAgg = function (state) {
    return state.fiatOrders.selectedPaymentMethodAgg;
};
exports.fiatOrdersPaymentMethodSelectorAgg = fiatOrdersPaymentMethodSelectorAgg;
var fiatOrdersGetStartedAgg = function (state) {
    return state.fiatOrders.getStartedAgg;
};
exports.fiatOrdersGetStartedAgg = fiatOrdersGetStartedAgg;
var fiatOrdersGetStartedSell = function (state) {
    return state.fiatOrders.getStartedSell;
};
exports.fiatOrdersGetStartedSell = fiatOrdersGetStartedSell;
exports.getOrdersProviders = (0, reselect_1.createSelector)(ordersSelector, function (orders) {
    var providers = orders
        .filter(function (order) {
        var _c, _d;
        return order.provider === on_ramp_1.FIAT_ORDER_PROVIDERS.AGGREGATOR &&
            order.state === on_ramp_1.FIAT_ORDER_STATES.COMPLETED &&
            ((_d = (_c = order.data) === null || _c === void 0 ? void 0 : _c.provider) === null || _d === void 0 ? void 0 : _d.id);
    })
        .map(function (order) { return order.data.provider.id; });
    return Array.from(new Set(providers));
});
exports.getOrders = (0, reselect_1.createSelector)(ordersSelector, exports.selectedAddressSelector, exports.chainIdSelector, function (orders, selectedAddress, chainId) {
    return orders.filter(function (order) {
        return !order.excludeFromPurchases &&
            order.account === selectedAddress &&
            (order.network === chainId || (0, networks_1.isTestNet)((0, controller_utils_1.toHex)(chainId)));
    });
});
exports.getPendingOrders = (0, reselect_1.createSelector)(ordersSelector, exports.selectedAddressSelector, exports.chainIdSelector, function (orders, selectedAddress, chainId) {
    return orders.filter(function (order) {
        return order.account === selectedAddress &&
            order.network === chainId &&
            order.state === on_ramp_1.FIAT_ORDER_STATES.PENDING;
    });
});
var customOrdersSelector = function (state) {
    return state.fiatOrders.customOrderIds || [];
};
exports.getCustomOrderIds = (0, reselect_1.createSelector)(customOrdersSelector, exports.selectedAddressSelector, exports.chainIdSelector, function (customOrderIds, selectedAddress, chainId) {
    return customOrderIds.filter(function (customOrderId) {
        return customOrderId.account === selectedAddress &&
            customOrderId.chainId === chainId;
    });
});
exports.getOrderById = (0, reselect_1.createSelector)([ordersSelector, function (_state, orderId) { return orderId; }], function (orders, orderId) { return orders.find(function (order) { return order.id === orderId; }); });
var getAuthenticationUrls = function (state) {
    return state.fiatOrders.authenticationUrls || [];
};
exports.getAuthenticationUrls = getAuthenticationUrls;
var getActivationKeys = function (state) {
    return state.fiatOrders.activationKeys || [];
};
exports.getActivationKeys = getActivationKeys;
exports.getHasOrders = (0, reselect_1.createSelector)(exports.getOrders, function (orders) { return orders.length > 0; });
var getRampNetworks = function (state) {
    return state.fiatOrders.networks || [];
};
exports.getRampNetworks = getRampNetworks;
exports.networkShortNameSelector = (0, reselect_1.createSelector)(exports.chainIdSelector, exports.getRampNetworks, function (chainId, networks) {
    var network = networks.find(
    // TODO(ramp, chainId-string): remove once chainId is a string
    function (aggregatorNetwork) { return "".concat(aggregatorNetwork.chainId) === chainId; });
    return network === null || network === void 0 ? void 0 : network.shortName;
});
exports.initialState = {
    orders: [],
    customOrderIds: [],
    networks: [],
    selectedRegionAgg: null,
    selectedPaymentMethodAgg: null,
    getStartedAgg: false,
    getStartedSell: false,
    authenticationUrls: [],
    activationKeys: []
};
var findOrderIndex = function (provider, id, orders) {
    return orders.findIndex(function (order) { return order.id === id && order.provider === provider; });
};
var findCustomIdIndex = function (id, customOrderIds) { return customOrderIds.findIndex(function (customOrderId) { return customOrderId.id === id; }); };
var fiatOrderReducer = function (state, action) {
    if (state === void 0) { state = exports.initialState; }
    if (action === void 0) { action = { type: null }; }
    switch (action.type) {
        case types_1.ACTIONS.FIAT_ADD_ORDER: {
            var orders = state.orders;
            var order = action.payload;
            var index = findOrderIndex(order.provider, order.id, orders);
            if (index !== -1) {
                return state;
            }
            return __assign(__assign({}, state), { orders: __spreadArray([action.payload], state.orders, true) });
        }
        case types_1.ACTIONS.FIAT_UPDATE_ORDER: {
            var orders = state.orders;
            var order = action.payload;
            var index = findOrderIndex(order.provider, order.id, orders);
            if (index === -1) {
                return state;
            }
            return __assign(__assign({}, state), { orders: __spreadArray(__spreadArray(__spreadArray([], orders.slice(0, index), true), [
                    __assign(__assign({}, orders[index]), order)
                ], false), orders.slice(index + 1), true) });
        }
        case types_1.ACTIONS.FIAT_REMOVE_ORDER: {
            var orders = state.orders;
            var order = action.payload;
            var index = findOrderIndex(order.provider, order.id, state.orders);
            if (index === -1) {
                return state;
            }
            return __assign(__assign({}, state), { orders: __spreadArray(__spreadArray([], orders.slice(0, index), true), orders.slice(index + 1), true) });
        }
        case types_1.ACTIONS.FIAT_RESET: {
            return exports.initialState;
        }
        case types_1.ACTIONS.FIAT_SET_GETSTARTED_AGG: {
            return __assign(__assign({}, state), { getStartedAgg: action.payload });
        }
        case types_1.ACTIONS.FIAT_SET_GETSTARTED_SELL: {
            return __assign(__assign({}, state), { getStartedSell: action.payload });
        }
        case types_1.ACTIONS.FIAT_SET_REGION_AGG: {
            return __assign(__assign({}, state), { selectedRegionAgg: action.payload });
        }
        case types_1.ACTIONS.FIAT_SET_PAYMENT_METHOD_AGG: {
            return __assign(__assign({}, state), { selectedPaymentMethodAgg: action.payload });
        }
        case types_1.ACTIONS.FIAT_ADD_CUSTOM_ID_DATA: {
            var customOrderIds = state.customOrderIds;
            var customIdData = action.payload;
            var index = findCustomIdIndex(customIdData.id, customOrderIds);
            if (index !== -1) {
                return state;
            }
            return __assign(__assign({}, state), { customOrderIds: __spreadArray(__spreadArray([], state.customOrderIds, true), [action.payload], false) });
        }
        case types_1.ACTIONS.FIAT_UPDATE_CUSTOM_ID_DATA: {
            var customOrderIds = state.customOrderIds;
            var customIdData = action.payload;
            var index = findCustomIdIndex(customIdData.id, customOrderIds);
            if (index === -1) {
                return state;
            }
            return __assign(__assign({}, state), { customOrderIds: __spreadArray(__spreadArray(__spreadArray([], customOrderIds.slice(0, index), true), [
                    __assign(__assign({}, customOrderIds[index]), customIdData)
                ], false), customOrderIds.slice(index + 1), true) });
        }
        case types_1.ACTIONS.FIAT_REMOVE_CUSTOM_ID_DATA: {
            var customOrderIds = state.customOrderIds;
            var customIdData = action.payload;
            var index = findCustomIdIndex(customIdData.id, customOrderIds);
            if (index === -1) {
                return state;
            }
            return __assign(__assign({}, state), { customOrderIds: __spreadArray(__spreadArray([], customOrderIds.slice(0, index), true), customOrderIds.slice(index + 1), true) });
        }
        case types_1.ACTIONS.FIAT_ADD_AUTHENTICATION_URL: {
            var authenticationUrls = state.authenticationUrls;
            var authenticationUrl_1 = action.payload;
            var index = authenticationUrls.findIndex(function (url) { return url === authenticationUrl_1; });
            if (index !== -1) {
                return state;
            }
            return __assign(__assign({}, state), { authenticationUrls: __spreadArray(__spreadArray([], state.authenticationUrls, true), [authenticationUrl_1], false) });
        }
        case types_1.ACTIONS.FIAT_REMOVE_AUTHENTICATION_URL: {
            var authenticationUrls = state.authenticationUrls;
            var authenticationUrl_2 = action.payload;
            var index = authenticationUrls.findIndex(function (url) { return url === authenticationUrl_2; });
            if (index === -1) {
                return state;
            }
            return __assign(__assign({}, state), { authenticationUrls: __spreadArray(__spreadArray([], authenticationUrls.slice(0, index), true), authenticationUrls.slice(index + 1), true) });
        }
        case types_1.ACTIONS.FIAT_ADD_ACTIVATION_KEY: {
            var activationKeys = state.activationKeys;
            var _c = action.payload, key_1 = _c.key, label = _c.label;
            var index = activationKeys.findIndex(function (activationKey) { return activationKey.key === key_1; });
            if (index !== -1) {
                return state;
            }
            return __assign(__assign({}, state), { activationKeys: __spreadArray(__spreadArray([], state.activationKeys, true), [{ key: key_1, label: label, active: true }], false) });
        }
        case types_1.ACTIONS.FIAT_REMOVE_ACTIVATION_KEY: {
            var activationKeys = state.activationKeys;
            var key_2 = action.payload;
            var index = activationKeys.findIndex(function (activationKey) { return activationKey.key === key_2; });
            if (index === -1) {
                return state;
            }
            return __assign(__assign({}, state), { activationKeys: __spreadArray(__spreadArray([], activationKeys.slice(0, index), true), activationKeys.slice(index + 1), true) });
        }
        case types_1.ACTIONS.FIAT_UPDATE_ACTIVATION_KEY: {
            var activationKeys = state.activationKeys;
            var _d = action.payload, key_3 = _d.key, active = _d.active, label = _d.label;
            var index = activationKeys.findIndex(function (activationKey) { return activationKey.key === key_3; });
            if (index === -1) {
                return state;
            }
            return __assign(__assign({}, state), { activationKeys: __spreadArray(__spreadArray(__spreadArray([], activationKeys.slice(0, index), true), [
                    __assign(__assign({}, activationKeys[index]), { label: label !== null && label !== void 0 ? label : activationKeys[index].label, active: active })
                ], false), activationKeys.slice(index + 1), true) });
        }
        case types_1.ACTIONS.FIAT_UPDATE_NETWORKS: {
            return __assign(__assign({}, state), { networks: action.payload });
        }
        case types_1.ACTIONS.FIAT_SET_SELL_TX_HASH: {
            var _e = action.payload, orderId_1 = _e.orderId, txHash = _e.txHash;
            var orders = state.orders;
            var index = orders.findIndex(function (order) { return order.id === orderId_1; });
            if (index === -1) {
                return state;
            }
            return __assign(__assign({}, state), { orders: __spreadArray(__spreadArray(__spreadArray([], orders.slice(0, index), true), [
                    __assign(__assign({}, orders[index]), { sellTxHash: txHash })
                ], false), orders.slice(index + 1), true) });
        }
        case types_1.ACTIONS.FIAT_REMOVE_SELL_TX_HASH: {
            var orderId_2 = action.payload;
            var orders = state.orders;
            var index = orders.findIndex(function (order) { return order.id === orderId_2; });
            if (index === -1) {
                return state;
            }
            return __assign(__assign({}, state), { orders: __spreadArray(__spreadArray(__spreadArray([], orders.slice(0, index), true), [
                    __assign(__assign({}, orders[index]), { sellTxHash: undefined })
                ], false), orders.slice(index + 1), true) });
        }
        default: {
            return state;
        }
    }
};
exports["default"] = fiatOrderReducer;
