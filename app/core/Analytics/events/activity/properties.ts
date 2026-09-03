import type { JsonMap } from '../../MetaMetrics.types';
import type {
  ActivityScreenEntryPoint,
  ActivityScreenInteractionType,
  ActivityScreenTabName,
} from './constants';

/**
 * Properties for the "Activity Screen Viewed" event.
 *
 * @property interaction_type - Whether the screen was entered (`navigation`)
 * or the type filter was switched in place (`filtered_tab`).
 * @property is_empty - Whether the activity list is empty for the active
 * filters at the moment the list settled.
 * @property pending_transactions - Number of pending items in the settled list.
 * @property network_filter - CAIP-2 chain IDs selected in the network filter.
 * Omitted when no network filter is applied (all networks).
 * @property entry_point - Where the user came from. Only sent on `navigation`,
 * and only when the entry point is attributable.
 * @property tab_name - Active type filter after the switch. Only sent on
 * `filtered_tab`.
 */
export interface ActivityScreenViewedProperties extends JsonMap {
  interaction_type: ActivityScreenInteractionType;
  is_empty: boolean;
  pending_transactions: number;
  network_filter?: string[];
  entry_point?: ActivityScreenEntryPoint;
  tab_name?: ActivityScreenTabName;
}
