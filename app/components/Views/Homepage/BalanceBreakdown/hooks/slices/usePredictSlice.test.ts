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

  it('returns zero while the portfolio is loading', () => {
    mockUsePredictPortfolio.mockReturnValue(
      createPortfolio({ isLoading: true }),
    );

    const { result } = renderHook(() =>
      usePredictSlice((amount) => amount * 2),
    );

    expect(result.current.status).toBe('loading');
    expect(result.current.valueFiat).toBe(0);
  });

  it('keeps the resolved portfolio value when the portfolio request fails', () => {
    mockUsePredictPortfolio.mockReturnValue(
      createPortfolio({ error: new Error('failed'), portfolioValue: 60 }),
    );

    const { result } = renderHook(() =>
      usePredictSlice((amount) => amount * 2),
    );

    expect(result.current.status).toBe('ready');
    expect(result.current.valueFiat).toBe(120);
  });

  it('reports a zero balance instead of an error for a geo-blocked portfolio', () => {
    mockUsePredictPortfolio.mockReturnValue(
      createPortfolio({ error: new Error('geo blocked'), portfolioValue: 0 }),
    );

    const { result } = renderHook(() => usePredictSlice((amount) => amount));

    expect(result.current).toMatchObject({
      isVisible: true,
      status: 'ready',
      valueFiat: 0,
    });
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
