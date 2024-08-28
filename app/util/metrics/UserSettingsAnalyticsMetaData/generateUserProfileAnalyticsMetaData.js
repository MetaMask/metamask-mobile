"use strict";
exports.__esModule = true;
var react_native_1 = require("react-native");
var store_1 = require("../../../store");
var UserProfileAnalyticsMetaData_types_1 = require("./UserProfileAnalyticsMetaData.types");
/**
 * Generate user profile analytics meta data
 * To be used in the Segment identify call
 */
var generateUserProfileAnalyticsMetaData = function () {
    var _c;
    var _d, _e, _f;
    var reduxState = store_1.store.getState();
    var preferencesController = (_e = (_d = reduxState === null || reduxState === void 0 ? void 0 : reduxState.engine) === null || _d === void 0 ? void 0 : _d.backgroundState) === null || _e === void 0 ? void 0 : _e.PreferencesController;
    var appTheme = (_f = reduxState === null || reduxState === void 0 ? void 0 : reduxState.user) === null || _f === void 0 ? void 0 : _f.appTheme;
    // This will return either "light" or "dark"
    var appThemeStyle = appTheme === 'os' ? react_native_1.Appearance.getColorScheme() : appTheme;
    return _c = {},
        _c[UserProfileAnalyticsMetaData_types_1.UserProfileProperty.ENABLE_OPENSEA_API] = (preferencesController === null || preferencesController === void 0 ? void 0 : preferencesController.displayNftMedia)
            ? UserProfileAnalyticsMetaData_types_1.UserProfileProperty.ON
            : UserProfileAnalyticsMetaData_types_1.UserProfileProperty.OFF,
        _c[UserProfileAnalyticsMetaData_types_1.UserProfileProperty.NFT_AUTODETECTION] = (preferencesController === null || preferencesController === void 0 ? void 0 : preferencesController.useNftDetection)
            ? UserProfileAnalyticsMetaData_types_1.UserProfileProperty.ON
            : UserProfileAnalyticsMetaData_types_1.UserProfileProperty.OFF,
        _c[UserProfileAnalyticsMetaData_types_1.UserProfileProperty.THEME] = appThemeStyle,
        _c[UserProfileAnalyticsMetaData_types_1.UserProfileProperty.TOKEN_DETECTION] = (preferencesController === null || preferencesController === void 0 ? void 0 : preferencesController.useTokenDetection)
            ? UserProfileAnalyticsMetaData_types_1.UserProfileProperty.ON
            : UserProfileAnalyticsMetaData_types_1.UserProfileProperty.OFF,
        _c[UserProfileAnalyticsMetaData_types_1.UserProfileProperty.MULTI_ACCOUNT_BALANCE] = (preferencesController === null || preferencesController === void 0 ? void 0 : preferencesController.isMultiAccountBalancesEnabled)
            ? UserProfileAnalyticsMetaData_types_1.UserProfileProperty.ON
            : UserProfileAnalyticsMetaData_types_1.UserProfileProperty.OFF,
        _c[UserProfileAnalyticsMetaData_types_1.UserProfileProperty.SECURITY_PROVIDERS] = (preferencesController === null || preferencesController === void 0 ? void 0 : preferencesController.securityAlertsEnabled) ? 'blockaid' : '',
        _c;
};
exports["default"] = generateUserProfileAnalyticsMetaData;
