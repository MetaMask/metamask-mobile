import { renderHook } from '@testing-library/react-hooks';
import { useBalanceBreakdown } from './useBalanceBreakdown';
import { useTokensSlice } from './slices/useTokensSlice';
import { usePerpsSlice } from './slices/usePerpsSlice';
import { usePredictSlice } from './slices/usePredictSlice';
import { useDefiSlice } from './slices/useDefiSlice';
import { usePerpsPortfolioBalance } from '../../../UI/Perps/hooks/usePerpsPortfolioBalance';
import { mockTheme } from '../../../../util/theme';
import { getBalanceBreakdownSliceColors } from '../utils/getBalanceBreakdownSliceColors';

const mockUseTokensSlice = jest.mocked(useTokensSlice);
const mockUsePerpsSlice = jest.mocked(usePerpsSlice);
const mockUsePredictSlice = jest.mocked(usePredictSlice);
const mockUseDefiSlice = jest.mocked(useDefiSlice);
const mockUsePerpsPortfolioBalance = jest.mocked(usePerpsPortfolioBalance);

let mockPredictEligibility = {
  isEligible: true,
  country: 'US' as string | undefined,
};

jest.mock('../../../UI/Predict/hooks/usePredictEligibility', () => ({
  usePredictEligibility: () => mockPredictEligibility,
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => true),
}));

// Mock all slice hooks to control their output
jest.mock('./slices/useTokensSlice', () => ({
  useTokensSlice: jest.fn(),
}));
jest.mock('./slices/usePerpsSlice', () => ({
  usePerpsSlice: jest.fn(),
}));
jest.mock('./slices/usePredictSlice', () => ({
  usePredictSlice: jest.fn(),
}));
jest.mock('./slices/useDefiSlice', () => ({
  useDefiSlice: jest.fn(),
}));
jest.mock('./useFiatNormalizer', () => ({
  useFiatNormalizer: () => ({ toUserCurrency: (v: number) => v, userCurrency: 'USD' }),
}));

jest.mock('../../../UI/Perps/hooks/usePerpsPortfolioBalance', () => ({
  usePerpsPortfolioBalance: jest.fn(() => ({
    perpsBalance: 0,
    perpsBalance1dAgo: 0,
    hasPerpsData: false,
    unrealizedPnl: 0,
    perpsBalances: {},
  })),
}));

jest.mock('../../../../util/theme', () => {
  const themeModule = jest.requireActual<typeof import('../../../../util/theme')>(
    '../../../../util/theme',
  );
  return {
    ...themeModule,
    useTheme: () => themeModule.mockTheme,
  };
});

function makeSlice(
  key: 'tokens' | 'perps' | 'predict' | 'defi',
  valueFiat: number,
  status: 'ready' | 'loading' | 'error' | 'ineligible' = 'ready',
) {
  const colors = getBalanceBreakdownSliceColors(mockTheme.colors);
  return {
    key,
    label: key,
    color: colors[key],
    valueFiat,
    percentOfTotal: 0,
    status,
    drilldown: [],
  };
}

