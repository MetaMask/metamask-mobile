import type { JsonMap } from '../../MetaMetrics.types';
import type { FilterLocation, FilterType } from './constants';

/**
 * Properties for the "Filter Clicked" event.
 *
 * @property location - Surface where the filter was applied.
 * @property filter_type - Kind of filter applied.
 * @property from_network - CAIP-2 chain ID selected before the change, or
 * `all` when no network filter was applied. Always sent when `filter_type` is
 * `network`.
 * @property to_network - CAIP-2 chain ID selected after the change, or `all`
 * when the user cleared the filter back to all networks. Always sent when
 * `filter_type` is `network`.
 */
export interface FilterClickedProperties extends JsonMap {
  location: FilterLocation;
  filter_type: FilterType;
  from_network?: string;
  to_network?: string;
}
