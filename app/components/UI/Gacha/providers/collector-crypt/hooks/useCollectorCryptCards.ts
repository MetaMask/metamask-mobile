import { useCallback, useEffect, useMemo } from 'react';
import { shallowEqual, useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { RootState } from '../../../../../../reducers';
import Engine from '../../../../../../core/Engine';
import { collectorCryptCardsOptions } from '../queries/cards';
import { selectCollectorCryptCards } from '../selectors/collectorCrypt';
import { toErrorState } from '../services/errors';
import type {
  CollectorCryptCard,
  CollectorCryptErrorState,
  SolanaAccountRef,
} from '../types';
import { useCollectorCryptAccount } from './useCollectorCryptAccount';

export interface UseCollectorCryptCardsResult {
  account: SolanaAccountRef | undefined;
  cards: CollectorCryptCard[];
  /** Syncing and no cached card yet. */
  isLoading: boolean;
  isSyncing: boolean;
  error: CollectorCryptErrorState | undefined;
  refetch: () => Promise<void>;
}

/**
 * Cards of the selected Solana account. Reads the persisted controller state
 * (instant) and runs `syncCards` through react-query. Also resumes interrupted
 * pack operations once per account.
 */
export const useCollectorCryptCards = ({
  enabled = true,
}: { enabled?: boolean } = {}): UseCollectorCryptCardsResult => {
  const account = useCollectorCryptAccount();
  const queryClient = useQueryClient();
  const cards = useSelector(
    (state: RootState) => selectCollectorCryptCards(state, account?.address),
    shallowEqual,
  );
  const isEnabled = enabled && Boolean(account);

  const query = useQuery({
    ...collectorCryptCardsOptions(account),
    enabled: isEnabled,
  });

  useEffect(() => {
    if (!enabled || !account) {
      return;
    }
    Engine.context.GachaController.recoverOperations({
      account,
    }).catch(() => undefined);
  }, [enabled, account]);

  const refetch = useCallback(async (): Promise<void> => {
    await queryClient
      .fetchQuery({
        ...collectorCryptCardsOptions(account, true),
        staleTime: 0,
      })
      // The query exposes the failure to the screen, as useQuery.refetch does.
      .catch(() => undefined);
  }, [account, queryClient]);

  const isSyncing = isEnabled && query.isFetching;
  const error = useMemo(
    () => (query.error ? toErrorState(query.error) : undefined),
    [query.error],
  );

  return {
    account,
    cards,
    isLoading: isSyncing && cards.length === 0,
    isSyncing,
    error,
    refetch,
  };
};
