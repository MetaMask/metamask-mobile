import {
  IconColor,
  IconName,
  TextColor,
} from '@metamask/design-system-react-native';
import { getPriceImpactViewData } from './getPriceImpactViewData';

const DEFAULT_THRESHOLD = { warning: 0.05, error: 0.25 };

const ALTERNATIVE = {
  textColor: TextColor.TextAlternative,
  icon: undefined,
  title: 'bridge.price_impact_info_title',
  description: 'bridge.price_impact_info_description',
};

const WARNING = {
  textColor: TextColor.WarningDefault,
  icon: { name: IconName.Warning, color: IconColor.WarningDefault },
  title: 'bridge.price_impact_warning_title',
  description: 'bridge.price_impact_warning_description',
};

const DANGER = {
  textColor: TextColor.ErrorDefault,
  icon: { name: IconName.Danger, color: IconColor.ErrorDefault },
  title: 'bridge.price_impact_error_title',
  description: 'bridge.price_impact_error_description',
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
      { priceImpactValue: '-0.0006' },
      { priceImpactValue: '0' },
      { priceImpactValue: '0.0499' },
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
      { priceImpactValue: '0.05' },
      { priceImpactValue: '0.0501' },
      { priceImpactValue: '0.2499' },
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
      { priceImpactValue: '0.25' },
      { priceImpactValue: '0.2501' },
      { priceImpactValue: '1' },
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
      const customThreshold = { warning: 0.1, error: 0.5 };

      // below custom warning → alternative
      expect(
        getPriceImpactViewData({
          priceImpactValue: '0.0999',
          threshold: customThreshold,
        }),
      ).toEqual(ALTERNATIVE);

      // at custom warning → warning
      expect(
        getPriceImpactViewData({
          priceImpactValue: '0.1',
          threshold: customThreshold,
        }),
      ).toEqual(WARNING);
    });

    it('uses the provided danger threshold', () => {
      const customThreshold = { warning: 0.1, error: 0.5 };

      // below custom danger but above warning → warning
      expect(
        getPriceImpactViewData({
          priceImpactValue: '0.4999',
          threshold: customThreshold,
        }),
      ).toEqual(WARNING);

      // at custom danger → danger
      expect(
        getPriceImpactViewData({
          priceImpactValue: '0.5',
          threshold: customThreshold,
        }),
      ).toEqual(DANGER);
    });
  });

  it('strips the percent sign before parsing', () => {
    // '5%' and '5.00%' should both hit the warning threshold
    expect(
      getPriceImpactViewData({
        priceImpactValue: '0.05',
        threshold: DEFAULT_THRESHOLD,
      }),
    ).toEqual(WARNING);

    expect(
      getPriceImpactViewData({
        priceImpactValue: '0.05',
        threshold: DEFAULT_THRESHOLD,
      }),
    ).toEqual(WARNING);
  });
});
