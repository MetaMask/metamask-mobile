"use strict";
exports.__esModule = true;
var eth_sendTransaction_1 = require("./eth_sendTransaction");
var wallet_addEthereumChain_1 = require("./wallet_addEthereumChain");
var wallet_switchEthereumChain_1 = require("./wallet_switchEthereumChain");
var wallet_watchAsset_1 = require("./wallet_watchAsset");
var RPCMethods = {
    eth_sendTransaction: eth_sendTransaction_1["default"],
    wallet_addEthereumChain: wallet_addEthereumChain_1["default"],
    wallet_switchEthereumChain: wallet_switchEthereumChain_1["default"],
    wallet_watchAsset: wallet_watchAsset_1["default"]
};
exports["default"] = RPCMethods;
