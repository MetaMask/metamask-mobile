/**
 * Multichain accounts navigation parameters
 */

import { InternalAccount } from '@metamask/keyring-internal-api';

export interface AccountParams {
  account?: InternalAccount;
}

export interface SelectedAccountParams {
  selectedAccount: InternalAccount;
}

/** Multichain account detail actions parameters */
export interface MultichainAccountDetailActionsParams {
  screen: string;
  params?: Record<string, unknown>;
}

/** Multichain transaction details parameters */
export type { MultichainTransactionDetailsSheetParams as MultichainTransactionDetailsParams } from '../../UI/MultichainTransactionDetailsModal/MultichainTransactionDetailsSheet';

/** Multichain account actions parameters */
export interface MultichainAccountActionsParams extends AccountParams {}

/** Edit account name parameters */
export interface EditAccountNameParams extends SelectedAccountParams {}

/** Edit wallet name parameters */
export interface EditWalletNameParams extends AccountParams {}

/** Share address parameters */
export interface ShareAddressParams extends AccountParams {}

/** Share address QR parameters */
export type { ShareAddressQRParams } from './sheets/ShareAddressQR/ShareAddressQR';

/** Delete account parameters */
export interface DeleteAccountParams extends AccountParams {}

/** Smart account parameters */
export interface SmartAccountParams extends AccountParams {}

/** Multichain account details parameters */
export interface MultichainAccountDetailsParams extends AccountParams {}

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
export type { Params as PrivateKeyListParams } from './PrivateKeyList/types';
