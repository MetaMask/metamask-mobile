import { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectIsMoneyAccountDelegatedForCard } from '../../../../selectors/cardController';
import { MUSD_MONEY_ACCOUNT_CHAIN_IDS } from '../../Earn/constants/musd';
import Logger from '../../../../util/Logger';
import type { CardTransaction } from '../types/moneyActivity';
import {
  fetchAccountTransactions,
  parseCardTransactions,
} from '../utils/accountsApi';

export interface UseMoneyAccountCardTransactionsResult {
  cardTransactions: CardTransaction[];
  /**
   * True only until the first fetch settles (when the account is linked).
   * Background refetches on refocus do NOT flip this back to true, so the list
   * doesn't flash a spinner over already-rendered rows (stale-while-revalidate).
   */
  isLoading: boolean;
  error: boolean;
  refetch: () => void;
}

const EMPTY: CardTransaction[] = [];

/**
 * Card payments for the primary Money account, sourced from the Accounts API
 * (off-device settlement — see {@link CardTransaction}). Gated on the account
 * being a linked card funding source; otherwise returns nothing without a fetch.
 *
 * MVP behaviour (per MUSD-817): no pagination (latest page only), and refetch
 * on screen focus rather than polling.
 */
export function useMoneyAccountCardTransactions(): UseMoneyAccountCardTransactionsResult {
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const isLinked = useSelector(selectIsMoneyAccountDelegatedForCard);
  const rawAddress = primaryMoneyAccount?.address;

  const [cardTransactions, setCardTransactions] =
    useState<CardTransaction[]>(EMPTY);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Guards against a fetch resolving after the screen blurs / address changes.
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!isLinked || !rawAddress) {
      setCardTransactions(EMPTY);
      setHasLoaded(true);
      return;
    }
    const moneyAddress = toChecksumHexAddress(rawAddress);
    const current = ++requestId.current;
    setError(false);
    try {
      const response = await fetchAccountTransactions({
        address: moneyAddress,
        chainIds: MUSD_MONEY_ACCOUNT_CHAIN_IDS,
      });
      if (current !== requestId.current) return;
      setCardTransactions(parseCardTransactions(response, moneyAddress));
    } catch (e) {
      if (current !== requestId.current) return;
      Logger.error(e as Error, 'useMoneyAccountCardTransactions fetch failed');
      setError(true);
      setCardTransactions(EMPTY);
    } finally {
      if (current === requestId.current) setHasLoaded(true);
    }
  }, [isLinked, rawAddress]);

  useFocusEffect(
    useCallback(() => {
      load();
      // Invalidate any in-flight request when the screen blurs.
      return () => {
        requestId.current++;
      };
    }, [load]),
  );

  // Initial load only: linked accounts haven't resolved their first fetch yet.
  // Unlinked accounts never fetch, so they're never "loading".
  const isLoading = isLinked && !hasLoaded;

  return { cardTransactions, isLoading, error, refetch: load };
}
