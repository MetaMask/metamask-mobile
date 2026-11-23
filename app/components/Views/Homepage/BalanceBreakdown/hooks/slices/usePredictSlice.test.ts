import { renderHook } from '@testing-library/react-native';
import {
  usePredictAvailability,
  usePredictPortfolioValue,
  type PredictPortfolioValue,
} from '../../../../../UI/PredictNext';
import type { FiatConverter } from '../../types';
import { usePredictSlice } from './usePredictSlice';

jest.mock('../../../../../UI/PredictNext', () => ({
  usePredictAvailability: jest.fn(),
  usePredictPortfolioValue: jest.fn(),
}));

const mockUsePredictAvailability = jest.mocked(usePredictAvailability);
const mockUsePredictPortfolioValue = jest.mocked(usePredictPortfolioValue);

const double: FiatConverter = (amount) => amount * 2;

const renderSlice = (
  value: PredictPortfolioValue,
  {
    available = true,
    toUserCurrency = double,
  }: { available?: boolean; toUserCurrency?: FiatConverter } = {},
) => {
  mockUsePredictAvailability.mockReturnValue(available);
  mockUsePredictPortfolioValue.mockReturnValue(value);
  return renderHook(() => usePredictSlice(toUserCurrency)).result.current;
};

describe('usePredictSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('converts a ready value into the user currency', () => {
    const slice = renderSlice({ status: 'ready', valueUsd: 60 });

    expect(slice).toEqual({
      key: 'predict',
      isVisible: true,
      status: 'ready',
      valueFiat: 120,
    });
  });

  it('keeps a ready zero value ready', () => {
    const slice = renderSlice({ status: 'ready', valueUsd: 0 });

    expect(slice.status).toBe('ready');
    expect(slice.valueFiat).toBe(0);
  });

  it.each([
    ['absent', undefined],
    ['not a number', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
  ])(
    'reports an error, not zero, for a ready value that is %s',
    (_case, valueUsd) => {
      const slice = renderSlice({
        status: 'ready',
        valueUsd,
      } as unknown as PredictPortfolioValue);

      expect(slice.status).toBe('error');
      expect(slice.isVisible).toBe(true);
    },
  );

  it.each([
    ['unavailable', () => undefined],
    ['not finite', () => Number.NaN],
  ])(
    'reports an error when the fiat conversion is %s',
    (_case, toUserCurrency) => {
      const slice = renderSlice(
        { status: 'ready', valueUsd: 60 },
        { toUserCurrency },
      );

      expect(slice.status).toBe('error');
      expect(slice.valueFiat).toBe(0);
    },
  );

  it.each(['loading', 'error'] as const)(
    'passes %s through without a value',
    (status) => {
      const slice = renderSlice({ status });

      expect(slice).toEqual({
        key: 'predict',
        isVisible: true,
        status,
        valueFiat: 0,
      });
    },
  );

  it('hides the slice as ineligible while Predict is unavailable', () => {
    const slice = renderSlice({ status: 'unavailable' }, { available: false });

    expect(slice.status).toBe('ineligible');
    expect(slice.isVisible).toBe(false);
  });

  it('hides the slice as ineligible when the Active Venue has no value yet', () => {
    const slice = renderSlice({ status: 'unavailable' }, { available: true });

    expect(slice.status).toBe('ineligible');
    expect(slice.isVisible).toBe(false);
  });

  it('stays ineligible while Predict is unavailable, whatever the value says', () => {
    const slice = renderSlice(
      { status: 'ready', valueUsd: 60 },
      { available: false },
    );

    expect(slice.status).toBe('ineligible');
    expect(slice.isVisible).toBe(false);
  });
});
