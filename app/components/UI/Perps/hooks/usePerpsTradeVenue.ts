import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { PerpsProviderType } from '@metamask/perps-controller';

import { PROVIDER_CONFIG } from '../constants/perpsConfig';
import { selectPerpsDefaultProvider } from '../selectors/perpsController';
import { usePerpsProvider } from './usePerpsProvider';

/** Params for {@link usePerpsTradeVenue}. */
export interface UsePerpsTradeVenueParams {
  /** The market this selection belongs to, even when venue data is loading. */
  marketSymbol: string;
  /** Venue named by the route, when the entry point expresses one. */
  routeProviderId?: PerpsProviderType;
  /**
   * Venues that list the market, from the venue-aware markets list. Empty
   * while market data has not loaded; a single entry is a one-venue market.
   */
  marketVenueIds: readonly PerpsProviderType[];
}

/** Per-order venue state for the Lite market page. */
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
 * Which exchange the order on the Lite market page goes to.
 *
 * The venue is per-order state on this screen — it never switches the
 * global active provider or the saved default. Resolution order: a route
 * provider that lists the market, then the saved default provider when it
 * lists the market, then the market's own (only) venue.
 */
export function usePerpsTradeVenue({
  marketSymbol,
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

  // Key the explicit pick to the market and route. Never let a selection
  // from the previous market reach order navigation during the render before
  // an effect can reset state. Catalog refreshes may reorder venues without
  // clobbering a valid pick; if the venue disappears, use the resolution order.
  const [selection, setSelection] = useState<{
    marketSymbol: string;
    routeProviderId: PerpsProviderType | undefined;
    providerId: PerpsProviderType;
  } | null>(null);
  // Clear the old choice after a route change so returning to the original
  // market cannot revive it. The keyed check below already protects the
  // first render, before this cleanup effect runs.
  useEffect(() => {
    setSelection(null);
  }, [marketSymbol, routeProviderId]);
  const hasValidSelection =
    selection?.marketSymbol === marketSymbol &&
    selection.routeProviderId === routeProviderId &&
    (marketVenueIds.length === 0 ||
      marketVenueIds.includes(selection.providerId));
  const tradeVenueId = hasValidSelection
    ? selection.providerId
    : initialVenueId;

  const selectVenue = useCallback(
    (providerId: PerpsProviderType) => {
      setSelection({ marketSymbol, routeProviderId, providerId });
    },
    [marketSymbol, routeProviderId],
  );

  return {
    tradeVenueId,
    isSelectorVisible,
    selectVenue,
    orderProviderId: isMultiProviderEnabled ? tradeVenueId : undefined,
  };
}
