// Network Errors
export enum NetworkSwitchErrorType {
  missingNetworkId = 'Missing network id',
  currentNetwork = 'Already in current network',
  unknownNetworkId = 'Unknown network with id',
  missingChainId = 'Missing chain id',
}

// Transaction Errors
export const NEGATIVE_TOKEN_DECIMALS = 'Token decimals can not be negative';
export const NETWORK_ERROR_UNKNOWN_CHAIN_ID = 'Unknown chain id';

// QR hardware Errors
export const KEYSTONE_TX_CANCELED = 'KeystoneError#Tx_canceled';

// Password Errors
export const WRONG_PASSWORD_ERROR = 'error: Invalid password';

// Contact Flow Errors
export const CONTACT_ALREADY_SAVED = 'contactAlreadySaved';
export const SYMBOL_ERROR = 'symbolError';

// Authentication errors
export const AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS =
  'Password does not exist when calling SecureKeychain.getGenericPassword';
export const AUTHENTICATION_APP_TRIGGERED_AUTH_ERROR =
  'Authentication.appTriggeredAuth failed to login';
export const AUTHENTICATION_FAILED_WALLET_CREATION = 'Failed wallet creation';
export const AUTHENTICATION_FAILED_TO_LOGIN = 'Failed to login';
export const AUTHENTICATION_RESET_PASSWORD_FAILED_MESSAGE =
  'Authentication.resetPassword failed when calling SecureKeychain.resetGenericPassword with:';
export const AUTHENTICATION_RESET_PASSWORD_FAILED =
  'Authentication.resetPassword failed';

export const AUTHENTICATION_STORE_PASSWORD_FAILED =
  'Authentication.storePassword failed';

export const AUTHENTICATION_LOGIN_VAULT_CREATION_FAILED =
  'Authentication.loginVaultCreation was unable to recreate vault';

// EngineService
export const VAULT_CREATION_ERROR = 'Error creating the vault';
export const NO_VAULT_IN_BACKUP_ERROR = 'No vault in backup';

// backupVault
export const VAULT_BACKUP_FAILED = 'Vault backup failed';
export const VAULT_BACKUP_FAILED_UNDEFINED =
  'Unable to backup vault as it is undefined';
export const VAULT_FAILED_TO_GET_VAULT_FROM_BACKUP =
  'getVaultFromBackup failed to retrieve vault';

// RPCMethodMiddleware
export const TOKEN_NOT_SUPPORTED_FOR_NETWORK =
  'This token is not supported on this network';
