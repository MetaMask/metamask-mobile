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
