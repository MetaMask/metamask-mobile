import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { PerpsProviderType } from '@metamask/perps-controller';

import { PROVIDER_CONFIG } from '../constants/perpsConfig';
import { selectPerpsDefaultProvider } from '../selectors/perpsController';
import { usePerpsProvider } from './usePerpsProvider';

/** Params for {@link usePerpsTradeVenue}. */
export interface UsePerpsTradeVenueParams {
  /**
   * Venue named by the route, when the entry point already expressed one
   * (TAT-4390 populates senders). Must list the market to win.
   */
  routeProviderId?: PerpsProviderType;
  /**
   * Venues that list the market, from the venue-aware markets list. Empty
   * while market data has not loaded; a single entry is a one-venue market.
   */
  marketVenueIds: readonly PerpsProviderType[];
}

/** Per-order venue state for the Lite market page (TAT-4418). */
export interface UsePerpsTradeVenueResult {
  /** The venue this order will go to. */
  tradeVenueId: PerpsProviderType;
  /**
   * Whether the "Trade on" selector shows: two or more venues list the
   * market and multi-provider mode is enabled. A one-venue market hides the
   * row entirely and trades on that venue; flag off hides it and the screen
   * behaves as before, with no per-order provider passed downstream.
   */
  isSelectorVisible: boolean;
  /** Applies a user selection. Only reachable while the selector is visible. */
  selectVenue: (providerId: PerpsProviderType) => void;
  /**
   * The provider to pass to order placement. `undefined` when
   * multi-provider mode is off, so navigation falls back to the active
   * provider exactly as before.
   */
  orderProviderId: PerpsProviderType | undefined;
}

/**
 * Which exchange the order on the Lite market page goes to (TAT-4418).
 *
 * The venue is per-order state on this screen — it never switches the
 * global active provider or the saved default. Resolution order: a route
 * provider that lists the market, then the saved default provider when it
 * lists the market, then the market's own (only) venue.
 */
export function usePerpsTradeVenue({
  routeProviderId,
  marketVenueIds,
}: UsePerpsTradeVenueParams): UsePerpsTradeVenueResult {
  const { isMultiProviderEnabled } = usePerpsProvider();
  const defaultProvider =
    useSelector(selectPerpsDefaultProvider) ?? PROVIDER_CONFIG.DefaultProvider;

  const isSelectorVisible = isMultiProviderEnabled && marketVenueIds.length > 1;

  const initialVenueId = useMemo(() => {
    if (
      routeProviderId !== undefined &&
      marketVenueIds.includes(routeProviderId)
    ) {
      return routeProviderId;
    }
    if (marketVenueIds.includes(defaultProvider)) {
      return defaultProvider;
    }
    return marketVenueIds[0] ?? defaultProvider;
  }, [routeProviderId, marketVenueIds, defaultProvider]);

  const [tradeVenueId, setTradeVenueId] =
    useState<PerpsProviderType>(initialVenueId);

  // Market data can arrive after mount and change the resolution (an empty
  // venue list resolves to the default). Follow it until the user picks, so
  // a late load cannot clobber an explicit choice.
  const hasUserSelectedRef = useRef(false);
  useEffect(() => {
    if (!hasUserSelectedRef.current) {
      setTradeVenueId(initialVenueId);
    }
  }, [initialVenueId]);

  const selectVenue = useCallback((providerId: PerpsProviderType) => {
    hasUserSelectedRef.current = true;
    setTradeVenueId(providerId);
  }, []);

  return {
    tradeVenueId,
    isSelectorVisible,
    selectVenue,
    orderProviderId: isMultiProviderEnabled ? tradeVenueId : undefined,
  };
}
