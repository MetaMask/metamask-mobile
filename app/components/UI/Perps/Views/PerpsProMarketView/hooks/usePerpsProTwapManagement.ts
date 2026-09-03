import type { BottomSheetRef } from '@metamask/design-system-react-native';
import type { TwapOrder } from '@metamask/perps-controller';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PERPS_TWAP_UI_CONFIG } from '../../../constants/perpsConfig';
import { usePerpsTerminateTwap } from '../../../hooks/usePerpsTerminateTwap';
import { usePerpsTwapOrders } from '../../../hooks/usePerpsTwapOrders';
import { getTwapOrderIdentityKey } from '../../../utils/twapOrderUtils';
import {
  DEFAULT_PRO_ORDER_SIDE_FILTER,
  filterProTwapOrdersBySide,
  getProTwapSideFilterEmptyDescriptionKey,
  type ProOrderSideFilter,
} from '../utils/proPositionSideFilter';
import {
  selectActiveTwapOrders,
  selectHistoricalTwapOrders,
  type PerpsProTwapEmptyMetadata,
  type ProTwapView,
} from '../utils/proTwapViews';

interface TwapSelection {
  contextIdentityKey: string;
  orderIdentityKey: string;
}

interface AcceptedTwapTerminationSelection {
  contextIdentityKey: string;
  orderIdentityKeys: ReadonlySet<string>;
}

interface UsePerpsProTwapManagementOptions {
  activeProvider?: string;
  displaySymbol: string;
  isScreenFocused: boolean;
  isTabSelected: boolean;
  isTickerOnly: boolean;
  isTwapPlacementEnabled: boolean;
  network?: string;
  selectedAddress?: string;
  symbol: string;
}

/**
 * Owns the TWAP tab's lifecycle, cancellation sheet, accepted locks, and
 * filter partitions so the positions panel remains a presentation component.
 */
