import { useMemo } from 'react';
import type { Position } from '@metamask/social-controllers';
import { useTraderPositions } from '../../TraderProfileView/hooks/useTraderPositions';
import {
  useTraderPositionData,
  type TraderPositionData,
} from '../useTraderPositionData';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseTraderPositionScreenDataInput {
  traderId: string;
  tokenAddress: string;
  chain: string;
  tokenSymbol: string;
  positionContext: 'open' | 'closed';
  /**
   * Bootstrap position from row-tap. Displayed while the network fetch is in
   * flight. Dropped once the canonical list resolves (canonical-only policy).
   */
  initialPosition?: Position;
}

export interface UseTraderPositionScreenDataResult extends TraderPositionData {
  /** Canonical position resolved from the social-service list. */
  position: Position | undefined;
  /**
   * True while the relevant query is still loading and no position is
   * available to display (deeplink cold-start). Shows the skeleton.
   */
  isInitialLoading: boolean;
  /**
   * True while the relevant query is still loading but a position is already
   * being displayed (bootstrap from row-tap or previous resolution). Shows
   * a background-refresh indicator without hiding content.
   */
  isRefreshing: boolean;
  /** Error string from the query that matches positionContext, or null. */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Address normalisation helpers
// ---------------------------------------------------------------------------

const EVM_CHAINS = new Set([
  'ethereum',
  'base',
  'arbitrum',
  'optimism',
  'polygon',
  'linea',
  'bsc',
]);

const isEvmChain = (chain: string) => EVM_CHAINS.has(chain.toLowerCase());

/**
 * Normalises a token address for comparison.
 * EVM addresses are lowercased (checksummed vs non-checksummed).
 * Non-EVM addresses (e.g. Solana base58) are trimmed but kept case-exact.
 */
const normaliseAddress = (address: string, chain: string): string =>
  isEvmChain(chain) ? address.toLowerCase() : address.trim();

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const REFETCH_INTERVAL_MS = 30_000;

export function useTraderPositionScreenData(
  input: UseTraderPositionScreenDataInput,
): UseTraderPositionScreenDataResult {
  const {
    traderId,
    tokenAddress,
    chain,
    tokenSymbol,
    positionContext,
    initialPosition,
  } = input;

  const {
    openPositions,
    closedPositions,
    isLoadingOpen,
    isLoadingClosed,
    openError,
    closedError,
  } = useTraderPositions(traderId, { refetchInterval: REFETCH_INTERVAL_MS });

  const list = positionContext === 'open' ? openPositions : closedPositions;
  const isLoading =
    positionContext === 'open' ? isLoadingOpen : isLoadingClosed;
  const error = positionContext === 'open' ? openError : closedError;

  // Canonical-only policy:
  // While the list is still loading we use initialPosition as a bootstrap (may
  // be undefined for deeplinks). Once the list resolves we use only the
  // fetched entry; if nothing matches we surface undefined (fallback state).
  const normalisedRouteAddress = useMemo(
    () => normaliseAddress(tokenAddress, chain),
    [tokenAddress, chain],
  );
  const normalisedRouteChain = chain.toLowerCase();

  const fetchedPosition = useMemo(
    () =>
      list.find(
        (p) =>
          p.chain.toLowerCase() === normalisedRouteChain &&
          normaliseAddress(p.tokenAddress, p.chain) === normalisedRouteAddress,
      ),
    [list, normalisedRouteChain, normalisedRouteAddress],
  );

  // Use bootstrap while loading; switch to canonical-only once load completes.
  const resolvedPosition: Position | undefined = isLoading
    ? (fetchedPosition ?? initialPosition)
    : fetchedPosition;

  // Feed the resolved position (possibly undefined) into the existing hook.
  // useTraderPositionData already handles undefined safely.
  const derived = useTraderPositionData(resolvedPosition, tokenSymbol);

  return {
    position: resolvedPosition,
    isInitialLoading: isLoading && resolvedPosition === undefined,
    isRefreshing: isLoading && resolvedPosition !== undefined,
    error,
    ...derived,
  };
}
