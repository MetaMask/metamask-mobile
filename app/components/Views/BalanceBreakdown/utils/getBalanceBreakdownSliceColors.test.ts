import { brandColor } from '@metamask/design-tokens';
import { AppThemeKey } from '../../../../util/theme/models';
import {
  DARK_ALLOCATION_COLORS,
  getBalanceBreakdownSliceColors,
  LIGHT_ALLOCATION_COLORS,
} from './getBalanceBreakdownSliceColors';

describe('getBalanceBreakdownSliceColors', () => {
  it('uses the light allocation palette', () => {
    expect(getBalanceBreakdownSliceColors(AppThemeKey.light)).toEqual(
      LIGHT_ALLOCATION_COLORS,
    );
    expect(Object.values(LIGHT_ALLOCATION_COLORS)).toEqual([
      brandColor.blue600,
      brandColor.blue500,
      brandColor.blue300,
      brandColor.indigo300,
      brandColor.blue100,
    ]);
  });

  it('uses the dark allocation palette', () => {
    expect(getBalanceBreakdownSliceColors(AppThemeKey.dark)).toEqual(
      DARK_ALLOCATION_COLORS,
    );
    expect(Object.values(DARK_ALLOCATION_COLORS)).toEqual([
      brandColor.blue300,
      brandColor.indigo100,
      brandColor.grey200,
      brandColor.grey400,
      brandColor.grey500,
    ]);
  });
});
