import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Animated } from 'react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import BalanceBreakdownView from './BalanceBreakdownView';
import { BalanceBreakdownTestIds } from './BalanceBreakdown.testIds';
import { mockTheme } from '../../../util/theme';
import { getBalanceBreakdownSliceColors } from './utils/getBalanceBreakdownSliceColors';
import { useBalanceBreakdown } from './hooks/useBalanceBreakdown';

const mockedUseBalanceBreakdown = jest.mocked(useBalanceBreakdown);
const SLICE_COLORS = getBalanceBreakdownSliceColors(mockTheme.colors);

// Mock the aggregator hook
jest.mock('./hooks/useBalanceBreakdown', () => ({
  useBalanceBreakdown: jest.fn(),
}));

jest.mock('../../hooks/useAnalytics/useAnalytics', () => {
  const mockBuilder = {
    addProperties: jest.fn(),
    addSensitiveProperties: jest.fn(),
    build: jest.fn(() => ({})),
  };
  mockBuilder.addProperties.mockImplementation(() => mockBuilder);
  mockBuilder.addSensitiveProperties.mockImplementation(() => mockBuilder);
  return {
    useAnalytics: () => ({
      trackEvent: jest.fn(),
      createEventBuilder: jest.fn(() => mockBuilder),
    }),
  };
});

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    DeFiPositionsController: { _executePoll: jest.fn().mockResolvedValue(undefined) },
  },
}));

jest.mock('../../UI/Predict/utils/accounts', () => ({
  getEvmAccountFromSelectedAccountGroup: jest.fn(() => ({ address: '0x123' })),
}));

jest.mock('../../UI/Predict/queries', () => ({
  predictQueries: {
    balance: { options: () => ({ queryKey: ['predict-balance'] }) },
    positions: { options: () => ({ queryKey: ['predict-positions'] }) },
    unrealizedPnL: { options: () => ({ queryKey: ['predict-upnl'] }) },
  },
}));

/** Real chart uses Animated rotation — mock here to avoid act() timer noise; see BreakdownDonutChart.test.tsx */
jest.mock('./components/BreakdownDonutChart/BreakdownDonutChart', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { View: RNView } = jest.requireActual<typeof import('react-native')>(
    'react-native',
  );
  const { BalanceBreakdownTestIds: TestIds } =
    jest.requireActual<typeof import('./BalanceBreakdown.testIds')>(
      './BalanceBreakdown.testIds',
    );
  return {
    __esModule: true,
    default: function MockBreakdownDonutChart() {
      return ReactActual.createElement(RNView, {
        testID: TestIds.DONUT_CHART,
      });
    },
  };
});

// Skeleton uses react-native Animated which leaks timers in tests
jest.mock('../../../component-library/components-temp/Skeleton', () => {
  const { View: RNView } = jest.requireActual<typeof import('react-native')>(
    'react-native',
  );
  return { __esModule: true, Skeleton: RNView };
});

const MOCK_BREAKDOWN = {
  hero: {
    totalFiat: 100000,
    userCurrency: 'USD',
    delta: { amount: 1234.56, percent: 0.0124, label: '24h' as const },
    status: 'ready' as const,
  },
  slices: {
    tokens: {
      key: 'tokens' as const,
      label: 'Tokens',
      color: SLICE_COLORS.tokens,
      valueFiat: 50000,
      percentOfTotal: 0.5,
      status: 'ready' as const,
      drilldown: [{ key: 'eth', label: 'ETH', valueFiat: 40000 }],
    },
    perps: {
      key: 'perps' as const,
      label: 'Perpetuals',
      color: SLICE_COLORS.perps,
      valueFiat: 30000,
      percentOfTotal: 0.3,
      status: 'ready' as const,
      drilldown: [],
    },
    predict: {
      key: 'predict' as const,
      label: 'Predictions',
      color: SLICE_COLORS.predict,
      valueFiat: 20000,
      percentOfTotal: 0.2,
      status: 'ready' as const,
      drilldown: [],
    },
    defi: {
      key: 'defi' as const,
      label: 'DeFi',
      color: SLICE_COLORS.defi,
      valueFiat: 0,
      percentOfTotal: 0,
      status: 'ineligible' as const,
      drilldown: [],
    },
  },
  warnings: [] as const,
};

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        ...backgroundState.PreferencesController,
        privacyMode: false,
      },
    },
  },
};

