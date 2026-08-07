/**
 * Surface on which a filter control was used.
 *
 * Only `Activity` is emitted today. The remaining values are reserved in
 * segment-schema so other surfaces can adopt `Filter Clicked` without a new
 * event; add the corresponding call site when a surface starts emitting.
 */
export enum FilterLocation {
  Activity = 'activity',
}

/**
 * Kind of filter that was applied.
 *
 * Only `Network` is emitted today. Reserved values (`activity_type`,
 * `asset_type`, `token_type`, `account`, `sort`, `date_range`, `custom`) exist
 * in the schema; add them here as they get wired up.
 */
export enum FilterType {
  Network = 'network',
}

/**
 * Sent for `from_network` / `to_network` when no network filter is applied,
 * so "all networks" is an explicit, groupable value rather than a missing
 * property that cannot be told apart from unset or malformed data.
 */
export const ALL_NETWORKS_FILTER_VALUE = 'all';