describe('useBalanceBreakdown', () => {
  beforeEach(() => {
    mockUsePerpsPortfolioBalance.mockReturnValue({
      perpsBalance: 0,
      perpsBalance1dAgo: 0,
      hasPerpsData: false,
      unrealizedPnl: 0,
      perpsBalances: {},
    });
    mockUseTokensSlice.mockReturnValue(makeSlice('tokens', 50000) as ReturnType<typeof useTokensSlice>);
    mockUsePerpsSlice.mockReturnValue(makeSlice('perps', 30000) as ReturnType<typeof usePerpsSlice>);
    mockUsePredictSlice.mockReturnValue(makeSlice('predict', 20000) as ReturnType<typeof usePredictSlice>);
    mockUseDefiSlice.mockReturnValue(makeSlice('defi', 10000) as ReturnType<typeof useDefiSlice>);
  });

  afterEach(() => jest.clearAllMocks());

  it('computes totalFiat as sum of all eligible slice values', () => {
    const { result } = renderHook(() => useBalanceBreakdown());
    // 50000 + 30000 + 20000 + 10000 = 110000
    expect(result.current.hero.totalFiat).toBe(110000);
  });

  it('computes percentOfTotal for each slice', () => {
    const { result } = renderHook(() => useBalanceBreakdown());
    const tokens = result.current.slices.tokens;
    // 50000 / 110000 ≈ 0.4545
    expect(tokens.percentOfTotal).toBeCloseTo(50000 / 110000);
  });

  it('excludes ineligible slices from total', () => {
    mockUsePerpsSlice.mockReturnValue(makeSlice('perps', 30000, 'ineligible') as ReturnType<typeof usePerpsSlice>);
    const { result } = renderHook(() => useBalanceBreakdown());
    // 50000 + 20000 + 10000 = 80000
    expect(result.current.hero.totalFiat).toBe(80000);
  });

  it('adds perps_ineligible warning when perps status is ineligible', () => {
    mockUsePerpsSlice.mockReturnValue(makeSlice('perps', 0, 'ineligible') as ReturnType<typeof usePerpsSlice>);
    const { result } = renderHook(() => useBalanceBreakdown());
    expect(result.current.warnings).toContain('perps_ineligible');
  });

  it('adds predict_ineligible warning when Predict is on, user is not eligible, and country is known', () => {
    mockPredictEligibility = {
      isEligible: false,
      country: 'DE',
    };
    const { result } = renderHook(() => useBalanceBreakdown());
    expect(result.current.warnings).toContain('predict_ineligible');
    mockPredictEligibility = { isEligible: true, country: 'US' };
  });

  it('hero status is ready when any eligible slice is ready', () => {
    mockUsePerpsSlice.mockReturnValue(makeSlice('perps', 30000, 'loading') as ReturnType<typeof usePerpsSlice>);
    const { result } = renderHook(() => useBalanceBreakdown());
    expect(result.current.hero.status).toBe('ready');
  });

  it('hero status is loading when all eligible slices are loading', () => {
    mockUseTokensSlice.mockReturnValue(makeSlice('tokens', 0, 'loading') as ReturnType<typeof useTokensSlice>);
    mockUsePerpsSlice.mockReturnValue(makeSlice('perps', 0, 'loading') as ReturnType<typeof usePerpsSlice>);
    mockUsePredictSlice.mockReturnValue(makeSlice('predict', 0, 'loading') as ReturnType<typeof usePredictSlice>);
    mockUseDefiSlice.mockReturnValue(makeSlice('defi', 0, 'loading') as ReturnType<typeof useDefiSlice>);
    const { result } = renderHook(() => useBalanceBreakdown());
    expect(result.current.hero.status).toBe('loading');
  });

  it('returns correct userCurrency from normalizer', () => {
    const { result } = renderHook(() => useBalanceBreakdown());
    expect(result.current.hero.userCurrency).toBe('USD');
  });

  it('hero 24h delta combines token change with perps account value change', () => {
    mockUseTokensSlice.mockReturnValue({
      ...makeSlice('tokens', 50_000),
      delta: { amount: 100, percent: 0.002, label: '24h' },
    } as ReturnType<typeof useTokensSlice>);
    mockUsePerpsSlice.mockReturnValue(makeSlice('perps', 30_000) as ReturnType<typeof usePerpsSlice>);
    mockUsePerpsPortfolioBalance.mockReturnValue({
      perpsBalance: 30_000,
      perpsBalance1dAgo: 29_500,
      hasPerpsData: true,
      unrealizedPnl: 12,
      perpsBalances: {},
    });

    const { result } = renderHook(() => useBalanceBreakdown());
    // totalFiat = 110000; token +100 + perps +500 = +600
    expect(result.current.hero.delta?.amount).toBeCloseTo(600);
    expect(result.current.hero.delta?.percent).toBeCloseTo(600 / (110_000 - 600));
  });

  it('uses perps unrealized PnL when 24h baseline is missing instead of dropping perps', () => {
    mockUseTokensSlice.mockReturnValue({
      ...makeSlice('tokens', 50_000),
      delta: { amount: 100, percent: 0.002, label: '24h' },
    } as ReturnType<typeof useTokensSlice>);
    mockUsePerpsSlice.mockReturnValue(makeSlice('perps', 30_000) as ReturnType<typeof usePerpsSlice>);
    mockUsePerpsPortfolioBalance.mockReturnValue({
      perpsBalance: 30_000,
      perpsBalance1dAgo: 0,
      hasPerpsData: true,
      unrealizedPnl: 3,
      perpsBalances: {},
    });

    const { result } = renderHook(() => useBalanceBreakdown());
    expect(result.current.hero.delta?.amount).toBe(103);
    expect(result.current.hero.delta?.percent).toBeCloseTo(103 / (110_000 - 103));
    expect(result.current.hero.delta?.label).toBeUndefined();
  });

  it('does not add perps when session PnL is zero and 24h baseline is missing', () => {
    mockUseTokensSlice.mockReturnValue({
      ...makeSlice('tokens', 50_000),
      delta: { amount: 100, percent: 0.002, label: '24h' },
    } as ReturnType<typeof useTokensSlice>);
    mockUsePerpsSlice.mockReturnValue(makeSlice('perps', 30_000) as ReturnType<typeof usePerpsSlice>);
    mockUsePerpsPortfolioBalance.mockReturnValue({
      perpsBalance: 30_000,
      perpsBalance1dAgo: 0,
      hasPerpsData: true,
      unrealizedPnl: 0,
      perpsBalances: {},
    });

    const { result } = renderHook(() => useBalanceBreakdown());
    expect(result.current.hero.delta?.amount).toBe(100);
    expect(result.current.hero.delta?.label).toBe('24h');
  });
});
