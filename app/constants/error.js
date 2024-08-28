"use strict";
exports.__esModule = true;
exports.TOKEN_NOT_VALID = exports.TOKEN_NOT_SUPPORTED_FOR_NETWORK = exports.VAULT_FAILED_TO_GET_VAULT_FROM_BACKUP = exports.VAULT_BACKUP_FAILED_UNDEFINED = exports.VAULT_BACKUP_FAILED = exports.NO_VAULT_IN_BACKUP_ERROR = exports.VAULT_CREATION_ERROR = exports.AUTHENTICATION_LOGIN_VAULT_CREATION_FAILED = exports.AUTHENTICATION_STORE_PASSWORD_FAILED = exports.AUTHENTICATION_RESET_PASSWORD_FAILED = exports.AUTHENTICATION_RESET_PASSWORD_FAILED_MESSAGE = exports.AUTHENTICATION_FAILED_TO_LOGIN = exports.AUTHENTICATION_FAILED_WALLET_CREATION = exports.AUTHENTICATION_APP_TRIGGERED_AUTH_ERROR = exports.AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS = exports.SYMBOL_ERROR = exports.CONTACT_ALREADY_SAVED = exports.UNRECOGNIZED_PASSWORD_STRENGTH = exports.WRONG_PASSWORD_ERROR = exports.KEYSTONE_TX_CANCELED = exports.NETWORK_ERROR_UNKNOWN_CHAIN_ID = exports.NEGATIVE_TOKEN_DECIMALS = exports.NetworkSwitchErrorType = void 0;
// Network Errors
var NetworkSwitchErrorType;
(function (NetworkSwitchErrorType) {
    NetworkSwitchErrorType["missingNetworkId"] = "Missing network id";
    NetworkSwitchErrorType["currentNetwork"] = "Already in current network";
    NetworkSwitchErrorType["unknownNetworkId"] = "Unknown network with id";
    NetworkSwitchErrorType["missingChainId"] = "Missing chain id";
})(NetworkSwitchErrorType = exports.NetworkSwitchErrorType || (exports.NetworkSwitchErrorType = {}));
// Transaction Errors
exports.NEGATIVE_TOKEN_DECIMALS = 'Token decimals can not be negative';
exports.NETWORK_ERROR_UNKNOWN_CHAIN_ID = 'Unknown chain id';
// QR hardware Errors
exports.KEYSTONE_TX_CANCELED = 'KeystoneError#Tx_canceled';
// Password Errors
exports.WRONG_PASSWORD_ERROR = 'error: Invalid password';
exports.UNRECOGNIZED_PASSWORD_STRENGTH = 'Unrecognized password strength.';
// Contact Flow Errors
exports.CONTACT_ALREADY_SAVED = 'contactAlreadySaved';
exports.SYMBOL_ERROR = 'symbolError';
// Authentication errors
exports.AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS = 'Password does not exist when calling SecureKeychain.getGenericPassword';
exports.AUTHENTICATION_APP_TRIGGERED_AUTH_ERROR = 'Authentication.appTriggeredAuth failed to login';
exports.AUTHENTICATION_FAILED_WALLET_CREATION = 'Failed wallet creation';
exports.AUTHENTICATION_FAILED_TO_LOGIN = 'Failed to login';
exports.AUTHENTICATION_RESET_PASSWORD_FAILED_MESSAGE = 'Authentication.resetPassword failed when calling SecureKeychain.resetGenericPassword with:';
exports.AUTHENTICATION_RESET_PASSWORD_FAILED = 'Authentication.resetPassword failed';
exports.AUTHENTICATION_STORE_PASSWORD_FAILED = 'Authentication.storePassword failed';
exports.AUTHENTICATION_LOGIN_VAULT_CREATION_FAILED = 'Authentication.loginVaultCreation was unable to recreate vault';
// EngineService
exports.VAULT_CREATION_ERROR = 'Error creating the vault';
exports.NO_VAULT_IN_BACKUP_ERROR = 'No vault in backup';
// backupVault
exports.VAULT_BACKUP_FAILED = 'Vault backup failed';
exports.VAULT_BACKUP_FAILED_UNDEFINED = 'Unable to backup vault as it is undefined';
exports.VAULT_FAILED_TO_GET_VAULT_FROM_BACKUP = 'getVaultFromBackup failed to retrieve vault';
// RPCMethodMiddleware
exports.TOKEN_NOT_SUPPORTED_FOR_NETWORK = 'This token is not supported on this network';
exports.TOKEN_NOT_VALID = 'This token address os mpt valid';
