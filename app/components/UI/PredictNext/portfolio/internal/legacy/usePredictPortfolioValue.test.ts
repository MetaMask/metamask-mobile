import { renderHook } from '@testing-library/react-native';
import {
  usePredictPortfolio,
  type PredictPortfolioModel,
} from '../../../../Predict/hooks/usePredictPortfolio';
import { usePredictPortfolioValue } from './usePredictPortfolioValue';

jest.mock('../../../../Predict/hooks/usePredictPortfolio');

const mockUsePredictPortfolio = jest.mocked(usePredictPortfolio);

const givenPortfolio = (overrides: Partial<PredictPortfolioModel>) =>
  mockUsePredictPortfolio.mockReturnValue({
    portfolioValue: 0,
    isLoading: false,
    error: null,
    ...overrides,
  } as PredictPortfolioModel);

describe('legacy usePredictPortfolioValue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([true, false])(
    'reads usePredictPortfolio without live prices (enabled: %s)',
    (enabled) => {
      givenPortfolio({});

      renderHook(() => usePredictPortfolioValue({ enabled }));

      expect(mockUsePredictPortfolio).toHaveBeenCalledWith({
        enabled,
        livePriceUpdates: false,
      });
    },
  );

  it('returns the legacy portfolio value unchanged', () => {
    givenPortfolio({ portfolioValue: 1234.5678 });

    const { result } = renderHook(() =>
      usePredictPortfolioValue({ enabled: true }),
    );

    expect(result.current).toEqual({ status: 'ready', valueUsd: 1234.5678 });
  });

  it.each([
    ['loading', { isLoading: true }, { status: 'loading' }],
    ['an error', { error: new Error('failed') }, { status: 'error' }],
    [
      'an error while loading',
      { error: new Error('failed'), isLoading: true },
      { status: 'error' },
    ],
  ])('drops the value for %s', (_case, overrides, expected) => {
    givenPortfolio({ portfolioValue: 60, ...overrides });

    const { result } = renderHook(() =>
      usePredictPortfolioValue({ enabled: true }),
    );

    expect(result.current).toEqual(expected);
  });
});