export const usePerpsProTwapManagement = ({
  activeProvider,
  displaySymbol,
  isScreenFocused,
  isTabSelected,
  isTickerOnly,
  isTwapPlacementEnabled,
  network,
  selectedAddress,
  symbol,
}: UsePerpsProTwapManagementOptions) => {
  const [sideFilter, setSideFilter] = useState<ProOrderSideFilter>(
    DEFAULT_PRO_ORDER_SIDE_FILTER,
  );
  const [terminatingSelection, setTerminatingSelection] =
    useState<TwapSelection | null>(null);
  const [acceptedTerminationSelection, setAcceptedTerminationSelection] =
    useState<AcceptedTwapTerminationSelection | null>(null);
  const terminateSheetRef = useRef<BottomSheetRef>(null);
  const openedSelectionRef = useRef<string | null>(null);
  const contextIdentityKey = `${selectedAddress ?? 'none'}|${activeProvider}|${network}`;
  const { twapOrders, isLoading, error, refresh, isRefreshing } =
    usePerpsTwapOrders({
      // Discovery is independent of the placement rollout: users must retain a
      // termination surface for venue-native schedules after a flag rollback.
      enableLiveUpdates: isScreenFocused && isTabSelected,
      enableDiscovery:
        isScreenFocused && !isTwapPlacementEnabled && !isTabSelected,
      pollingInterval: PERPS_TWAP_UI_CONFIG.LiveUpdateIntervalMs,
      pauseLiveRestReconciliation: terminatingSelection !== null,
    });
  const allActiveOrders = useMemo(
    () => selectActiveTwapOrders(twapOrders),
    [twapOrders],
  );
  const allHistoricalOrders = useMemo(
    () => selectHistoricalTwapOrders(twapOrders),
    [twapOrders],
  );
  const shouldShowTab =
    isTwapPlacementEnabled || allActiveOrders.length > 0 || error !== null;
  const terminatingOrder = useMemo(() => {
    if (
      !terminatingSelection ||
      terminatingSelection.contextIdentityKey !== contextIdentityKey
    ) {
      return null;
    }

    return (
      allActiveOrders.find(
        (order) =>
          getTwapOrderIdentityKey(order) ===
          terminatingSelection.orderIdentityKey,
      ) ?? null
    );
  }, [allActiveOrders, contextIdentityKey, terminatingSelection]);
  const acceptedTerminationOrderIdentityKeys =
    acceptedTerminationSelection?.contextIdentityKey === contextIdentityKey
      ? acceptedTerminationSelection.orderIdentityKeys
      : undefined;

  const selectOrderToTerminate = useCallback(
    (order: TwapOrder) => {
      setTerminatingSelection({
        contextIdentityKey,
        orderIdentityKey: getTwapOrderIdentityKey(order),
      });
    },
    [contextIdentityKey],
  );

  const clearTerminateSelection = useCallback(
    () => setTerminatingSelection(null),
    [],
  );
  const closeTerminateSheet = useCallback(() => {
    if (terminateSheetRef.current) {
      terminateSheetRef.current.onCloseBottomSheet(clearTerminateSelection);
      return;
    }
    clearTerminateSelection();
  }, [clearTerminateSelection]);

  const { isTerminationInFlight, terminateTwap } = usePerpsTerminateTwap({
    onSuccess: (twapOrder) => {
      setAcceptedTerminationSelection((currentSelection) => {
        const orderIdentityKeys =
          currentSelection?.contextIdentityKey === contextIdentityKey
            ? new Set(currentSelection.orderIdentityKeys)
            : new Set<string>();
        orderIdentityKeys.add(getTwapOrderIdentityKey(twapOrder));

        return { contextIdentityKey, orderIdentityKeys };
      });
      closeTerminateSheet();
      // The read hook converts controller failures into its visible `error`
      // state, so this follow-up remains intentionally fire-and-forget without
      // suppressing a rejected promise at this call site.
      // eslint-disable-next-line no-void -- usePerpsTwapOrders reports failures in state.
      void refresh();
    },
    onError: () => setTerminatingSelection(null),
  });

  useEffect(() => {
    if (!acceptedTerminationSelection) {
      return;
    }
    if (
      acceptedTerminationSelection.contextIdentityKey !== contextIdentityKey
    ) {
      setAcceptedTerminationSelection(null);
      return;
    }
    // Reconnects and failed refreshes can temporarily publish an empty list.
    // Only an authoritative resolved read may release accepted-cancel locks.
    if (isLoading || isRefreshing || error !== null) {
      return;
    }

    const activeOrderIdentityKeys = new Set(
      allActiveOrders.map(getTwapOrderIdentityKey),
    );
    const remainingOrderIdentityKeys = new Set(
      [...acceptedTerminationSelection.orderIdentityKeys].filter(
        (orderIdentityKey) => activeOrderIdentityKeys.has(orderIdentityKey),
      ),
    );

    if (remainingOrderIdentityKeys.size === 0) {
      setAcceptedTerminationSelection(null);
    } else if (
      remainingOrderIdentityKeys.size !==
      acceptedTerminationSelection.orderIdentityKeys.size
    ) {
      setAcceptedTerminationSelection({
        contextIdentityKey,
        orderIdentityKeys: remainingOrderIdentityKeys,
      });
    }
  }, [
    acceptedTerminationSelection,
    allActiveOrders,
    contextIdentityKey,
    error,
    isLoading,
    isRefreshing,
  ]);

  useEffect(() => {
    const selectionKey = terminatingSelection?.orderIdentityKey ?? null;
    if (!selectionKey || !terminatingOrder) {
      openedSelectionRef.current = null;
      return;
    }
    if (openedSelectionRef.current !== selectionKey) {
      openedSelectionRef.current = selectionKey;
      terminateSheetRef.current?.onOpenBottomSheet();
    }
  }, [terminatingOrder, terminatingSelection]);

  useEffect(() => {
    if (!terminatingSelection) {
      return;
    }
    const contextChanged =
      terminatingSelection.contextIdentityKey !== contextIdentityKey;
    if (contextChanged || (!isLoading && !isRefreshing && !terminatingOrder)) {
      closeTerminateSheet();
    }
  }, [
    closeTerminateSheet,
    contextIdentityKey,
    isLoading,
    isRefreshing,
    terminatingOrder,
    terminatingSelection,
  ]);

  const visibleOrders = useMemo(
    () =>
      isTickerOnly
        ? twapOrders.filter((order) => order.symbol === symbol)
        : twapOrders,
    [isTickerOnly, symbol, twapOrders],
  );
  const visibleActiveOrders = useMemo(
    () => selectActiveTwapOrders(visibleOrders),
    [visibleOrders],
  );
  const visibleHistoricalOrders = useMemo(
    () => selectHistoricalTwapOrders(visibleOrders),
    [visibleOrders],
  );
  const activeOrders = useMemo(
    () => filterProTwapOrdersBySide(visibleActiveOrders, sideFilter),
    [sideFilter, visibleActiveOrders],
  );
  const historicalOrders = useMemo(
    () => filterProTwapOrdersBySide(visibleHistoricalOrders, sideFilter),
    [sideFilter, visibleHistoricalOrders],
  );
  const allFillOrders = useMemo(
    () => twapOrders.filter((order) => order.fills.length > 0),
    [twapOrders],
  );
  const visibleFillOrders = useMemo(
    () => visibleOrders.filter((order) => order.fills.length > 0),
    [visibleOrders],
  );
  const sideFilteredFillOrders = useMemo(
    () => filterProTwapOrdersBySide(visibleFillOrders, sideFilter),
    [sideFilter, visibleFillOrders],
  );
  const emptyMetadataByView = useMemo<
    Record<ProTwapView, PerpsProTwapEmptyMetadata>
  >(() => {
    const getMetadata = (
      view: ProTwapView,
      allViewOrders: TwapOrder[],
      visibleViewOrders: TwapOrder[],
      sideFilteredViewOrders: TwapOrder[],
    ): PerpsProTwapEmptyMetadata => {
      const isSideFilterEmpty =
        sideFilter !== DEFAULT_PRO_ORDER_SIDE_FILTER &&
        visibleViewOrders.length > 0 &&
        sideFilteredViewOrders.length === 0;

      return {
        filteredSideDescriptionKey: isSideFilterEmpty
          ? getProTwapSideFilterEmptyDescriptionKey(sideFilter, view)
          : undefined,
        filteredTicker:
          isTickerOnly &&
          allViewOrders.length > 0 &&
          visibleViewOrders.length === 0 &&
          !isSideFilterEmpty
            ? displaySymbol
            : undefined,
      };
    };

    return {
      active: getMetadata(
        'active',
        allActiveOrders,
        visibleActiveOrders,
        activeOrders,
      ),
      history: getMetadata(
        'history',
        allHistoricalOrders,
        visibleHistoricalOrders,
        historicalOrders,
      ),
      fill_history: getMetadata(
        'fill_history',
        allFillOrders,
        visibleFillOrders,
        sideFilteredFillOrders,
      ),
    };
  }, [
    activeOrders,
    allActiveOrders,
    allFillOrders,
    allHistoricalOrders,
    displaySymbol,
    historicalOrders,
    isTickerOnly,
    sideFilter,
    sideFilteredFillOrders,
    visibleActiveOrders,
    visibleFillOrders,
    visibleHistoricalOrders,
  ]);

  return {
    acceptedTerminationOrderIdentityKeys,
    activeOrders,
    clearTerminateSelection,
    emptyMetadataByView,
    error,
    filterScopeKey: `${isTickerOnly ? symbol : 'all'}:${sideFilter}`,
    historicalOrders,
    isLoading,
    isRefreshing,
    isTerminationInFlight,
    refresh,
    selectOrderToTerminate,
    setSideFilter,
    shouldShowTab,
    sideFilter,
    terminateSheetRef,
    terminateTwap,
    terminatingOrder,
    twapOrders,
  };
};
