import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { TransactionMeta } from '@metamask/transaction-controller';
import { useNavigation } from '@react-navigation/native';
import { selectSortedTransactions } from '../../../../../selectors/transactionController';
import { selectMoneyAccountVaultConfig } from '../../../../../selectors/featureFlagController/moneyAccount';
import { navigateToTransactionDetails } from '../../../../../util/navigation/navigateToTransactionDetails';
import type { ClaimDto } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { resolveClaimTransaction } from '../utils/resolveClaimTransaction';

export type ClaimRowPress = {
  onPress: () => void;
  /** The target was inferred by time, so the row says "likely" rather than naming it. */
  isInferredMatch: boolean;
} | null;

/**
 * Decides what a claim row opens, if anything.
 *
 * Returns null for a row with no transaction to show — an `EXPIRED` or
 * `FAILED` claim never reached the chain, and a claim settled without
 * provenance (`dev:settle-claim` writes no hash) has nothing to resolve. A null
 * makes the row render inert rather than as a tap that goes nowhere.
 *
 * @returns A resolver the list calls per row.
 */
export const useClaimRowPress = (): ((claim: ClaimDto) => ClaimRowPress) => {
  const navigation = useNavigation();
  // `selectSortedTransactions` merges in pending smart transactions, which
  // carry no `TransactionMeta.id` — and the details screen resolves local rows
  // by exactly that id, so anything without one cannot be opened.
  const sorted = useSelector(selectSortedTransactions);
  const transactions = useMemo(
    () =>
      sorted.filter(
        (tx): tx is TransactionMeta => 'id' in tx && Boolean(tx.id),
      ),
    [sorted],
  );
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const chainId = vaultConfig?.chainId;

  return useCallback(
    (claim: ClaimDto): ClaimRowPress => {
      if (!chainId) {
        return null;
      }

      const match = resolveClaimTransaction({
        claim,
        transactions,
        chainId,
      });

      if (match.kind === 'none') {
        return null;
      }

      return {
        isInferredMatch: match.kind === 'inferred',
        onPress: () =>
          navigateToTransactionDetails(navigation, {
            transactionId: match.transactionId,
          }),
      };
    },
    [chainId, transactions, navigation],
  );
};

export default useClaimRowPress;
