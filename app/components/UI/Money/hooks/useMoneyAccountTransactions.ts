import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import {
  type TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyActivityMockDataEnabledFlag } from '../selectors/featureFlags';
import MOCK_MONEY_TRANSACTIONS from '../constants/mockActivityData';
import {
  isMoneyActivityDeposit,
  isMoneyActivityTransfer,
} from '../constants/moneyActivityFilters';
import { selectNonReplacedTransactions } from '../../../../selectors/transactionController';

export interface UseMoneyAccountTransactionsResult {
  /** Confirmed + submitted (filtered) merged, sorted by time descending */
  allTransactions: TransactionMeta[];
  /** Confirmed deposits (incoming) and submitted incoming */
  deposits: TransactionMeta[];
  /** Confirmed transfers (outgoing) and submitted outgoing */
  transfers: TransactionMeta[];
  /** Transactions awaiting confirmation (not in a final on-chain state) */
  submittedTransactions: TransactionMeta[];
  moneyAddress: string | undefined;
}

/**
 * Money account activity. When `moneyActivityMockDataEnabled` is on (remote or
 * `MM_MONEY_ACTIVITY_MOCK_DATA_ENABLED`), returns static mock rows for UI/QA.
 * Otherwise reads real transactions from TransactionController, filtered to
 * those involving the primary Money account address.
 */
export function useMoneyAccountTransactions(): UseMoneyAccountTransactionsResult {
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const mockDataEnabled = useSelector(selectMoneyActivityMockDataEnabledFlag);
  const nonReplacedTransactions = useSelector(selectNonReplacedTransactions);

  const moneyAddress = useMemo(() => {
    const raw = primaryMoneyAccount?.address;
    return raw ? toChecksumHexAddress(raw) : undefined;
  }, [primaryMoneyAccount]);

  return useMemo(() => {
    if (mockDataEnabled) {
      const allTransactions = [...MOCK_MONEY_TRANSACTIONS];
      return {
        allTransactions,
        deposits: allTransactions.filter(isMoneyActivityDeposit),
        transfers: allTransactions.filter(isMoneyActivityTransfer),
        submittedTransactions: [],
        moneyAddress,
      };
    }

    const moneyTransactions = nonReplacedTransactions
      .filter((tx) => {
        // Direct Money account transactions.
        if (
          tx.type === TransactionType.moneyAccountDeposit ||
          tx.type === TransactionType.moneyAccountWithdraw
        ) {
          return true;
        }
        // EIP-7702 batch where a Money account call is a nested call.
        return (
          tx.nestedTransactions?.some(
            (nested) =>
              nested.type === TransactionType.moneyAccountDeposit ||
              nested.type === TransactionType.moneyAccountWithdraw,
          ) ?? false
        );
      })
      .sort((a, b) => (b?.time ?? 0) - (a?.time ?? 0));

    const submittedTransactions = moneyTransactions.filter(
      (tx) => tx.status === TransactionStatus.submitted,
    );

    return {
      allTransactions: moneyTransactions,
      deposits: moneyTransactions.filter(isMoneyActivityDeposit),
      transfers: moneyTransactions.filter(isMoneyActivityTransfer),
      submittedTransactions,
      moneyAddress,
    };
  }, [mockDataEnabled, moneyAddress, nonReplacedTransactions]);
}
