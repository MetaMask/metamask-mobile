import type { JsonMap } from '../../MetaMetrics.types';
import type { FilterLocation, FilterType } from './constants';

/**
 * Properties for the "Filter Clicked" event.
 *
 * @property location - Surface where the filter was applied.
 * @property filter_type - Kind of filter applied.
 * @property from_network - CAIP-2 chain ID selected before the change, when
 * `filter_type` is `network`. Omitted when no network filter was applied
 * beforehand (all networks).
 * @property to_network - CAIP-2 chain ID selected after the change. Omitted
 * when the user cleared the filter back to all networks.
 */
export interface FilterClickedProperties extends JsonMap {
  location: FilterLocation;
  filter_type: FilterType;
  from_network?: string;
  to_network?: string;
}