describe('BalanceBreakdownView', () => {
  let timingSpy: jest.SpiedFunction<typeof Animated.timing>;

  beforeEach(() => {
    timingSpy = jest.spyOn(Animated, 'timing').mockImplementation((value, config) => {
      const toValue =
        typeof config.toValue === 'number' ? config.toValue : undefined;
      return {
        start: (cb?: (r: { finished: boolean }) => void) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (value as any).setValue(toValue);
          cb?.({ finished: true });
        },
      } as Animated.CompositeAnimation;
    });
    mockedUseBalanceBreakdown.mockReturnValue(
      MOCK_BREAKDOWN as unknown as ReturnType<typeof useBalanceBreakdown>,
    );
  });

  afterEach(() => {
    timingSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('renders the container', () => {
    const { getByTestId } = renderWithProvider(<BalanceBreakdownView />, {
      state: initialState,
    });
    expect(getByTestId(BalanceBreakdownTestIds.CONTAINER)).toBeDefined();
  });

  it('renders the donut chart', () => {
    const { getByTestId } = renderWithProvider(<BalanceBreakdownView />, {
      state: initialState,
    });
    expect(getByTestId(BalanceBreakdownTestIds.DONUT_CHART)).toBeDefined();
  });

  it('renders all legend rows for eligible slices', () => {
    const { getByTestId } = renderWithProvider(<BalanceBreakdownView />, {
      state: initialState,
    });
    expect(getByTestId(BalanceBreakdownTestIds.LEGEND_ROW('tokens'))).toBeDefined();
    expect(getByTestId(BalanceBreakdownTestIds.LEGEND_ROW('perps'))).toBeDefined();
    expect(getByTestId(BalanceBreakdownTestIds.LEGEND_ROW('predict'))).toBeDefined();
    // defi is ineligible — still shows in legend so user sees it, greyed
    expect(getByTestId(BalanceBreakdownTestIds.LEGEND_ROW('defi'))).toBeDefined();
  });

  it('switches to drilldown when a legend row is tapped', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <BalanceBreakdownView />,
      { state: initialState },
    );

    // No drilldown initially
    expect(queryByTestId(BalanceBreakdownTestIds.DRILLDOWN_LIST)).toBeNull();

    // Tap Tokens legend row
    fireEvent.press(getByTestId(BalanceBreakdownTestIds.LEGEND_ROW('tokens')));

    // Drilldown should appear
    expect(getByTestId(BalanceBreakdownTestIds.DRILLDOWN_LIST)).toBeDefined();
    expect(
      getByTestId(BalanceBreakdownTestIds.DRILLDOWN_TOP_GLOW),
    ).toBeDefined();
  });

  it('returns to legend when center reset button is tapped', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <BalanceBreakdownView />,
      { state: initialState },
    );

    fireEvent.press(getByTestId(BalanceBreakdownTestIds.LEGEND_ROW('tokens')));
    expect(getByTestId(BalanceBreakdownTestIds.DRILLDOWN_LIST)).toBeDefined();

    // Tap center to reset to overview
    fireEvent.press(getByTestId(BalanceBreakdownTestIds.RESET_OVERVIEW));
    expect(queryByTestId(BalanceBreakdownTestIds.DRILLDOWN_LIST)).toBeNull();
    expect(
      queryByTestId(BalanceBreakdownTestIds.DRILLDOWN_TOP_GLOW),
    ).toBeNull();
  });

  it('shows loading skeleton when hero status is loading', () => {
    mockedUseBalanceBreakdown.mockReturnValue({
      ...MOCK_BREAKDOWN,
      hero: { ...MOCK_BREAKDOWN.hero, status: 'loading' },
    } as unknown as ReturnType<typeof useBalanceBreakdown>);

    const { getByTestId } = renderWithProvider(<BalanceBreakdownView />, {
      state: initialState,
    });
    // Hero total still renders (inside Skeleton with hideChildren)
    expect(getByTestId(BalanceBreakdownTestIds.HERO_TOTAL)).toBeDefined();
  });

  it('shows warning banner when multi_evm_undercount warning is present', () => {
    mockedUseBalanceBreakdown.mockReturnValue({
      ...MOCK_BREAKDOWN,
      warnings: ['multi_evm_undercount'],
    } as unknown as ReturnType<typeof useBalanceBreakdown>);

    const { getByTestId } = renderWithProvider(<BalanceBreakdownView />, {
      state: initialState,
    });
    expect(getByTestId(BalanceBreakdownTestIds.WARNING_BANNER)).toBeDefined();
  });
});
