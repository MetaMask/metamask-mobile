import { useEffect, useRef } from 'react';
import type { CaipChainId } from '@metamask/utils';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  ACTIVITY_SCREEN_EVENTS,
  ActivityScreenEntryPoint,
  ActivityScreenInteractionType,
  ActivityScreenTabName,
  type ActivityScreenViewedProperties,
} from '../../../../core/Analytics/events/activity';
import { ActivityTypeFilter } from '../types';

/** UI filter bucket -> emitted `tab_name`, mapped explicitly so renaming a bucket cannot change the data contract. */
const TAB_NAME_BY_TYPE_FILTER: Record<
  ActivityTypeFilter,
  ActivityScreenTabName
> = {
  [ActivityTypeFilter.All]: ActivityScreenTabName.All,
  [ActivityTypeFilter.Transactions]: ActivityScreenTabName.Transactions,
  [ActivityTypeFilter.BuySell]: ActivityScreenTabName.BuySell,
  [ActivityTypeFilter.Perps]: ActivityScreenTabName.Perps,
  [ActivityTypeFilter.Predictions]: ActivityScreenTabName.Predictions,
  [ActivityTypeFilter.MetamaskCard]: ActivityScreenTabName.MetamaskCard,
};

export interface UseActivityScreenViewedParams {
  /** False while the list is still loading, so counts are settled when sent. */
  isSettled: boolean;
  /** Whether the settled list has no items for the active filters. */
  isEmpty: boolean;
  /** Number of pending items in the settled list. */
  pendingCount: number;
  /** Active type filter; a change is reported as a tab switch. */
  typeFilter?: ActivityTypeFilter;
  /** Active network filter; reported, but never a reason to fire. */
  networkFilter?: CaipChainId[] | null;
  /** Where the user came from. Only sent on the `navigation` fire. */
  entryPoint?: ActivityScreenEntryPoint;
  /** Only the standalone Activity screen sets this; embedded lists must not. */
  enabled?: boolean;
}

/**
 * Fires `Activity Screen Viewed` once per screen entry (`navigation`) and once
 * per type-filter switch (`filtered_tab`), each after the list settles.
 *
 * Re-renders and `isSettled` cycling never re-fire. Network-filter changes are
 * reported by `Filter Clicked` instead.
 */
export const useActivityScreenViewed = ({
  isSettled,
  isEmpty,
  pendingCount,
  typeFilter,
  networkFilter,
  entryPoint,
  enabled = false,
}: UseActivityScreenViewedParams) => {
  const { trackEvent, createEventBuilder } = useAnalytics();

  const metricsRef = useRef({ isEmpty, pendingCount, networkFilter });
  metricsRef.current = { isEmpty, pendingCount, networkFilter };

  const hasTrackedNavigationRef = useRef(false);
  const reportedTypeFilterRef = useRef<ActivityTypeFilter | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!enabled || !isSettled) {
      return;
    }

    const isFirstFire = !hasTrackedNavigationRef.current;
    if (!isFirstFire && reportedTypeFilterRef.current === typeFilter) {
      return;
    }

    hasTrackedNavigationRef.current = true;
    reportedTypeFilterRef.current = typeFilter;

    const {
      isEmpty: settledIsEmpty,
      pendingCount: settledPendingCount,
      networkFilter: settledNetworkFilter,
    } = metricsRef.current;

    const properties: ActivityScreenViewedProperties = {
      interaction_type: isFirstFire
        ? ActivityScreenInteractionType.Navigation
        : ActivityScreenInteractionType.FilteredTab,
      is_empty: settledIsEmpty,
      pending_transactions: settledPendingCount,
    };

    if (settledNetworkFilter?.length) {
      properties.network_filter = [...settledNetworkFilter];
    }

    if (isFirstFire) {
      if (entryPoint) {
        properties.entry_point = entryPoint;
      }
    } else if (typeFilter) {
      properties.tab_name = TAB_NAME_BY_TYPE_FILTER[typeFilter];
    }

    trackEvent(
      createEventBuilder(ACTIVITY_SCREEN_EVENTS.VIEWED)
        .addProperties(properties)
        .build(),
    );
  }, [
    enabled,
    isSettled,
    typeFilter,
    entryPoint,
    trackEvent,
    createEventBuilder,
  ]);
};
