"use strict";
exports.__esModule = true;
var bookmarks_1 = require("./bookmarks");
var browser_1 = require("./browser");
var engine_1 = require("../core/redux/slices/engine");
var privacy_1 = require("./privacy");
var modals_1 = require("./modals");
var settings_1 = require("./settings");
var alert_1 = require("./alert");
var transaction_1 = require("./transaction");
var legalNotices_1 = require("./legalNotices");
var user_1 = require("./user");
var wizard_1 = require("./wizard");
var onboarding_1 = require("./onboarding");
var fiatOrders_1 = require("./fiatOrders");
var swaps_1 = require("./swaps");
var signatureRequest_1 = require("./signatureRequest");
var notification_1 = require("./notification");
var infuraAvailability_1 = require("./infuraAvailability");
var collectibles_1 = require("./collectibles");
var navigation_1 = require("./navigation");
var networkSelector_1 = require("./networkSelector");
var security_1 = require("./security");
var redux_1 = require("redux");
var experimentalSettings_1 = require("./experimentalSettings");
var rpcEvents_1 = require("./rpcEvents");
var accounts_1 = require("./accounts");
var sdk_1 = require("./sdk");
var inpageProvider_1 = require("../core/redux/slices/inpageProvider");
var smartTransactions_1 = require("../core/redux/slices/smartTransactions");
var transactionMetrics_1 = require("../core/redux/slices/transactionMetrics");
var originThrottling_1 = require("../core/redux/slices/originThrottling");
// TODO: Fix the Action type. It's set to `any` now because some of the
// TypeScript reducers have invalid actions
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var rootReducer = (0, redux_1.combineReducers)({
    legalNotices: legalNotices_1["default"],
    collectibles: collectibles_1["default"],
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    engine: engine_1["default"],
    privacy: privacy_1["default"],
    bookmarks: bookmarks_1["default"],
    browser: browser_1["default"],
    modals: modals_1["default"],
    settings: settings_1["default"],
    alert: alert_1["default"],
    transaction: transaction_1["default"],
    smartTransactions: smartTransactions_1["default"],
    user: user_1["default"],
    wizard: wizard_1["default"],
    onboarding: onboarding_1["default"],
    notification: notification_1["default"],
    signatureRequest: signatureRequest_1["default"],
    swaps: swaps_1["default"],
    fiatOrders: fiatOrders_1["default"],
    infuraAvailability: infuraAvailability_1["default"],
    navigation: navigation_1["default"],
    networkOnboarded: networkSelector_1["default"],
    security: security_1["default"],
    sdk: sdk_1["default"],
    experimentalSettings: experimentalSettings_1["default"],
    rpcEvents: rpcEvents_1["default"],
    accounts: accounts_1["default"],
    inpageProvider: inpageProvider_1["default"],
    transactionMetrics: transactionMetrics_1["default"],
    originThrottling: originThrottling_1["default"]
});
exports["default"] = rootReducer;
