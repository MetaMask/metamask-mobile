import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  usePredictPortfolio,
  type PredictPortfolioModel,
} from '../../../../UI/Predict/hooks/usePredictPortfolio';
import { usePredictEligibility } from '../../../../UI/Predict/hooks/usePredictEligibility';
import { usePredictSlice } from './usePredictSlice';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../UI/Predict/hooks/usePredictPortfolio');
jest.mock('../../../../UI/Predict/hooks/usePredictEligibility');

const mockUseSelector = jest.mocked(useSelector);
const mockUsePredictPortfolio = jest.mocked(usePredictPortfolio);
const mockUsePredictEligibility = jest.mocked(usePredictEligibility);

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
    mockUsePredictEligibility.mockReturnValue({
      isEligible: true,
      country: 'US',
      refreshEligibility: jest.fn(),
    });
    mockUsePredictPortfolio.mockReturnValue(createPortfolio());
  });

  it('maps the canonical portfolio value', () => {
    const { result } = renderHook(() =>
      usePredictSlice((amount) => amount * 2),
    );

    expect(result.current.status).toBe('ready');
    expect(result.current.valueFiat).toBe(120);
  });

  it.each([
    {
      name: 'portfolio loading',
      portfolio: createPortfolio({ isLoading: true }),
      enabled: true,
      eligibility: { isEligible: true, country: 'US' },
      expected: 'loading',
    },
    {
      name: 'portfolio error',
      portfolio: createPortfolio({ error: new Error('failed') }),
      enabled: true,
      eligibility: { isEligible: true, country: 'US' },
      expected: 'error',
    },
    {
      name: 'feature disabled',
      portfolio: createPortfolio(),
      enabled: false,
      eligibility: { isEligible: true, country: 'US' },
      expected: 'ineligible',
    },
    {
      name: 'geo ineligible',
      portfolio: createPortfolio(),
      enabled: true,
      eligibility: { isEligible: false, country: 'US' },
      expected: 'ineligible',
    },
  ])(
    'returns zero for $name',
    ({ portfolio, enabled, eligibility, expected }) => {
      mockUseSelector.mockReturnValue(enabled);
      mockUsePredictPortfolio.mockReturnValue(portfolio);
      mockUsePredictEligibility.mockReturnValue({
        ...eligibility,
        refreshEligibility: jest.fn(),
      });

      const { result } = renderHook(() =>
        usePredictSlice((amount) => amount * 2),
      );

      expect(result.current.status).toBe(expected);
      expect(result.current.valueFiat).toBe(0);
    },
  );

  it('does not remain loading when country resolution returns no country', () => {
    mockUsePredictEligibility.mockReturnValue({
      isEligible: false,
      country: undefined,
      refreshEligibility: jest.fn(),
    });

    const { result } = renderHook(() =>
      usePredictSlice((amount) => amount * 2),
    );

    expect(result.current.status).toBe('ready');
    expect(result.current.valueFiat).toBe(120);
  });

  it('stays loading while fiat conversion is unavailable', () => {
    const { result } = renderHook(() => usePredictSlice(() => undefined));

    expect(result.current.status).toBe('loading');
    expect(result.current.valueFiat).toBe(0);
  });
});
