"use strict";
/* eslint-disable import/prefer-default-export */
exports.__esModule = true;
exports.getAllowedSmartTransactionsChainIds = void 0;
var environment_1 = require("../util/environment");
var network_1 = require("./network");
var ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS_DEVELOPMENT = [
    network_1.NETWORKS_CHAIN_ID.MAINNET,
    network_1.NETWORKS_CHAIN_ID.SEPOLIA,
];
var ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS_PRODUCTION = [
    network_1.NETWORKS_CHAIN_ID.MAINNET,
];
var getAllowedSmartTransactionsChainIds = function () {
    return (0, environment_1.isProduction)()
        ? ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS_PRODUCTION
        : ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS_DEVELOPMENT;
};
exports.getAllowedSmartTransactionsChainIds = getAllowedSmartTransactionsChainIds;
