import { PERPS_AGGREGATE_FILLS } from '../../../../constants/storage';
import StorageWrapper from '../../../../store/storage-wrapper';

/**
 * Whether Activity > Perps > Trades shows aggregated orders rather than
 * individual fills. Aggregated unless the user saved individual fills.
 * Synchronous so the first render already uses the saved mode.
 */
export const getPerpsAggregateFillsPreference = (): boolean =>
  StorageWrapper.getItemSync(PERPS_AGGREGATE_FILLS) !== 'false';

/** Persist the Activity fill display. */
export const setPerpsAggregateFillsPreference = (
  aggregateFills: boolean,
): void => {
  // A lost write only restores the aggregated default next session.
  StorageWrapper.setItem(PERPS_AGGREGATE_FILLS, String(aggregateFills)).catch(
    () => undefined,
  );
};
