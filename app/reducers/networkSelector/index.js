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
exports.__esModule = true;
exports.initialState = void 0;
exports.initialState = {
    networkOnboardedState: {},
    networkState: {
        showNetworkOnboarding: false,
        nativeToken: '',
        networkType: '',
        networkUrl: ''
    },
    switchedNetwork: {
        networkUrl: '',
        networkStatus: false
    }
};
/**
 *
 * Network onboarding reducer
 * @returns
 */
function networkOnboardReducer(state, action) {
    var _c;
    if (state === void 0) { state = exports.initialState; }
    if (action === void 0) { action = {
        nativeToken: '',
        networkType: '',
        networkUrl: '',
        networkStatus: false,
        showNetworkOnboarding: false,
        type: '',
        payload: undefined
    }; }
    switch (action.type) {
        case 'SHOW_NETWORK_ONBOARDING':
            return __assign(__assign({}, state), { networkState: {
                    showNetworkOnboarding: action.showNetworkOnboarding,
                    nativeToken: action.nativeToken,
                    networkType: action.networkType,
                    networkUrl: action.networkUrl
                } });
        case 'NETWORK_SWITCHED':
            return __assign(__assign({}, state), { switchedNetwork: {
                    networkUrl: action.networkUrl,
                    networkStatus: action.networkStatus
                } });
        case 'NETWORK_ONBOARDED':
            return __assign(__assign({}, state), { networkState: {
                    showNetworkOnboarding: false,
                    nativeToken: '',
                    networkType: '',
                    networkUrl: ''
                }, networkOnboardedState: __assign(__assign({}, state.networkOnboardedState), (_c = {}, _c[action.payload] = true, _c)) });
        default:
            return state;
    }
}
exports["default"] = networkOnboardReducer;
