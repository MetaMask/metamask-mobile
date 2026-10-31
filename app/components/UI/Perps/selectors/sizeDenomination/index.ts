import { createSelector } from 'reselect';
import { RootState } from '../../../../../reducers';
import type { PerpsSizeDenomination } from '../../utils/perpsSizeDenomination';

const DEFAULT_PERPS_SIZE_DENOMINATION: PerpsSizeDenomination = 'usd';

const selectSettingsPerpsSizeDenomination = (state: RootState): unknown =>
  state.settings?.perpsSizeDenomination;

const isPerpsSizeDenomination = (
  value: unknown,
): value is PerpsSizeDenomination => value === 'usd' || value === 'asset';

/**
 * Last chosen order-size denomination. USD until the user switches to coin.
 * Persisted with the rest of settings, so a remount or app restart restores it.
 */
export const selectPerpsSizeDenomination = createSelector(
  selectSettingsPerpsSizeDenomination,
  (denomination): PerpsSizeDenomination =>
    isPerpsSizeDenomination(denomination)
      ? denomination
      : DEFAULT_PERPS_SIZE_DENOMINATION,
);
