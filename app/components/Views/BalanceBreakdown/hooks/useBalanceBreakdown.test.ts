import { renderHook } from '@testing-library/react-hooks';
import { useBalanceBreakdown } from './useBalanceBreakdown';
import { useTokensSlice } from './slices/useTokensSlice';
import { useMoneySlice } from './slices/useMoneySlice';
import { usePerpsSlice } from './slices/usePerpsSlice';
import { usePredictSlice } from './slices/usePredictSlice';
import { useDefiSlice } from './slices/useDefiSlice';
import { mockTheme } from '../../../../util/theme';
import { AppThemeKey } from '../../../../util/theme/models';
import {
  DARK_ALLOCATION_COLORS,
  getBalanceBreakdownSliceColors,
  LIGHT_ALLOCATION_COLORS,
} from '../utils/getBalanceBreakdownSliceColors';

const mockUseTokensSlice = jest.mocked(useTokensSlice);
const mockUseMoneySlice = jest.mocked(useMoneySlice);
const mockUsePerpsSlice = jest.mocked(usePerpsSlice);
const mockUsePredictSlice = jest.mocked(usePredictSlice);
const mockUseDefiSlice = jest.mocked(useDefiSlice);
// Mock all slice hooks to control their output
jest.mock('./slices/useTokensSlice', () => ({
  useTokensSlice: jest.fn(),
}));
jest.mock('./slices/useMoneySlice', () => ({
  useMoneySlice: jest.fn(),
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
  useFiatNormalizer: () => ({
    toUserCurrency: (v: number) => v,
    userCurrency: 'USD',
  }),
}));

jest.mock('../../../../util/theme', () => {
  const themeModule = jest.requireActual<
    typeof import('../../../../util/theme')
  >('../../../../util/theme');
  return {
    ...themeModule,
    useTheme: () => themeModule.mockTheme,
  };
});

function makeSlice(
  key: 'tokens' | 'money' | 'perps' | 'predict' | 'defi',
  valueFiat: number,
  status: 'ready' | 'loading' | 'error' | 'ineligible' = 'ready',
) {
  const colors = getBalanceBreakdownSliceColors(mockTheme.themeAppearance);
  return {
    key,
    color: colors[key],
    valueFiat,
    percentOfTotal: 0,
    status,
  };
}

describe('getBalanceBreakdownSliceColors', () => {
  it('uses the light allocation palette', () => {
    expect(getBalanceBreakdownSliceColors(AppThemeKey.light)).toEqual(
      LIGHT_ALLOCATION_COLORS,
    );
    /* eslint-disable @metamask/design-tokens/color-no-hex -- Locks the approved reference palette. */
    expect(Object.values(LIGHT_ALLOCATION_COLORS)).toEqual([
      '#190066',
      '#89b0ff',
      '#adb6fe',
      '#c7ceff',
      '#d6dbff',
    ]);
    /* eslint-enable @metamask/design-tokens/color-no-hex */
  });

  it('uses the dark allocation palette', () => {
    expect(getBalanceBreakdownSliceColors(AppThemeKey.dark)).toEqual(
      DARK_ALLOCATION_COLORS,
    );
    /* eslint-disable @metamask/design-tokens/color-no-hex -- Locks the approved reference palette. */
    expect(Object.values(DARK_ALLOCATION_COLORS)).toEqual([
      '#8b99ff',
      '#cce7ff',
      '#abbcce',
      '#949596',
      '#66676a',
    ]);
    /* eslint-enable @metamask/design-tokens/color-no-hex */
  });
});

