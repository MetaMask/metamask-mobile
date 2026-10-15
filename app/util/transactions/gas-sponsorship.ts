import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';

import { isGasFeeSponsorshipRequested } from '../../components/Views/confirmations/utils/transaction';
import type { RootState } from '../../reducers';
import { selectShouldUseSmartTransaction } from '../../selectors/smartTransactionsController';
import { accountSupports7702 } from './account-supports-7702';
import { isSendBundleSupported } from './sentinel-api';
import { isRelaySupported } from './transaction-relay';

export interface GasFeeSponsorshipRequest {
  getKeyringForAccount: (address: string) => Promise<unknown>;
  getState: () => RootState;
  transaction: TransactionMeta;
}

/**
 * Whether the transaction is published with Smart Transactions sendBundle.
 *
 * @param state - The Redux state.
 * @param chainId - The chain ID of the transaction.
 * @returns Whether Smart Transactions sendBundle is used for the chain.
 */
export async function isSmartTransactionBundleSupported(
  state: RootState,
  chainId: Hex,
): Promise<boolean> {
  if (!selectShouldUseSmartTransaction(state, chainId)) {
    return false;
  }

  return isSendBundleSupported(chainId);
}

/**
 * Whether the sender keyring can sign EIP-7702 authorizations.
 * Fails closed when the keyring cannot be resolved.
 *
 * @param request - The sponsorship request.
 * @returns Whether the sender supports EIP-7702.
 */
export async function isSenderEIP7702Supported({
  getKeyringForAccount,
  transaction,
}: Pick<
  GasFeeSponsorshipRequest,
  'getKeyringForAccount' | 'transaction'
>): Promise<boolean> {
  return accountSupports7702(
    transaction.txParams?.from,
    { getKeyringForAccount },
    false,
  );
}

/**
 * Whether the transaction can be published through the EIP-7702 relay.
 *
 * @param request - The sponsorship request.
 * @returns Whether the EIP-7702 relay can publish the transaction.
 */
export async function isDelegationRelaySupported(
  request: Pick<
    GasFeeSponsorshipRequest,
    'getKeyringForAccount' | 'transaction'
  >,
): Promise<boolean> {
  const { transaction } = request;

  // Contract deployments cannot be delegated.
  if (transaction.txParams?.to === undefined) {
    return false;
  }

  if (!(await isSenderEIP7702Supported(request))) {
    return false;
  }

  return isRelaySupported(transaction.chainId);
}

/**
 * Single mobile definition of whether MetaMask sponsors the gas fee of a
 * transaction. Used by the publish hook, the TransactionPayController, and
 * the confirmation UI.
 *
 * @param request - The sponsorship request.
 * @returns Whether the gas fee of the transaction is sponsored.
 */
export async function isGasFeeSponsored(
  request: GasFeeSponsorshipRequest,
): Promise<boolean> {
  const { getState, transaction } = request;

  if (!isGasFeeSponsorshipRequested(transaction)) {
    return false;
  }

  if (
    await isSmartTransactionBundleSupported(getState(), transaction.chainId)
  ) {
    return true;
  }

  return isDelegationRelaySupported(request);
}
