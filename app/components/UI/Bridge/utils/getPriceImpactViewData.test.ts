import { IconName } from '../../../../component-library/components/Icons/Icon';
import { TextColor } from '../../../../component-library/components/Texts/Text';
import { getPriceImpactViewData } from './getPriceImpactViewData';

const DEFAULT_THRESHOLD = { warning: 5, danger: 25 };

const ALTERNATIVE = {
  textColor: TextColor.Alternative,
  icon: undefined,
};

const WARNING = {
  textColor: TextColor.Warning,
  icon: { name: IconName.Warning, color: TextColor.Warning },
};

const DANGER = {
  textColor: TextColor.Error,
  icon: { name: IconName.Danger, color: TextColor.Error },
};

describe('getPriceImpactViewData', () => {
  describe('returns alternative when priceImpactValue is absent or non-numeric', () => {
    it.each([
      { priceImpactValue: undefined },
      { priceImpactValue: '' },
      { priceImpactValue: 'invalid' },
      { priceImpactValue: 'NaN%' },
    ])(
      'returns alternative for priceImpactValue=$priceImpactValue',
      ({ priceImpactValue }) => {
        expect(
          getPriceImpactViewData({
            priceImpactValue,
            threshold: DEFAULT_THRESHOLD,
          }),
        ).toEqual(ALTERNATIVE);
      },
    );
  });

  describe('returns alternative when priceImpact is below the warning threshold', () => {
    it.each([
      { priceImpactValue: '-0.06%' },
      { priceImpactValue: '0%' },
      { priceImpactValue: '4.99%' },
    ])(
      'returns alternative for priceImpactValue=$priceImpactValue',
      ({ priceImpactValue }) => {
        expect(
          getPriceImpactViewData({
            priceImpactValue,
            threshold: DEFAULT_THRESHOLD,
          }),
        ).toEqual(ALTERNATIVE);
      },
    );
  });

  describe('returns warning when priceImpact is at or above the warning threshold but below danger', () => {
    it.each([
      { priceImpactValue: '5.00%' },
      { priceImpactValue: '5.01%' },
      { priceImpactValue: '24.99%' },
    ])(
      'returns warning for priceImpactValue=$priceImpactValue',
      ({ priceImpactValue }) => {
        expect(
          getPriceImpactViewData({
            priceImpactValue,
            threshold: DEFAULT_THRESHOLD,
          }),
        ).toEqual(WARNING);
      },
    );
  });

  describe('returns danger when priceImpact is at or above the danger threshold', () => {
    it.each([
      { priceImpactValue: '25.00%' },
      { priceImpactValue: '25.01%' },
      { priceImpactValue: '100%' },
    ])(
      'returns danger for priceImpactValue=$priceImpactValue',
      ({ priceImpactValue }) => {
        expect(
          getPriceImpactViewData({
            priceImpactValue,
            threshold: DEFAULT_THRESHOLD,
          }),
        ).toEqual(DANGER);
      },
    );
  });

  describe('respects custom threshold values', () => {
    it('uses the provided warning threshold', () => {
      const customThreshold = { warning: 10, danger: 50 };

      // below custom warning → alternative
      expect(
        getPriceImpactViewData({
          priceImpactValue: '9.99%',
          threshold: customThreshold,
        }),
      ).toEqual(ALTERNATIVE);

      // at custom warning → warning
      expect(
        getPriceImpactViewData({
          priceImpactValue: '10.00%',
          threshold: customThreshold,
        }),
      ).toEqual(WARNING);
    });

    it('uses the provided danger threshold', () => {
      const customThreshold = { warning: 10, danger: 50 };

      // below custom danger but above warning → warning
      expect(
        getPriceImpactViewData({
          priceImpactValue: '49.99%',
          threshold: customThreshold,
        }),
      ).toEqual(WARNING);

      // at custom danger → danger
      expect(
        getPriceImpactViewData({
          priceImpactValue: '50.00%',
          threshold: customThreshold,
        }),
      ).toEqual(DANGER);
    });
  });

  it('strips the percent sign before parsing', () => {
    // '5%' and '5.00%' should both hit the warning threshold
    expect(
      getPriceImpactViewData({
        priceImpactValue: '5%',
        threshold: DEFAULT_THRESHOLD,
      }),
    ).toEqual(WARNING);

    expect(
      getPriceImpactViewData({
        priceImpactValue: '5',
        threshold: DEFAULT_THRESHOLD,
      }),
    ).toEqual(WARNING);
  });
});
