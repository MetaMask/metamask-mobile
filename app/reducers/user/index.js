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
exports.userInitialState = void 0;
var models_1 = require("../../util/theme/models");
exports.userInitialState = {
    loadingMsg: '',
    loadingSet: false,
    passwordSet: false,
    seedphraseBackedUp: false,
    backUpSeedphraseVisible: false,
    protectWalletModalVisible: false,
    gasEducationCarouselSeen: false,
    userLoggedIn: false,
    isAuthChecked: false,
    initialScreen: '',
    appTheme: models_1.AppThemeKey.os,
    ambiguousAddressEntries: {}
};
var userReducer = function (
// eslint-disable-next-line @typescript-eslint/default-param-last
state, action) {
    if (state === void 0) { state = exports.userInitialState; }
    switch (action.type) {
        case 'LOGIN':
            return __assign(__assign({}, state), { userLoggedIn: true });
        case 'LOGOUT':
            return __assign(__assign({}, state), { userLoggedIn: false });
        case 'LOADING_SET':
            return __assign(__assign({}, state), { loadingSet: true, loadingMsg: action.loadingMsg });
        case 'LOADING_UNSET':
            return __assign(__assign({}, state), { loadingSet: false });
        case 'PASSWORD_SET':
            return __assign(__assign({}, state), { passwordSet: true });
        case 'PASSWORD_UNSET':
            return __assign(__assign({}, state), { passwordSet: false });
        case 'SEEDPHRASE_NOT_BACKED_UP':
            return __assign(__assign({}, state), { seedphraseBackedUp: false, backUpSeedphraseVisible: true });
        case 'SEEDPHRASE_BACKED_UP':
            return __assign(__assign({}, state), { seedphraseBackedUp: true, backUpSeedphraseVisible: false });
        case 'BACK_UP_SEEDPHRASE_VISIBLE':
            return __assign(__assign({}, state), { backUpSeedphraseVisible: true });
        case 'BACK_UP_SEEDPHRASE_NOT_VISIBLE':
            return __assign(__assign({}, state), { backUpSeedphraseVisible: false });
        case 'PROTECT_MODAL_VISIBLE':
            if (!state.seedphraseBackedUp) {
                return __assign(__assign({}, state), { protectWalletModalVisible: true });
            }
            return state;
        case 'PROTECT_MODAL_NOT_VISIBLE':
            return __assign(__assign({}, state), { protectWalletModalVisible: false });
        case 'SET_GAS_EDUCATION_CAROUSEL_SEEN':
            return __assign(__assign({}, state), { gasEducationCarouselSeen: true });
        case 'SET_APP_THEME':
            return __assign(__assign({}, state), { appTheme: action.payload.theme });
        default:
            return state;
    }
};
exports["default"] = userReducer;
