import { useSelector } from 'react-redux';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';

import { selectSolanaPayEnabled } from '../../../../../selectors/featureFlagController/confirmations';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

/**
 * Transaction types whose Solana source route Core builds end to end. Relay
 * executes Perps and Predict deposits atomically on the target chain; a Money
 * Account deposit bridges to the Money Account and Core runs the vault deposit
 * as a non-atomic second leg (see `useSetNonEvmPayToken`). Flows that need a
 * client-specific selection (deposit-and-order) stay EVM-only here.
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
 * @returns True when the Solana Pay flag is on and the transaction type is supported.
 */
export function useIsSolanaPaySourceEnabled(): boolean {
  const transactionMeta = useTransactionMetadataRequest();
  const isSolanaPayEnabled = useSelector(selectSolanaPayEnabled);

  return (
    isSolanaPayEnabled &&
    hasTransactionType(transactionMeta, SOLANA_PAY_SOURCE_TRANSACTION_TYPES)
  );
}
