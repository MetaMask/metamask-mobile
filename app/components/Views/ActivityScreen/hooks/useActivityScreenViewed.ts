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

/**
 * UI filter bucket -> emitted `tab_name`. Explicit rather than derived so
 * renaming a UI bucket cannot silently change the data contract.
 */
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
  /**
   * False while the list this hook reports on is still loading, so the event
   * carries settled counts instead of a transient empty list.
   */
  isSettled: boolean;
  /** Whether the settled list has no items for the active filters. */
  isEmpty: boolean;
  /** Number of pending items in the settled list. */
  pendingCount: number;
  /** Active Activity type filter, used to detect in-screen tab switches. */
  typeFilter?: ActivityTypeFilter;
  /** Active network filter; reported, but never a reason to fire. */
  networkFilter?: CaipChainId[] | null;
  /** Where the user came from. Only reported on the `navigation` fire. */
  entryPoint?: ActivityScreenEntryPoint;
  /**
   * Guards the event to the standalone Activity screen. Embedded activity
   * lists (e.g. asset details) must leave this false, mirroring extension's
   * suppression of the event for its embedded list.
   */
  enabled?: boolean;
}

/**
 * Fires `Activity Screen Viewed` for the redesigned Activity screen.
 *
 * Two interactions produce the event:
 * - `navigation` — once per mount, after the list settles.
 * - `filtered_tab` — once per distinct type-filter switch, after the list settles again.
 *
 * Re-renders and `isSettled` cycling never re-fire: `navigation` is latched and
 * `filtered_tab` is deduped against the last reported filter. Network-filter
 * changes are reported by `Filter Clicked`, not here.
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

  // Read through a ref so list metrics are captured at the moment the list
  // settles without turning every count change into an effect trigger.
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
