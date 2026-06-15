import { MINIMUM_DISPLAY_THRESHOLD } from '../../../../../../../util/number/bigint';
import { formatQuickBuyRateValue } from './formatQuickBuyRateValue';

describe('formatQuickBuyRateValue', () => {
  it('uses subscript notation for small rates at or above the dust threshold', () => {
    expect(
      formatQuickBuyRateValue(0.0000425, { maximumSignificantDigits: 3 }),
    ).toBe('0.0₄425');
  });

  it('falls back to Intl formatting when subscript notation does not apply', () => {
    expect(formatQuickBuyRateValue(0.05, { maximumSignificantDigits: 3 })).toBe(
      '0.05',
    );

    expect(formatQuickBuyRateValue(1862.12, { maximumFractionDigits: 2 })).toBe(
      '1,862.12',
    );
  });

  it('does not use subscript notation below the dust threshold', () => {
    expect(
      formatQuickBuyRateValue(0.000008, { maximumSignificantDigits: 3 }),
    ).toBe('0.000008');
  });

  it('formats exactly at the dust threshold with subscript when applicable', () => {
    expect(
      formatQuickBuyRateValue(MINIMUM_DISPLAY_THRESHOLD, {
        maximumSignificantDigits: 3,
      }),
    ).toBe('0.0₄1');
  });
});
