import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  usePredictPortfolio,
  type PredictPortfolioModel,
} from '../../../../../UI/Predict/hooks/usePredictPortfolio';
import { usePredictSlice } from './usePredictSlice';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../../UI/Predict/hooks/usePredictPortfolio');

const mockUseSelector = jest.mocked(useSelector);
const mockUsePredictPortfolio = jest.mocked(usePredictPortfolio);

const createPortfolio = (
  overrides: Partial<PredictPortfolioModel> = {},
): PredictPortfolioModel =>
  ({
    portfolioValue: 60,
    isLoading: false,
    error: null,
    ...overrides,
  }) as PredictPortfolioModel;

describe('usePredictSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(true);
    mockUsePredictPortfolio.mockReturnValue(createPortfolio());
  });

  it('maps the canonical portfolio value', () => {
    const { result } = renderHook(() =>
      usePredictSlice((amount) => amount * 2),
    );

    expect(mockUsePredictPortfolio).toHaveBeenCalledWith({
      enabled: true,
      livePriceUpdates: false,
    });
    expect(result.current.status).toBe('ready');
    expect(result.current.valueFiat).toBe(120);
  });

  it.each([
    {
      name: 'portfolio loading',
      portfolio: createPortfolio({ isLoading: true }),
      enabled: true,
      expected: 'loading',
    },
    {
      name: 'portfolio error',
      portfolio: createPortfolio({ error: new Error('failed') }),
      enabled: true,
      expected: 'error',
    },
  ])('returns zero for $name', ({ portfolio, enabled, expected }) => {
    mockUseSelector.mockReturnValue(enabled);
    mockUsePredictPortfolio.mockReturnValue(portfolio);

    const { result } = renderHook(() =>
      usePredictSlice((amount) => amount * 2),
    );

    expect(result.current.status).toBe(expected);
    expect(result.current.valueFiat).toBe(0);
  });

  it('disables portfolio work and hides the slice with the feature off', () => {
    mockUseSelector.mockReturnValue(false);

    const { result } = renderHook(() =>
      usePredictSlice((amount) => amount * 2),
    );

    expect(mockUsePredictPortfolio).toHaveBeenCalledWith({
      enabled: false,
      livePriceUpdates: false,
    });
    expect(result.current.status).toBe('ineligible');
    expect(result.current.isVisible).toBe(false);
  });

  it('reports an error when fiat conversion is unavailable', () => {
    const { result } = renderHook(() => usePredictSlice(() => undefined));

    expect(result.current.status).toBe('error');
    expect(result.current.valueFiat).toBe(0);
  });
});
