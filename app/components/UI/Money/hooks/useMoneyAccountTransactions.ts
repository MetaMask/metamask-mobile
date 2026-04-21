import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import type { TransactionMeta } from '@metamask/transaction-controller';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyActivityMockDataEnabledFlag } from '../selectors/featureFlags';
import MOCK_MONEY_TRANSACTIONS from '../constants/mockActivityData';
import {
  isMoneyActivityDeposit,
  isMoneyActivityTransfer,
} from '../constants/moneyActivityFilters';

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
 * Otherwise returns empty lists until a dedicated Money transactions controller
 * is integrated.
 */
export function useMoneyAccountTransactions(): UseMoneyAccountTransactionsResult {
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const mockDataEnabled = useSelector(selectMoneyActivityMockDataEnabledFlag);

  const moneyAddress = useMemo(() => {
    const raw = primaryMoneyAccount?.address;
    return raw ? toChecksumHexAddress(raw) : undefined;
  }, [primaryMoneyAccount]);

  return useMemo(() => {
    const empty = {
      allTransactions: [] as TransactionMeta[],
      deposits: [] as TransactionMeta[],
      transfers: [] as TransactionMeta[],
      submittedTransactions: [] as TransactionMeta[],
      moneyAddress,
    };

    if (!mockDataEnabled) {
      return empty;
    }

    const allTransactions = [...MOCK_MONEY_TRANSACTIONS];
    return {
      allTransactions,
      deposits: allTransactions.filter(isMoneyActivityDeposit),
      transfers: allTransactions.filter(isMoneyActivityTransfer),
      submittedTransactions: [],
      moneyAddress,
    };
  }, [mockDataEnabled, moneyAddress]);
}
