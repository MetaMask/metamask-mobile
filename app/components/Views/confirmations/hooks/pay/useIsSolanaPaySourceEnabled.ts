import { useSelector } from 'react-redux';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';

import { RootState } from '../../../../../reducers';
import { selectSolanaPayEnabled } from '../../../../../selectors/featureFlagController/confirmations';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { isTransactionPayWithdraw } from '../../utils/transaction';

/**
 * Transaction types whose Solana source route Core builds end to end. Perps and
 * Predict deposits embed their calls in the quote; a Money
 * Account deposit bridges to the Money Account and Core runs the vault deposit
 * as a non-atomic second leg (see `useTransactionPayToken`). Flows that need a
 * client-specific selection (deposit-and-order) stay EVM-only here.
 *
 * Post-quote withdraws are always excluded, including when nested in a batch:
 * there the selected token is the receive destination, and Core only supports
 * Solana as a source, so it would return no quotes for a Solana destination.
 */
export const SOLANA_PAY_SOURCE_TRANSACTION_TYPES = [
  TransactionType.moneyAccountDeposit,
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
];

/**
 * Whether the current confirmation may offer Solana SOL and SPL balances as new
 * MetaMask Pay sources.
 *
 * @returns True when the Core Solana source gates are on for the transaction,
 * its type is supported, and it is not a post-quote withdraw.
 */
export function useIsSolanaPaySourceEnabled(): boolean {
  const transactionMeta = useTransactionMetadataRequest();
  const isSolanaPayEnabled = useSelector((state: RootState) =>
    selectSolanaPayEnabled(state, transactionMeta),
  );

  return (
    isSolanaPayEnabled &&
    hasTransactionType(transactionMeta, SOLANA_PAY_SOURCE_TRANSACTION_TYPES) &&
    !isTransactionPayWithdraw(transactionMeta)
  );
}
