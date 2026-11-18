import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import type { RootState } from '../../../../../../reducers';
import { packPartnerQueries } from '../../../services/data/packPartnerQueries';
import { PACK_PARTNER_ENVIRONMENT } from '../constants';
import { selectPackPartnerSales } from '../selectors/packPartner';
import { toErrorState } from '../services/errors';
import type {
  PackPartnerCard,
  PackPartnerErrorState,
  PackPartnerAccount,
} from '../types';
import { withCardSales } from '../utils/operations';
import { usePackPartnerAccount } from './usePackPartnerAccount';
import { useRefreshPackPartnerCards } from './useRefreshPackPartnerCards';

const EMPTY_CARDS: PackPartnerCard[] = [];
const OFFLINE_ERROR: PackPartnerErrorState = { code: 'NETWORK_ERROR' };

export interface UsePackPartnerCardsResult {
  account: PackPartnerAccount | undefined;
  cards: PackPartnerCard[];
  /** A successful read exists, including a cached empty collection. */
  hasLoaded: boolean;
  /** First load, no card read yet. */
  isLoading: boolean;
  /**
   * The owned cards could not be read: the read failed, or the device is
   * offline without a previous read. The list is then unknown, not empty.
   */
  error: PackPartnerErrorState | undefined;
  refetch: () => Promise<void>;
}

/**
 * Cards the selected Solana account owns, newest first. PackPartner's
 * cards API is authoritative: the list is its last read through
 * `PackPartnerDataService`. The account's buyback operations are shown on
 * the cards they concern. Offers are a separate read: collection screens
 * compose `usePackPartnerCardOffers`, and card details read one offer.
 *
 * @param options - Options.
 * @param options.enabled - Whether to read; the cached list stays available.
 * @returns The owned cards and their read state.
 */
export const usePackPartnerCards = ({
  enabled = true,
}: { enabled?: boolean } = {}): UsePackPartnerCardsResult => {
  const networkTier = useNetworkTier();
  const refetch = useRefreshPackPartnerCards(enabled);
  const account = usePackPartnerAccount();
  const isOffline = networkTier === 'NONE';
  const isEnabled = enabled && Boolean(account);
  const descriptor = packPartnerQueries.getOwnedCards(
    PACK_PARTNER_ENVIRONMENT,
    account?.address ?? '',
  );
  const query = useQuery<PackPartnerCard[]>({
    queryKey: descriptor.queryKey,
    enabled: isEnabled,
    // The service restores the disk snapshot offline; only its HTTP read
    // requires connectivity. Reconnect always asks it to refresh.
    networkMode: 'always',
    refetchOnReconnect: 'always',
  });
  const sales = useSelector((state: RootState) =>
    selectPackPartnerSales(state, account?.address),
  );
  const ownedCards = account ? query.data : undefined;
  const cards = useMemo(
    () => withCardSales(ownedCards ?? EMPTY_CARDS, sales),
    [ownedCards, sales],
  );
  const error = useMemo(() => {
    if (query.error) return toErrorState(query.error);
    return isOffline && !ownedCards && !query.isPending
      ? OFFLINE_ERROR
      : undefined;
  }, [query.error, query.isPending, isOffline, ownedCards]);

  return {
    account,
    cards,
    hasLoaded: ownedCards !== undefined,
    isLoading: isEnabled && query.isPending && query.isFetching,
    error: enabled && account ? error : undefined,
    refetch,
  };
};

export interface UsePackPartnerCardResult {
  /** The card, or undefined when the account does not own it. */
  card: PackPartnerCard | undefined;
  /** No owned-cards read has completed yet: whether the card is owned is unknown. */
  isLoading: boolean;
  /** The owned-cards read failed before the card could be found. */
  error: PackPartnerErrorState | undefined;
  refetch: () => Promise<void>;
}

/**
 * One card the selected account owns, as last read from PackPartner, with
 * the read state a screen needs before it can say the card is not owned.
 *
 * @param mint - Card mint.
 * @param options - Options.
 * @param options.enabled - Whether to read.
 * @returns The card and the owned-cards read state.
 */
export const usePackPartnerCard = (
  mint: string,
  options?: { enabled?: boolean },
): UsePackPartnerCardResult => {
  const { cards, isLoading, error, refetch } = usePackPartnerCards(options);
  const card = useMemo(
    () => cards.find((entry) => entry.mint === mint),
    [cards, mint],
  );
  return {
    card,
    isLoading: !card && isLoading,
    error: card ? undefined : error,
    refetch,
  };
};
