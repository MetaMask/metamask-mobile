"use strict";
exports.__esModule = true;
exports.setDataCollectionForMarketing = exports.setNftAutoDetectionModalOpen = exports.setAutomaticSecurityChecksModalOpen = exports.userSelectedAutomaticSecurityChecksOptions = exports.setAutomaticSecurityChecks = exports.setAllowLoginWithRememberMe = exports.ActionType = void 0;
var ActionType;
(function (ActionType) {
    ActionType["SET_ALLOW_LOGIN_WITH_REMEMBER_ME"] = "SET_ALLOW_LOGIN_WITH_REMEMBER_ME";
    ActionType["SET_AUTOMATIC_SECURITY_CHECKS"] = "SET_AUTOMATIC_SECURITY_CHECKS";
    ActionType["USER_SELECTED_AUTOMATIC_SECURITY_CHECKS_OPTION"] = "USER_SELECTED_AUTOMATIC_SECURITY_CHECKS_OPTION";
    ActionType["SET_AUTOMATIC_SECURITY_CHECKS_MODAL_OPEN"] = "SET_AUTOMATIC_SECURITY_CHECKS_MODAL_OPEN";
    ActionType["SET_DATA_COLLECTION_FOR_MARKETING"] = "SET_DATA_COLLECTION_FOR_MARKETING";
    ActionType["SET_NFT_AUTO_DETECTION_MODAL_OPEN"] = "SET_NFT_AUTO_DETECTION_MODAL_OPEN";
})(ActionType = exports.ActionType || (exports.ActionType = {}));
var setAllowLoginWithRememberMe = function (enabled) { return ({
    type: ActionType.SET_ALLOW_LOGIN_WITH_REMEMBER_ME,
    enabled: enabled
}); };
exports.setAllowLoginWithRememberMe = setAllowLoginWithRememberMe;
var setAutomaticSecurityChecks = function (enabled) { return ({
    type: ActionType.SET_AUTOMATIC_SECURITY_CHECKS,
    enabled: enabled
}); };
exports.setAutomaticSecurityChecks = setAutomaticSecurityChecks;
var userSelectedAutomaticSecurityChecksOptions = function () { return ({
    type: ActionType.USER_SELECTED_AUTOMATIC_SECURITY_CHECKS_OPTION,
    selected: true
}); };
exports.userSelectedAutomaticSecurityChecksOptions = userSelectedAutomaticSecurityChecksOptions;
var setAutomaticSecurityChecksModalOpen = function (open) { return ({
    type: ActionType.SET_AUTOMATIC_SECURITY_CHECKS_MODAL_OPEN,
    open: open
}); };
exports.setAutomaticSecurityChecksModalOpen = setAutomaticSecurityChecksModalOpen;
var setNftAutoDetectionModalOpen = function (open) { return ({
    type: ActionType.SET_NFT_AUTO_DETECTION_MODAL_OPEN,
    open: open
}); };
exports.setNftAutoDetectionModalOpen = setNftAutoDetectionModalOpen;
var setDataCollectionForMarketing = function (enabled) { return ({
    type: ActionType.SET_DATA_COLLECTION_FOR_MARKETING,
    enabled: enabled
}); };
exports.setDataCollectionForMarketing = setDataCollectionForMarketing;
