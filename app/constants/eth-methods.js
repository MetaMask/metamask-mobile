"use strict";
exports.__esModule = true;
exports.ETH_EOA_METHODS = void 0;
var keyring_api_1 = require("@metamask/keyring-api");
// eslint-disable-next-line import/prefer-default-export
exports.ETH_EOA_METHODS = [
    keyring_api_1.EthMethod.PersonalSign,
    keyring_api_1.EthMethod.Sign,
    keyring_api_1.EthMethod.SignTransaction,
    keyring_api_1.EthMethod.SignTypedDataV1,
    keyring_api_1.EthMethod.SignTypedDataV3,
    keyring_api_1.EthMethod.SignTypedDataV4,
];
