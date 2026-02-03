/**
 * Multichain accounts navigation parameters
 */

/** Multichain account detail actions parameters */
export interface MultichainAccountDetailActionsParams {
  screen: string;
  params?: Record<string, unknown>;
}

/** Multichain transaction details parameters */
export interface MultichainTransactionDetailsParams {
  transactionId?: string;
}

/** Multichain account actions parameters */
export interface MultichainAccountActionsParams {
  address?: string;
  accountId?: string;
}

/** Edit account name parameters */
export interface EditAccountNameParams {
  address?: string;
  accountId?: string;
}

/** Edit wallet name parameters */
export interface EditWalletNameParams {
  keyringId?: string;
}

/** Share address parameters */
export interface ShareAddressParams {
  address?: string;
}

/** Share address QR parameters */
export interface ShareAddressQRParams {
  address?: string;
  networkName?: string;
  chainId?: string;
  groupId?: string;
}

/** Delete account parameters */
export interface DeleteAccountParams {
  address?: string;
  accountId?: string;
}

/** Smart account parameters */
export interface SmartAccountParams {
  address?: string;
}

/** Multichain account details parameters */
export interface MultichainAccountDetailsParams {
  address?: string;
  accountId?: string;
}

/** Multichain account group details parameters */
export interface MultichainAccountGroupDetailsParams {
  groupId?: string;
}

/** Multichain wallet details parameters */
export interface MultichainWalletDetailsParams {
  keyringId?: string;
}

/** Multichain address list parameters */
export interface MultichainAddressListParams {
  accountId?: string;
}

/** Multichain private key list parameters */
export interface MultichainPrivateKeyListParams {
  accountId?: string;
}
