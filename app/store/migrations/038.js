"use strict";
exports.__esModule = true;
var react_native_1 = require("@sentry/react-native");
var utils_1 = require("@metamask/utils");
var util_1 = require("./util");
function migrate(state) {
    var _c;
    if (!(0, util_1.ensureValidState)(state, 38)) {
        return state;
    }
    var currencyRateState = state.engine.backgroundState.CurrencyRateController;
    if (!(0, utils_1.isObject)(currencyRateState)) {
        (0, react_native_1.captureException)(new Error("Migration 38: Invalid CurrencyRateController state error: '".concat(JSON.stringify(currencyRateState), "'")));
        return state;
    }
    var currentCurrency = currencyRateState.currentCurrency, nativeCurrency = currencyRateState.nativeCurrency, conversionRate = currencyRateState.conversionRate, conversionDate = currencyRateState.conversionDate, usdConversionRate = currencyRateState.usdConversionRate;
    delete currencyRateState.pendingCurrentCurrency;
    delete currencyRateState.pendingNativeCurrency;
    state.engine.backgroundState.CurrencyRateController = {
        currentCurrency: currentCurrency,
        currencyRates: (_c = {},
            _c[nativeCurrency] = {
                conversionRate: conversionRate,
                conversionDate: conversionDate,
                usdConversionRate: usdConversionRate
            },
            _c)
    };
    return state;
}
exports["default"] = migrate;