describe('useBalanceBreakdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTokensSlice.mockReturnValue(
      makeSlice('tokens', 50000) as ReturnType<typeof useTokensSlice>,
    );
    mockUseMoneySlice.mockReturnValue(
      makeSlice('money', 0) as ReturnType<typeof useMoneySlice>,
    );
    mockUsePerpsSlice.mockReturnValue(
      makeSlice('perps', 30000) as ReturnType<typeof usePerpsSlice>,
    );
    mockUsePredictSlice.mockReturnValue(
      makeSlice('predict', 20000) as ReturnType<typeof usePredictSlice>,
    );
    mockUseDefiSlice.mockReturnValue(
      makeSlice('defi', 10000) as ReturnType<typeof useDefiSlice>,
    );
  });

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
    mockUsePerpsSlice.mockReturnValue(
      makeSlice('perps', 30000, 'ineligible') as ReturnType<
        typeof usePerpsSlice
      >,
    );
    const { result } = renderHook(() => useBalanceBreakdown());
    // 50000 + 20000 + 10000 = 80000
    expect(result.current.hero.totalFiat).toBe(80000);
  });

  it('aggregates only ready values', () => {
    mockUsePerpsSlice.mockReturnValue(
      makeSlice('perps', 30000, 'loading') as ReturnType<typeof usePerpsSlice>,
    );
    const { result } = renderHook(() => useBalanceBreakdown());
    expect(result.current.hero.totalFiat).toBe(80000);
    expect(result.current.slices.perps.percentOfTotal).toBe(0);
  });

  it('keeps the hero ready when another eligible slice is still loading', () => {
    mockUsePerpsSlice.mockReturnValue(
      makeSlice('perps', 30000, 'loading') as ReturnType<typeof usePerpsSlice>,
    );
    const { result } = renderHook(() => useBalanceBreakdown());
    expect(result.current.hero.status).toBe('ready');
  });

  it('keeps a zero-value hero loading while an eligible slice is unresolved', () => {
    mockUseTokensSlice.mockReturnValue(
      makeSlice('tokens', 0) as ReturnType<typeof useTokensSlice>,
    );
    mockUseMoneySlice.mockReturnValue(
      makeSlice('money', 0, 'ineligible') as ReturnType<typeof useMoneySlice>,
    );
    mockUsePerpsSlice.mockReturnValue(
      makeSlice('perps', 0, 'loading') as ReturnType<typeof usePerpsSlice>,
    );
    mockUsePredictSlice.mockReturnValue(
      makeSlice('predict', 0, 'ineligible') as ReturnType<
        typeof usePredictSlice
      >,
    );
    mockUseDefiSlice.mockReturnValue(
      makeSlice('defi', 0, 'ineligible') as ReturnType<typeof useDefiSlice>,
    );

    const { result } = renderHook(() => useBalanceBreakdown());

    expect(result.current.hero.totalFiat).toBe(0);
    expect(result.current.hero.status).toBe('loading');
  });

  it('hero status is loading when all eligible slices are loading', () => {
    mockUseTokensSlice.mockReturnValue(
      makeSlice('tokens', 0, 'loading') as ReturnType<typeof useTokensSlice>,
    );
    mockUseMoneySlice.mockReturnValue(
      makeSlice('money', 0, 'loading') as ReturnType<typeof useMoneySlice>,
    );
    mockUsePerpsSlice.mockReturnValue(
      makeSlice('perps', 0, 'loading') as ReturnType<typeof usePerpsSlice>,
    );
    mockUsePredictSlice.mockReturnValue(
      makeSlice('predict', 0, 'loading') as ReturnType<typeof usePredictSlice>,
    );
    mockUseDefiSlice.mockReturnValue(
      makeSlice('defi', 0, 'loading') as ReturnType<typeof useDefiSlice>,
    );
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
      delta: { amount: 100, percent: 0.002 },
    } as ReturnType<typeof useTokensSlice>);
    mockUsePerpsSlice.mockReturnValue(
      makeSlice('perps', 30_000) as ReturnType<typeof usePerpsSlice>,
    );
    mockUsePerpsSlice.mockReturnValue({
      ...makeSlice('perps', 30_000),
      value1dAgoFiat: 29_500,
    } as ReturnType<typeof usePerpsSlice>);

    const { result } = renderHook(() => useBalanceBreakdown());
    // totalFiat = 110000; token +100 + perps +500 = +600
    expect(result.current.hero.delta?.amount).toBeCloseTo(600);
    expect(result.current.hero.delta?.percent).toBeCloseTo(
      600 / (110_000 - 600),
    );
  });

  it('does not mix perps session PnL into the 24h delta when the baseline is missing', () => {
    mockUseTokensSlice.mockReturnValue({
      ...makeSlice('tokens', 50_000),
      delta: { amount: 100, percent: 0.002 },
    } as ReturnType<typeof useTokensSlice>);
    mockUsePerpsSlice.mockReturnValue(
      makeSlice('perps', 30_000) as ReturnType<typeof usePerpsSlice>,
    );
    mockUsePerpsSlice.mockReturnValue({
      ...makeSlice('perps', 30_000),
      value1dAgoFiat: 0,
    } as ReturnType<typeof usePerpsSlice>);

    const { result } = renderHook(() => useBalanceBreakdown());
    expect(result.current.hero.delta?.amount).toBe(100);
    expect(result.current.hero.delta?.percent).toBeCloseTo(
      100 / (110_000 - 100),
    );
  });

  it('does not add perps when session PnL is zero and 24h baseline is missing', () => {
    mockUseTokensSlice.mockReturnValue({
      ...makeSlice('tokens', 50_000),
      delta: { amount: 100, percent: 0.002 },
    } as ReturnType<typeof useTokensSlice>);
    mockUsePerpsSlice.mockReturnValue(
      makeSlice('perps', 30_000) as ReturnType<typeof usePerpsSlice>,
    );
    mockUsePerpsSlice.mockReturnValue({
      ...makeSlice('perps', 30_000),
      value1dAgoFiat: 0,
    } as ReturnType<typeof usePerpsSlice>);

    const { result } = renderHook(() => useBalanceBreakdown());
    expect(result.current.hero.delta?.amount).toBe(100);
  });
});
