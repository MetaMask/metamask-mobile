import React from 'react';
import type { ReactTestInstance } from 'react-test-renderer';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import PredictMarketDetails from './PredictMarketDetails';
import { PredictPriceHistoryInterval } from '../../types';
import type { UsePredictPriceHistoryOptions } from '../../hooks/usePredictPriceHistory';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../constants/eventNames';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

const runAfterInteractionsCallbacks: (() => void)[] = [];
const mockRunAfterInteractions = jest.spyOn(
  InteractionManager,
  'runAfterInteractions',
);
const runAfterInteractionsMockImpl: typeof InteractionManager.runAfterInteractions =
  (task) => {
    if (typeof task === 'function') {
      runAfterInteractionsCallbacks.push(task as () => void);
    }

    return {
      then: jest.fn(),
      done: jest.fn(),
      cancel: jest.fn(),
    } as ReturnType<typeof InteractionManager.runAfterInteractions>;
  };

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackMarketDetailsOpened: jest.fn(),
      trackGeoBlockTriggered: jest.fn(),
    },
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
  useIsFocused: jest.fn(() => true),
  NavigationContainer: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ children }: { children: React.ReactNode }) => children,
  }),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: View,
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: jest.fn(() => ({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    })),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
  };
});

// Minimal mock to add testID pattern for icon assertions
jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const ActualIcon = jest.requireActual(
    '../../../../../component-library/components/Icons/Icon',
  );
  return {
    ...ActualIcon,
    __esModule: true,
    default: ({
      name,
      testID,
      ...props
    }: {
      name: string;
      testID?: string;
      [key: string]: unknown;
    }) => {
      const Icon = ActualIcon.default;
      return <Icon {...props} name={name} testID={testID || `icon-${name}`} />;
    },
  };
});

// Minimal mock to add testID pattern for button assertions
jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const ActualButton = jest.requireActual(
    '../../../../../component-library/components/Buttons/Button',
  );
  return {
    ...ActualButton,
    __esModule: true,
    default: ({
      testID,
      ...props
    }: {
      testID?: string;
      [key: string]: unknown;
    }) => {
      const Button = ActualButton.default;
      return <Button {...props} testID={testID || 'button'} />;
    },
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, vars?: Record<string, string | number>) => {
    if (key === 'predict.position_info' && vars) {
      return `${vars.initialValue} on ${vars.outcome} to win ${vars.shares}`;
    }
    return key;
  }),
}));

jest.mock('../../../Navbar', () => ({
  getNavigationOptionsTitle: jest.fn(() => ({})),
}));

jest.mock('../../utils/format', () => ({
  formatPrice: jest.fn(
    (value: number, options?: { maximumDecimals?: number }) =>
      `$${value.toFixed(options?.maximumDecimals || 2)}`,
  ),
  formatVolume: jest.fn((value: number) => value.toLocaleString()),
  formatPercentage: jest.fn((value: number) =>
    value === 0
      ? '0%'
      : `${value > 0 ? '+' : ''}${Math.abs(value).toFixed(2)}%`,
  ),
  formatAddress: jest.fn(
    (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`,
  ),
  estimateLineCount: jest.fn((text?: string) => {
    if (!text) return 1;
    // Simple mock implementation - returns 1 for short text, 2 for longer
    return text.length > 50 ? 2 : 1;
  }),
  formatCents: jest.fn((dollars: number) => {
    const cents = dollars * 100;
    const roundedCents = Number(cents.toFixed(1));
    if (roundedCents === Math.floor(roundedCents)) {
      return `${Math.floor(roundedCents)}¢`;
    }
    return `${cents.toFixed(1)}¢`;
  }),
  formatPositionSize: jest.fn(
    (
      value: number,
      options?: { minimumDecimals?: number; maximumDecimals?: number },
    ) => value.toFixed(options?.maximumDecimals || 2),
  ),
}));

jest.mock('../../hooks/usePredictMarket', () => ({
  usePredictMarket: jest.fn(() => ({
    market: null,
    isFetching: false,
    refetch: jest.fn(),
  })),
}));

jest.mock('../../hooks/usePredictPriceHistory', () => ({
  usePredictPriceHistory: jest.fn(() => ({
    priceHistories: [],
    isFetching: false,
    errors: [],
    refetch: jest.fn(),
  })),
}));

jest.mock('../../hooks/usePredictPositions', () => ({
  usePredictPositions: jest.fn(() => ({
    positions: [],
    isLoading: false,
    isRefreshing: false,
    error: null,
    loadPositions: jest.fn(),
  })),
}));

jest.mock('../../hooks/usePredictBalance', () => ({
  usePredictBalance: jest.fn(() => ({
    balance: 100,
    hasNoBalance: false,
    isLoading: false,
    isRefreshing: false,
    error: null,
    loadBalance: jest.fn(),
  })),
}));

jest.mock('../../hooks/usePredictClaim', () => ({
  usePredictClaim: jest.fn(() => ({
    claim: jest.fn(),
  })),
}));

jest.mock('../../hooks/usePredictEligibility', () => ({
  usePredictEligibility: jest.fn(() => ({
    isEligible: true,
    refreshEligibility: jest.fn(),
  })),
}));

jest.mock('../../hooks/usePredictPrices', () => ({
  usePredictPrices: jest.fn(() => ({
    prices: { providerId: '', results: [] },
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

jest.mock('../../hooks/usePredictMeasurement', () => ({
  usePredictMeasurement: jest.fn(),
}));

let mockUsePredictOrderPreview: jest.Mock;
jest.mock('../../hooks/usePredictOrderPreview', () => ({
  usePredictOrderPreview: (mockUsePredictOrderPreview = jest.fn()),
}));

jest.mock('../../components/PredictDetailsChart/PredictDetailsChart', () => {
  const { View, Text } = jest.requireActual('react-native');
  return function MockPredictDetailsChart() {
    return (
      <View testID="predict-details-chart">
        <Text>Chart Component</Text>
      </View>
    );
  };
});

jest.mock('../../components/PredictMarketOutcome', () => {
  const { View, Text } = jest.requireActual('react-native');
  return function MockPredictMarketOutcome({
    outcome,
  }: {
    outcome: { title?: string };
  }) {
    return (
      <View testID="predict-market-outcome">
        <Text>{outcome?.title || 'Outcome'}</Text>
      </View>
    );
  };
});

jest.mock('../../components/PredictShareButton/PredictShareButton', () => {
  const { View } = jest.requireActual('react-native');
  return function MockPredictShareButton({ marketId }: { marketId?: string }) {
    return (
      <View
        testID="predict-share-button"
        accessibilityHint={`marketId:${marketId ?? 'undefined'}`}
      />
    );
  };
});

jest.mock('../../../../Base/TabBar', () => {
  const { View, Text } = jest.requireActual('react-native');
  return function MockTabBar({ textStyle }: { textStyle: object }) {
    return (
      <View testID="tab-bar">
        <Text style={textStyle}>Tab Bar</Text>
      </View>
    );
  };
});

jest.mock('@tommasini/react-native-scrollable-tab-view', () => {
  const { View } = jest.requireActual('react-native');
  return function MockScrollableTabView({
    children,
    renderTabBar,
  }: {
    children: React.ReactNode;
    renderTabBar?: () => React.ReactNode;
  }) {
    return (
      <View testID="scrollable-tab-view">
        {renderTabBar?.()}
        {children}
      </View>
    );
  };
});

function createMockMarket(overrides = {}) {
  const defaultMarket = {
    id: 'market-1',
    title: 'Will Bitcoin reach $100k by end of 2024?',
    image: 'https://example.com/bitcoin.png',
    endDate: '2024-12-31T23:59:59Z',
    providerId: 'polymarket',
    status: 'open',
    tags: [],
    outcomes: [
      {
        id: 'outcome-1',
        title: 'Yes',
        groupItemTitle: 'Yes',
        status: 'open',
        tokens: [
          {
            id: 'token-1',
            title: 'Yes',
            price: 0.65,
          },
          {
            id: 'token-2',
            title: 'No',
            price: 0.35,
          },
        ],
        volume: 1000000,
      },
      {
        id: 'outcome-2',
        title: 'No',
        groupItemTitle: 'No',
        tokens: [
          {
            id: 'token-3',
            title: 'No',
            price: 0.35,
          },
        ],
        volume: 500000,
      },
    ],
  };

  const mergedMarket = {
    ...defaultMarket,
    ...overrides,
  };

  const normalizedOutcomes =
    mergedMarket.outcomes?.map((outcome, outcomeIndex) => {
      const fallbackOutcomeTitle =
        outcome.title ?? `Outcome ${outcomeIndex + 1}`;

      return {
        ...outcome,
        groupItemTitle: outcome.groupItemTitle ?? fallbackOutcomeTitle,
        tokens: (outcome.tokens ?? []).map((token, tokenIndex) => {
          let tokenTitle = token.title;

          if (!tokenTitle) {
            if (outcomeIndex === 0 && tokenIndex === 0) {
              tokenTitle = 'Yes';
            } else if (outcomeIndex === 0 && tokenIndex === 1) {
              tokenTitle = 'No';
            } else {
              tokenTitle =
                outcome.groupItemTitle ??
                outcome.title ??
                `Token ${tokenIndex + 1}`;

              if (tokenIndex > 0 && tokenTitle === fallbackOutcomeTitle) {
                tokenTitle = `${tokenTitle} ${tokenIndex + 1}`;
              }
            }
          }

          return {
            ...token,
            title: tokenTitle,
          };
        }),
      };
    }) ?? [];

  return {
    ...mergedMarket,
    outcomes: normalizedOutcomes,
  };
}

type HookOverrideShape = Record<string, unknown>;

interface PredictPositionsHookResultMock {
  positions: Record<string, unknown>[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: unknown;
  loadPositions: jest.Mock;
}

interface SplitPositionsOverrides {
  active?: Partial<PredictPositionsHookResultMock>;
  claimable?: Partial<PredictPositionsHookResultMock>;
}

type PositionsOverride =
  | Partial<PredictPositionsHookResultMock>
  | SplitPositionsOverrides;

const isSplitPositionsOverride = (
  override: PositionsOverride,
): override is SplitPositionsOverrides =>
  override !== null &&
  typeof override === 'object' &&
  ('active' in override || 'claimable' in override);

interface HookOverrides {
  market?: HookOverrideShape;
  priceHistory?: HookOverrideShape;
  positions?: PositionsOverride;
  eligibility?: HookOverrideShape;
}

function setupPredictMarketDetailsTest(
  marketOverrides: HookOverrideShape = {},
  routeOverrides: HookOverrideShape = {},
  hookOverrides: HookOverrides = {},
) {
  jest.clearAllMocks();
  runAfterInteractionsCallbacks.length = 0;
  mockRunAfterInteractions.mockImplementation(runAfterInteractionsMockImpl);

  const mockNavigate = jest.fn();
  const mockSetOptions = jest.fn();
  const mockGoBack = jest.fn();
  const mockCanGoBack = jest.fn(() => true);
  const mockGetParent = jest.fn(() => ({
    canGoBack: jest.fn(() => true),
    goBack: jest.fn(),
  }));

  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;
  const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;

  const mockMarket = createMockMarket(marketOverrides);

  const mockRoute = {
    key: 'PredictMarketDetails',
    name: 'PredictMarketDetails' as const,
    params: {
      marketId: 'market-1',
    },
    ...routeOverrides,
  };

  mockUseNavigation.mockReturnValue({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
    getParent: mockGetParent,
  } as unknown as NavigationProp<ParamListBase>);

  mockUseRoute.mockReturnValue(mockRoute);

  const { usePredictMarket } = jest.requireMock('../../hooks/usePredictMarket');
  const { usePredictPriceHistory } = jest.requireMock(
    '../../hooks/usePredictPriceHistory',
  );
  const { usePredictPositions } = jest.requireMock(
    '../../hooks/usePredictPositions',
  );
  const { usePredictEligibility } = jest.requireMock(
    '../../hooks/usePredictEligibility',
  );

  usePredictEligibility.mockReturnValue({
    isEligible: true,
    refreshEligibility: jest.fn(),
    ...hookOverrides.eligibility,
  });

  usePredictMarket.mockReturnValue({
    market: mockMarket,
    isFetching: false,
    refetch: jest.fn(),
    ...hookOverrides.market,
  });

  usePredictPriceHistory.mockReturnValue({
    priceHistories: [],
    isFetching: false,
    errors: [],
    refetch: jest.fn(),
    ...hookOverrides.priceHistory,
  });

  const positionsOverridesValue = (hookOverrides.positions ??
    {}) as PositionsOverride;

  let activeOverride: Partial<PredictPositionsHookResultMock> = {};
  let claimableOverride: Partial<PredictPositionsHookResultMock> = {};

  if (isSplitPositionsOverride(positionsOverridesValue)) {
    activeOverride = positionsOverridesValue.active ?? {};
    claimableOverride = positionsOverridesValue.claimable ?? {};
  } else {
    activeOverride =
      positionsOverridesValue as Partial<PredictPositionsHookResultMock>;
  }

  const activePositionsHook: PredictPositionsHookResultMock = {
    positions: [],
    isLoading: false,
    isRefreshing: false,
    error: null,
    loadPositions: jest.fn(),
    ...activeOverride,
  };

  const claimablePositionsHook: PredictPositionsHookResultMock = {
    positions: [],
    isLoading: false,
    isRefreshing: false,
    error: null,
    loadPositions: jest.fn(),
    ...claimableOverride,
  };

  usePredictPositions.mockImplementation(
    ({ claimable }: { claimable?: boolean }) =>
      claimable ? claimablePositionsHook : activePositionsHook,
  );

  // Set up usePredictOrderPreview mock to return preview data matching position currentValue
  mockUsePredictOrderPreview.mockImplementation(
    (params: { outcomeId: string }) => {
      // Find the position matching this outcomeId from active positions
      const position = activePositionsHook.positions.find(
        (p: Record<string, unknown>) => p.outcomeId === params.outcomeId,
      ) as { currentValue?: number } | undefined;

      // Return preview with minAmountReceived matching position's currentValue
      // or a default value if no position found
      const minAmountReceived = position?.currentValue ?? 100;

      return {
        preview: {
          marketId: params.outcomeId,
          outcomeId: params.outcomeId,
          outcomeTokenId: 'token-1',
          timestamp: Date.now(),
          side: 'sell',
          sharePrice: 0.5,
          maxAmountSpent: 0,
          minAmountReceived,
          slippage: 0,
          tickSize: 0,
          minOrderSize: 0,
          negRisk: false,
        },
        error: null,
        isCalculating: false,
      };
    },
  );

  const result = renderWithProvider(<PredictMarketDetails />);

  return {
    ...result,
    mockNavigate,
    mockSetOptions,
    mockGoBack,
    mockCanGoBack,
    mockGetParent,
    mockMarket,
    mockRoute,
  };
}

const collapseWhitespace = (text: string) => text.replace(/\s+/g, '');

const extractText = (node: React.ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(extractText).join('');
  }

  if (React.isValidElement(node)) {
    return extractText(node.props.children);
  }

  return '';
};

const getActionButtonText = (button: ReactTestInstance) =>
  collapseWhitespace(extractText(button.props.children));

const getActionButtons = () =>
  screen
    .getAllByTestId('button')
    .filter((button) => getActionButtonText(button).includes('¢'));

const findActionButtonByPrice = (price: number) =>
  getActionButtons().find(
    (button) => getActionButtonText(button) === `•${price}¢`,
  );

describe('PredictMarketDetails', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockRunAfterInteractions.mockReset();
  });

  afterAll(() => {
    mockRunAfterInteractions.mockRestore();
  });

  describe('Component Rendering', () => {
    it('renders the main screen container', () => {
      setupPredictMarketDetailsTest();

      expect(
        screen.getByTestId('predict-market-details-screen'),
      ).toBeOnTheScreen();
    });

    it('displays market title when market data is loaded', () => {
      const { mockMarket } = setupPredictMarketDetailsTest();

      expect(screen.getByText(mockMarket.title)).toBeOnTheScreen();
    });

    it('displays loading state when market is fetching', () => {
      setupPredictMarketDetailsTest(
        {},
        {},
        { market: { isFetching: true, market: null } },
      );

      // Check that skeleton loaders appear
      expect(
        screen.getByTestId('predict-details-header-skeleton-back-button'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-details-content-skeleton-option-1'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-details-buttons-skeleton-button-yes'),
      ).toBeOnTheScreen();
    });

    it('displays fallback title when market data is unavailable', () => {
      setupPredictMarketDetailsTest({}, {}, { market: { market: null } });

      // Screen renders without a title; other sections may still show loading keys
      expect(
        screen.getByTestId('predict-market-details-screen'),
      ).toBeOnTheScreen();
    });

    it('renders back button with correct accessibility', () => {
      setupPredictMarketDetailsTest();

      expect(screen.getByTestId('icon-ArrowLeft')).toBeOnTheScreen();
    });

    it('renders share button in header when market data is loaded', () => {
      setupPredictMarketDetailsTest();

      expect(screen.getByTestId('predict-share-button')).toBeOnTheScreen();
    });

    it('passes market.id to share button', () => {
      setupPredictMarketDetailsTest({ id: 'test-market-id' });

      const shareButton = screen.getByTestId('predict-share-button');

      expect(shareButton.props.accessibilityHint).toBe(
        'marketId:test-market-id',
      );
    });

    it('hides share button when market is not loaded (shows skeleton)', () => {
      setupPredictMarketDetailsTest({}, {}, { market: { market: null } });

      expect(
        screen.queryByTestId('predict-share-button'),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-details-header-skeleton-back-button'),
      ).toBeOnTheScreen();
    });
  });

  describe('Market Information Display', () => {
    it('displays market volume correctly', () => {
      setupPredictMarketDetailsTest();

      const aboutTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-1',
      );
      fireEvent.press(aboutTab);

      expect(
        screen.getByText('predict.market_details.volume'),
      ).toBeOnTheScreen();
    });

    it('displays market end date correctly', () => {
      setupPredictMarketDetailsTest();

      const aboutTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-1',
      );
      fireEvent.press(aboutTab);

      expect(
        screen.getByText('predict.market_details.end_date'),
      ).toBeOnTheScreen();
      expect(screen.getByText('12/31/2024')).toBeOnTheScreen();
    });

    it('displays resolution details information', () => {
      setupPredictMarketDetailsTest();

      const aboutTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-1',
      );
      fireEvent.press(aboutTab);

      expect(
        screen.getByText('predict.market_details.resolution_details'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Polymarket')).toBeOnTheScreen();
    });

    it('navigates to polymarket resolution details when pressed', () => {
      const { mockNavigate } = setupPredictMarketDetailsTest();

      const aboutTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-1',
      );
      fireEvent.press(aboutTab);

      const resolutionText = screen.getByText('Polymarket');

      act(() => {
        fireEvent.press(resolutionText);
      });

      expect(mockRunAfterInteractions).toHaveBeenCalledTimes(1);
      const callback = runAfterInteractionsCallbacks[0];
      expect(callback).toBeDefined();

      act(() => {
        callback?.();
      });

      expect(mockNavigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: 'https://docs.polymarket.com/polymarket-learn/markets/how-are-markets-resolved',
          title: 'predict.market_details.resolution_details',
        },
      });
    });
  });

  describe('Chart Rendering', () => {
    it('renders single outcome chart for single outcome markets', () => {
      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            status: 'open',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.65 },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(singleOutcomeMarket);

      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });

    it('renders multiple outcome chart for binary markets with two outcomes', () => {
      setupPredictMarketDetailsTest();

      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });

    it('renders multiple outcome chart for multi-outcome markets', () => {
      const multiOutcomeMarket = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            status: 'open',
            tokens: [{ id: 'token-1', price: 0.4 }],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-2', price: 0.3 }],
            volume: 500000,
          },
          {
            id: 'outcome-3',
            title: 'Option C',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.3 }],
            volume: 300000,
          },
        ],
      });

      setupPredictMarketDetailsTest(multiOutcomeMarket);

      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });

    it('does not render chart when all outcomes are closed', () => {
      const closedOutcomesMarket = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            status: 'closed',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Yes' },
              { id: 'token-1b', price: 0.0, title: 'No' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'No',
            status: 'closed',
            tokens: [
              { id: 'token-2', price: 0.0, title: 'Yes' },
              { id: 'token-2b', price: 1.0, title: 'No' },
            ],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(closedOutcomesMarket);

      expect(
        screen.queryByTestId('predict-details-chart'),
      ).not.toBeOnTheScreen();
    });

    it('does not render chart when market has no open outcomes', () => {
      const noOpenOutcomesMarket = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            status: 'closed',
            tokens: [{ id: 'token-1', price: 0.5 }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(noOpenOutcomesMarket);

      expect(
        screen.queryByTestId('predict-details-chart'),
      ).not.toBeOnTheScreen();
    });

    it('renders chart when market has at least one open outcome', () => {
      const mixedStatusMarket = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            status: 'closed',
            tokens: [{ id: 'token-1', price: 1.0 }],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-2', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(mixedStatusMarket);

      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });

    it('limits chart data to first 3 open outcomes when more are available', () => {
      const { usePredictPriceHistory } = jest.requireMock(
        '../../hooks/usePredictPriceHistory',
      );

      const marketWithManyOutcomes = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            status: 'open',
            tokens: [{ id: 'token-1', price: 0.25 }],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-2', price: 0.25 }],
            volume: 800000,
          },
          {
            id: 'outcome-3',
            title: 'Option C',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.25 }],
            volume: 600000,
          },
          {
            id: 'outcome-4',
            title: 'Option D',
            status: 'open',
            tokens: [{ id: 'token-4', price: 0.25 }],
            volume: 400000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithManyOutcomes);

      expect(usePredictPriceHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          marketIds: ['token-1', 'token-2', 'token-3'],
        }),
      );
    });

    it('filters out closed outcomes from chart data', () => {
      const { usePredictPriceHistory } = jest.requireMock(
        '../../hooks/usePredictPriceHistory',
      );

      const marketWithMixedStatus = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            status: 'closed',
            tokens: [{ id: 'token-1', price: 1.0 }],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-2', price: 0.6 }],
            volume: 800000,
          },
          {
            id: 'outcome-3',
            title: 'Option C',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.4 }],
            volume: 600000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithMixedStatus);

      expect(usePredictPriceHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          marketIds: ['token-2', 'token-3'],
        }),
      );
      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });

    it('removes chart when closed market lacks open outcomes', () => {
      const emptyOutcomesMarket = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Placeholder',
            status: 'closed',
            tokens: [
              { id: 'token-1', title: 'Token', price: 0.5 },
              { id: 'token-2', title: 'Token 2', price: 0.5 },
            ],
            volume: 0,
          },
        ],
      });

      setupPredictMarketDetailsTest(emptyOutcomesMarket);

      expect(
        screen.queryByTestId('predict-details-chart'),
      ).not.toBeOnTheScreen();
    });

    it('renders chart even when outcomes have no tokens', () => {
      const noTokensMarket = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            status: 'open',
            tokens: [],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(noTokensMarket);

      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });
  });

  describe('Tab Navigation', () => {
    it('renders tab bar with correct tabs', () => {
      setupPredictMarketDetailsTest();

      expect(
        screen.getByTestId('predict-market-details-tab-bar'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-market-details-scrollable-tab-view'),
      ).toBeOnTheScreen();
    });

    it('displays About tab content', () => {
      setupPredictMarketDetailsTest();

      const aboutTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-1',
      );
      fireEvent.press(aboutTab);

      expect(
        screen.getByText('predict.market_details.volume'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('predict.market_details.end_date'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('predict.market_details.resolution_details'),
      ).toBeOnTheScreen();
    });

    it('hides Positions tab when user has no positions', () => {
      setupPredictMarketDetailsTest();

      expect(
        screen.queryByText('predict.tabs.positions'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Action Buttons', () => {
    it('renders Yes and No action buttons for single outcome markets', () => {
      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.65 },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(singleOutcomeMarket);

      const actionButtons = getActionButtons();
      const buttonLabels = actionButtons.map(getActionButtonText);

      expect(actionButtons).toHaveLength(2);
      expect(buttonLabels).toEqual(expect.arrayContaining(['•65¢', '•35¢']));
    });

    it('calculates percentage correctly from market price', () => {
      const marketWithDifferentPrice = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.75 },
              { id: 'token-2', title: 'No', price: 0.25 },
            ],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithDifferentPrice);

      const actionButtons = getActionButtons();
      const buttonLabels = actionButtons.map(getActionButtonText);

      expect(buttonLabels).toEqual(expect.arrayContaining(['•75¢', '•25¢']));
    });
  });

  describe('Navigation Functionality', () => {
    it('handles back button press correctly', () => {
      const { mockGoBack, mockCanGoBack } = setupPredictMarketDetailsTest();

      const backButton = screen.getByTestId('icon-ArrowLeft');
      fireEvent.press(backButton);

      expect(mockCanGoBack).toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('navigates to predict root when current navigation cannot go back', () => {
      const { mockCanGoBack, mockNavigate } = setupPredictMarketDetailsTest();
      mockCanGoBack.mockReturnValue(false);

      const backButton = screen.getByTestId('icon-ArrowLeft');
      fireEvent.press(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT);
    });
  });

  describe('Current Prediction Display', () => {
    it('displays current prediction percentage for single outcome markets', () => {
      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.65 },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(singleOutcomeMarket);

      // The component now shows the percentage in the action buttons instead of a separate text
      const actionButtons = getActionButtons();
      const buttonLabels = actionButtons.map(getActionButtonText);

      expect(buttonLabels).toContain('•65¢');
    });

    it('handles missing price data gracefully', () => {
      const marketWithoutPrice = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: undefined },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithoutPrice);

      // The component now shows 0% in the action buttons when price is undefined
      const actionButtons = getActionButtons();
      const buttonLabels = actionButtons.map(getActionButtonText);

      expect(buttonLabels).toEqual(expect.arrayContaining(['•0¢', '•100¢']));
    });
  });

  describe('Edge Cases', () => {
    it('handles market without image', () => {
      const marketWithoutImage = createMockMarket({ image: null });

      setupPredictMarketDetailsTest(marketWithoutImage);

      expect(screen.getByText(marketWithoutImage.title)).toBeOnTheScreen();
    });

    it('handles market without end date', () => {
      const marketWithoutEndDate = createMockMarket({ endDate: null });

      setupPredictMarketDetailsTest(marketWithoutEndDate);

      const aboutTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-1',
      );
      fireEvent.press(aboutTab);

      expect(screen.getByText('N/A')).toBeOnTheScreen();
    });

    it('handles market with minimal data', () => {
      const marketWithMinimalData = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 0.5 }],
            volume: 0,
          },
        ],
        title: 'Test Market',
        image: null,
        endDate: null,
      });

      setupPredictMarketDetailsTest(marketWithMinimalData);

      expect(screen.getByText('Test Market')).toBeOnTheScreen();
    });
  });

  describe('Internationalization', () => {
    it('uses correct string keys for back button', () => {
      setupPredictMarketDetailsTest();

      expect(strings).toHaveBeenCalledWith('predict.buttons.back');
    });
  });

  describe('Event Handlers', () => {
    it('handles timeframe change with valid timeframe', () => {
      const { mockMarket } = setupPredictMarketDetailsTest();

      // Find the chart component and trigger timeframe change
      const chartComponent = screen.getByTestId('predict-details-chart');
      expect(chartComponent).toBeOnTheScreen();

      // The timeframe change is handled internally by the component
      // We can verify the component renders without errors
      expect(screen.getByText(mockMarket.title)).toBeOnTheScreen();
    });

    it('handles cash out button press', () => {
      const mockPosition = {
        id: 'position-1',
        outcomeId: 'outcome-1',
        outcome: 'Yes',
        size: 100,
        initialValue: 65,
        currentValue: 70,
        avgPrice: 0.65,
        percentPnl: 7.7,
        icon: 'https://example.com/icon.png',
      };

      const { mockNavigate } = setupPredictMarketDetailsTest(
        { status: 'open' },
        {},
        { positions: { positions: [mockPosition] } },
      );

      // Switch to Positions tab (index 0 when positions exist)
      const positionsTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-0',
      );
      fireEvent.press(positionsTab);

      const cashOutButton = screen.getByText('predict.cash_out');
      fireEvent.press(cashOutButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PREDICT.MODALS.SELL_PREVIEW,
        {
          position: mockPosition,
          outcome: expect.any(Object),
          market: expect.any(Object),
          entryPoint: 'predict_market_details',
        },
      );
    });

    it('handles Yes button press for betting', () => {
      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.65 },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      const { mockNavigate } =
        setupPredictMarketDetailsTest(singleOutcomeMarket);

      const yesButton = findActionButtonByPrice(65);
      expect(yesButton).toBeDefined();
      fireEvent.press(yesButton as ReactTestInstance);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PREDICT.MODALS.BUY_PREVIEW,
        {
          market: singleOutcomeMarket,
          outcome: singleOutcomeMarket.outcomes[0],
          outcomeToken: singleOutcomeMarket.outcomes[0].tokens[0],
          entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
        },
      );
    });

    it('handles No button press for betting', () => {
      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.65 },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      const { mockNavigate } =
        setupPredictMarketDetailsTest(singleOutcomeMarket);

      const noButton = findActionButtonByPrice(35);
      expect(noButton).toBeDefined();
      fireEvent.press(noButton as ReactTestInstance);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PREDICT.MODALS.BUY_PREVIEW,
        {
          market: singleOutcomeMarket,
          outcome: singleOutcomeMarket.outcomes[0],
          outcomeToken: singleOutcomeMarket.outcomes[0].tokens[1],
          entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
        },
      );
    });
  });

  describe('Pull to Refresh', () => {
    it('attaches a themed RefreshControl to the scroll view', () => {
      setupPredictMarketDetailsTest();

      const scrollView = screen.getByTestId(
        'predict-market-details-scrollable-tab-view',
      );
      const refreshControlProps = scrollView.props.refreshControl.props;

      expect(scrollView.props.refreshControl).toBeDefined();
      expect(refreshControlProps.tintColor).toBeTruthy();
      expect(refreshControlProps.colors).toEqual([
        refreshControlProps.tintColor,
      ]);
      expect(refreshControlProps.refreshing).toBe(false);
    });

    it('triggers market, price history, and active positions refresh', async () => {
      const mockRefetchMarket = jest.fn(() => Promise.resolve());
      const mockRefetchPriceHistory = jest.fn(() => Promise.resolve());
      const mockLoadActivePositions = jest.fn(() => Promise.resolve());

      setupPredictMarketDetailsTest(
        {},
        {},
        {
          market: { refetch: mockRefetchMarket },
          priceHistory: { refetch: mockRefetchPriceHistory },
          positions: { loadPositions: mockLoadActivePositions },
        },
      );

      const scrollView = screen.getByTestId(
        'predict-market-details-scrollable-tab-view',
      );

      await act(async () => {
        await scrollView.props.refreshControl.props.onRefresh();
      });

      await waitFor(() => {
        expect(mockRefetchMarket).toHaveBeenCalledTimes(1);
        expect(mockRefetchPriceHistory).toHaveBeenCalledTimes(1);
        expect(mockLoadActivePositions).toHaveBeenCalled();
        expect(mockLoadActivePositions).toHaveBeenCalledWith({
          isRefresh: true,
        });
      });
    });
  });

  describe('Conditional Rendering', () => {
    it('renders positions section when user has positions', () => {
      const mockPosition = {
        id: 'position-1',
        outcomeId: 'outcome-1',
        outcome: 'Yes',
        title: 'Yes',
        size: 100,
        initialValue: 65,
        currentValue: 70,
        avgPrice: 0.65,
        percentPnl: 7.7,
        icon: 'https://example.com/icon.png',
      };

      setupPredictMarketDetailsTest(
        { status: 'open' },
        {},
        { positions: { positions: [mockPosition] } },
      );

      // Switch to Positions tab (index 0 when positions exist)
      const positionsTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-0',
      );
      fireEvent.press(positionsTab);

      expect(screen.getByText('predict.cash_out')).toBeOnTheScreen();
      expect(
        screen.getByText('$65.00 on Yes to win $100.00', {
          exact: false,
        }),
      ).toBeOnTheScreen();
      expect(screen.getByText('+7.69%')).toBeOnTheScreen();
    });

    it('renders position with negative PnL correctly', () => {
      const mockPosition = {
        id: 'position-1',
        outcomeId: 'outcome-1',
        outcome: 'Yes',
        title: 'Yes',
        size: 100,
        initialValue: 65,
        currentValue: 60,
        avgPrice: 0.65,
        percentPnl: -7.7,
        icon: null, // Test branch without icon
      };

      setupPredictMarketDetailsTest(
        { status: 'open' },
        {},
        { positions: { positions: [mockPosition] } },
      );

      // Switch to Positions tab (index 0 when positions exist)
      const positionsTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-0',
      );
      fireEvent.press(positionsTab);

      expect(screen.getByText('7.69%')).toBeOnTheScreen();
    });

    it('renders outcomes tab for multi-outcome markets', () => {
      const multiOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            status: 'open',
            tokens: [{ id: 'token-1', price: 0.4 }],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-2', price: 0.3 }],
            volume: 500000,
          },
          {
            id: 'outcome-3',
            title: 'Option C',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.3 }],
            volume: 300000,
          },
        ],
      });

      setupPredictMarketDetailsTest(multiOutcomeMarket);

      // Outcomes is the default tab when there are no positions
      expect(
        screen.getByTestId('predict-market-details-outcomes-tab'),
      ).toBeOnTheScreen();
    });

    it('does not render outcomes tab for single outcome markets', () => {
      const singleOutcomeMarket = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 0.65 }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(singleOutcomeMarket);

      // Should not render outcomes tab for single outcome
      expect(screen.queryByText('Outcomes')).not.toBeOnTheScreen();
    });

    it('renders current prediction section only for single outcome markets', () => {
      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.65 },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(singleOutcomeMarket);

      // The component now shows the percentage in the action buttons instead of a separate text
      const actionButtons = getActionButtons();
      const buttonLabels = actionButtons.map(getActionButtonText);

      expect(buttonLabels).toContain('•65¢');
    });

    it('renders action buttons only for single outcome markets', () => {
      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.65 },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(singleOutcomeMarket);

      const actionButtons = getActionButtons();
      const buttonLabels = actionButtons.map(getActionButtonText);

      expect(buttonLabels).toEqual(expect.arrayContaining(['•65¢', '•35¢']));
    });
  });

  describe('Data Processing Functions', () => {
    it('handles position with groupItemTitle correctly', () => {
      const mockMarket = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            groupItemTitle: 'Yes Option',
            tokens: [{ id: 'token-1', price: 0.65 }],
            volume: 1000000,
          },
        ],
      });

      const mockPosition = {
        id: 'position-1',
        outcomeId: 'outcome-1',
        outcome: 'Yes',
        title: 'Yes',
        size: 100,
        initialValue: 65,
        currentValue: 70,
        avgPrice: 0.65,
        percentPnl: 7.7,
      };

      setupPredictMarketDetailsTest(
        mockMarket,
        {},
        { positions: { positions: [mockPosition] } },
      );

      // Switch to Positions tab (index 0 when positions exist)
      const positionsTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-0',
      );
      fireEvent.press(positionsTab);

      expect(screen.getByText('Yes Option')).toBeOnTheScreen();
      expect(
        screen.getByText('$65.00 on Yes to win $100.00', {
          exact: false,
        }),
      ).toBeOnTheScreen();
    });

    it('handles position without groupItemTitle correctly', () => {
      const mockPosition = {
        id: 'position-1',
        outcomeId: 'outcome-1',
        outcome: 'Yes',
        title: 'Yes',
        size: 100,
        initialValue: 65,
        currentValue: 70,
        avgPrice: 0.65,
        percentPnl: 7.7,
      };

      setupPredictMarketDetailsTest(
        {},
        {},
        { positions: { positions: [mockPosition] } },
      );

      // Switch to Positions tab (index 0 when positions exist)
      const positionsTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-0',
      );
      fireEvent.press(positionsTab);

      expect(screen.getByText('Yes')).toBeOnTheScreen();
      expect(
        screen.getByText('$65.00 on Yes to win $100.00', {
          exact: false,
        }),
      ).toBeOnTheScreen();
    });

    it('handles zero percentage correctly', () => {
      const mockPosition = {
        id: 'position-1',
        outcomeId: 'outcome-1',
        outcome: 'Yes',
        title: 'Yes',
        size: 100,
        initialValue: 65,
        currentValue: 65,
        avgPrice: 0.65,
        percentPnl: 0,
      };

      setupPredictMarketDetailsTest(
        { status: 'open' },
        {},
        { positions: { positions: [mockPosition] } },
      );

      // Switch to Positions tab (index 0 when positions exist)
      const positionsTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-0',
      );
      fireEvent.press(positionsTab);

      expect(screen.getByText('0%')).toBeOnTheScreen();
    });
  });

  describe('Error Handling', () => {
    it('handles invalid timeframe change gracefully', () => {
      setupPredictMarketDetailsTest();

      // Component should render without errors even with invalid data
      expect(
        screen.getByTestId('predict-market-details-screen'),
      ).toBeOnTheScreen();
    });

    it('handles missing route params gracefully', () => {
      setupPredictMarketDetailsTest({}, { params: undefined });

      expect(
        screen.getByTestId('predict-market-details-screen'),
      ).toBeOnTheScreen();
    });

    it('handles market with missing outcome data', () => {
      const marketWithMissingData = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [], // Empty tokens array
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithMissingData);

      // Since this is a single outcome market with empty tokens, it should not render the current prediction
      // Instead, verify the market title is rendered
      expect(
        screen.getByText('Will Bitcoin reach $100k by end of 2024?'),
      ).toBeOnTheScreen();
    });

    it('handles market with undefined price correctly', () => {
      const marketWithUndefinedPrice = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: undefined },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithUndefinedPrice);

      // The component now shows 0% in the action buttons when price is undefined
      const yesButton = findActionButtonByPrice(0);
      const noButton = findActionButtonByPrice(100);

      expect(yesButton).toBeDefined();
      expect(noButton).toBeDefined();
    });
  });

  describe('Closed Market Functionality', () => {
    it('displays winning outcome when market is closed', () => {
      const closedMarket = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            groupItemTitle: 'Yes',
            tokens: [
              { id: 'token-1', price: 1.0 }, // Winning token
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'No',
            groupItemTitle: 'No',
            tokens: [
              { id: 'token-2', price: 0.0 }, // Losing token
            ],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(closedMarket);

      expect(
        screen.getByText('predict.market_details.market_ended_on'),
      ).toBeOnTheScreen();
    });

    it('renders claim button when market is closed', () => {
      const closedMarket = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 1.0 }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(
        closedMarket,
        {},
        {
          positions: {
            claimable: {
              positions: [
                {
                  id: 'position-1',
                  outcomeId: 'outcome-1',
                  outcome: 'Yes',
                  size: 10,
                  initialValue: 10,
                  currentValue: 12,
                  avgPrice: 0.5,
                  percentPnl: 20,
                },
              ],
            },
          },
        },
      );

      expect(
        screen.getByText('confirm.predict_claim.button_label'),
      ).toBeOnTheScreen();
    });

    it('handles claim button press', async () => {
      const mockClaim = jest.fn();
      const { usePredictClaim } = jest.requireMock(
        '../../hooks/usePredictClaim',
      );
      usePredictClaim.mockReturnValue({
        claim: mockClaim,
      });

      const closedMarket = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 1.0 }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(
        closedMarket,
        {},
        {
          positions: {
            claimable: {
              positions: [
                {
                  id: 'position-1',
                  outcomeId: 'outcome-1',
                  outcome: 'Yes',
                  size: 10,
                  initialValue: 10,
                  currentValue: 12,
                  avgPrice: 0.5,
                  percentPnl: 20,
                },
              ],
            },
          },
        },
      );

      const claimButton = screen.getByText(
        'confirm.predict_claim.button_label',
      );
      fireEvent.press(claimButton);

      expect(mockClaim).toHaveBeenCalled();
    });

    it('renders outcomes tab for closed markets', () => {
      const closedMarket = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 1.0 }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(closedMarket);

      // Outcomes is the default tab when there are no positions
      expect(
        screen.getAllByTestId('predict-market-outcome').length,
      ).toBeGreaterThan(0);
    });

    it('sets timeframe to MAX when market is closed', () => {
      const closedMarket = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 1.0 }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(closedMarket);

      // Verify the component renders without errors
      expect(
        screen.getByTestId('predict-market-details-screen'),
      ).toBeOnTheScreen();
    });

    it('finds winning outcome token when market is closed', () => {
      const closedMarket = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            groupItemTitle: 'Yes',
            tokens: [
              { id: 'token-1', price: 1.0 }, // Winning token
            ],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(closedMarket);

      expect(
        screen.getByText('predict.market_details.market_ended_on'),
      ).toBeOnTheScreen();
    });

    it('handles market without winning token', () => {
      const closedMarket = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', price: 0.5 }, // No winning token
            ],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(closedMarket);

      // Should not display winning outcome message
      expect(
        screen.queryByText('predict.market_details.market_ended_on'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Winning Outcome Logic', () => {
    it('finds winning outcome from multiple outcomes', () => {
      const marketWithWinningOutcome = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            tokens: [{ id: 'token-1', price: 0.3 }],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            tokens: [
              { id: 'token-2', price: 1.0 }, // Winning token
            ],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithWinningOutcome);

      expect(
        screen.getByText('predict.market_details.market_ended_on'),
      ).toBeOnTheScreen();
    });

    it('handles winning outcome with multiple tokens', () => {
      const marketWithMultipleTokens = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            groupItemTitle: 'Yes',
            tokens: [
              { id: 'token-1', price: 0.5 },
              { id: 'token-2', price: 1.0 }, // Winning token
            ],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithMultipleTokens);

      expect(
        screen.getByText('predict.market_details.market_ended_on'),
      ).toBeOnTheScreen();
    });
  });

  describe('Additional Branch Coverage', () => {
    it('renders position icon when available', () => {
      const mockPosition = {
        id: 'position-1',
        outcomeId: 'outcome-1',
        outcome: 'Yes',
        size: 100,
        initialValue: 65,
        currentValue: 70,
        avgPrice: 0.65,
        percentPnl: 7.7,
        icon: 'https://example.com/icon.png',
      };

      setupPredictMarketDetailsTest(
        { status: 'open' },
        {},
        { positions: { positions: [mockPosition] } },
      );

      // Switch to Positions tab (index 0 when positions exist)
      const positionsTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-0',
      );
      fireEvent.press(positionsTab);

      // Verify the position section renders with icon
      expect(screen.getByText('predict.cash_out')).toBeOnTheScreen();
    });

    it('handles chart color selection for single outcome', () => {
      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            status: 'open',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.65 },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(singleOutcomeMarket);

      // Verify chart renders for single outcome
      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });

    it('handles chart color selection for multiple outcomes', () => {
      const multiOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            status: 'open',
            tokens: [{ id: 'token-1', price: 0.4 }],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-2', price: 0.3 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(multiOutcomeMarket);

      // Verify chart renders for multiple outcomes
      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });

    it('handles outcome without tokens correctly', () => {
      const marketWithoutTokens = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            // No tokens property
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithoutTokens);

      expect(
        screen.getByText('Will Bitcoin reach $100k by end of 2024?'),
      ).toBeOnTheScreen();
    });

    it('handles fidelity selection for different timeframes', () => {
      setupPredictMarketDetailsTest();

      // Component should handle different fidelity settings based on timeframe
      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });

    it('handles empty price histories array', () => {
      setupPredictMarketDetailsTest(
        {},
        {},
        { priceHistory: { priceHistories: [] } },
      );

      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });

    it('handles errors in price history', () => {
      setupPredictMarketDetailsTest(
        {},
        {},
        { priceHistory: { errors: ['Network error'] } },
      );

      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });

    describe('Price history fidelity adjustments', () => {
      const BASE_TIMESTAMP = 1_700_000_000_000;
      const SHORT_RANGE_FIDELITY = 240;
      const MAX_DEFAULT_FIDELITY = 1440;

      const buildPriceHistory = (deltaMs: number) => [
        [
          { timestamp: BASE_TIMESTAMP, price: 0.5 },
          { timestamp: BASE_TIMESTAMP + deltaMs, price: 0.6 },
        ],
        [],
      ];

      it('requests higher fidelity when MAX history span is shorter than a month', async () => {
        const shortRangeHistory = buildPriceHistory(12 * 60 * 60 * 1000); // 12 hours

        setupPredictMarketDetailsTest(
          { status: 'closed' },
          {},
          { priceHistory: { priceHistories: shortRangeHistory } },
        );

        const { usePredictPriceHistory } = jest.requireMock(
          '../../hooks/usePredictPriceHistory',
        );

        await waitFor(() => {
          const maxCalls = usePredictPriceHistory.mock.calls.filter(
            (call: [UsePredictPriceHistoryOptions]) =>
              call[0]?.interval === PredictPriceHistoryInterval.MAX,
          );
          expect(maxCalls.length).toBeGreaterThan(0);
          expect(
            maxCalls.some(
              (call: [UsePredictPriceHistoryOptions]) =>
                call[0]?.fidelity === SHORT_RANGE_FIDELITY,
            ),
          ).toBe(true);
        });
      });

      it('keeps default MAX fidelity when history span exceeds the threshold', async () => {
        const longRangeHistory = buildPriceHistory(45 * 24 * 60 * 60 * 1000); // 45 days

        setupPredictMarketDetailsTest(
          { status: 'closed' },
          {},
          { priceHistory: { priceHistories: longRangeHistory } },
        );

        const { usePredictPriceHistory } = jest.requireMock(
          '../../hooks/usePredictPriceHistory',
        );

        await waitFor(() => {
          const maxCalls = usePredictPriceHistory.mock.calls.filter(
            (call: [UsePredictPriceHistoryOptions]) =>
              call[0]?.interval === PredictPriceHistoryInterval.MAX,
          );
          expect(maxCalls.length).toBeGreaterThan(0);
          expect(
            maxCalls.every(
              (call: [UsePredictPriceHistoryOptions]) =>
                call[0]?.fidelity === MAX_DEFAULT_FIDELITY,
            ),
          ).toBe(true);
        });
      });
    });

    it('handles no balance scenario for Yes button', () => {
      const { usePredictBalance } = jest.requireMock(
        '../../hooks/usePredictBalance',
      );
      usePredictBalance.mockReturnValue({
        hasNoBalance: true,
      });

      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.65 },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      const { mockNavigate } =
        setupPredictMarketDetailsTest(singleOutcomeMarket);

      const yesButton = findActionButtonByPrice(65);
      expect(yesButton).toBeDefined();
      fireEvent.press(yesButton as ReactTestInstance);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
      });
    });

    it('handles no balance scenario for No button', () => {
      const { usePredictBalance } = jest.requireMock(
        '../../hooks/usePredictBalance',
      );
      usePredictBalance.mockReturnValue({
        hasNoBalance: true,
      });

      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.65 },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      const { mockNavigate } =
        setupPredictMarketDetailsTest(singleOutcomeMarket);

      const noButton = findActionButtonByPrice(35);
      expect(noButton).toBeDefined();
      fireEvent.press(noButton as ReactTestInstance);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
      });
    });

    it('navigates to unavailable modal when user is not eligible - Yes button', () => {
      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.65 },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      const { mockNavigate } = setupPredictMarketDetailsTest(
        singleOutcomeMarket,
        {},
        { eligibility: { isEligible: false } },
      );

      const yesButton = findActionButtonByPrice(65);
      expect(yesButton).toBeDefined();
      fireEvent.press(yesButton as ReactTestInstance);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });
    });

    it('navigates to unavailable modal when user is not eligible - No button', () => {
      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.65 },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      const { mockNavigate } = setupPredictMarketDetailsTest(
        singleOutcomeMarket,
        {},
        { eligibility: { isEligible: false } },
      );

      const noButton = findActionButtonByPrice(35);
      expect(noButton).toBeDefined();
      fireEvent.press(noButton as ReactTestInstance);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });
    });

    it('checks eligibility before balance for Yes button', () => {
      const { usePredictBalance } = jest.requireMock(
        '../../hooks/usePredictBalance',
      );
      usePredictBalance.mockReturnValue({
        hasNoBalance: true,
      });

      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.65 },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      const { mockNavigate } = setupPredictMarketDetailsTest(
        singleOutcomeMarket,
        {},
        { eligibility: { isEligible: false } },
      );

      const yesButton = findActionButtonByPrice(65);
      expect(yesButton).toBeDefined();
      fireEvent.press(yesButton as ReactTestInstance);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.PREDICT.MODALS.ROOT,
        {
          screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
        },
      );
    });

    it('checks eligibility before balance for No button', () => {
      const { usePredictBalance } = jest.requireMock(
        '../../hooks/usePredictBalance',
      );
      usePredictBalance.mockReturnValue({
        hasNoBalance: true,
      });

      const singleOutcomeMarket = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.65 },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      const { mockNavigate } = setupPredictMarketDetailsTest(
        singleOutcomeMarket,
        {},
        { eligibility: { isEligible: false } },
      );

      const noButton = findActionButtonByPrice(35);
      expect(noButton).toBeDefined();
      fireEvent.press(noButton as ReactTestInstance);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.PREDICT.MODALS.ROOT,
        {
          screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
        },
      );
    });
  });

  describe('Closed Market Tab Selection', () => {
    it('defaults to Outcomes tab when market is closed and no tab is selected', () => {
      const closedMarket = createMockMarket({
        status: 'closed',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            groupItemTitle: 'Yes Outcome',
            status: 'closed',
            tokens: [
              { id: 't1', price: 1, title: 'Yes' },
              { id: 't2', price: 0, title: 'No' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'No',
            groupItemTitle: 'No Outcome',
            status: 'closed',
            tokens: [
              { id: 't3', price: 0, title: 'Yes' },
              { id: 't4', price: 1, title: 'No' },
            ],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(closedMarket);

      expect(
        screen.getByTestId('predict-market-details-outcomes-tab'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Yes Outcome')).toBeOnTheScreen();
      expect(screen.getByText('No Outcome')).toBeOnTheScreen();
    });

    it('keeps user-selected About tab on closed market', () => {
      const closedMarket = createMockMarket({
        status: 'closed',
      });

      setupPredictMarketDetailsTest(closedMarket);

      const aboutTab = screen.getByTestId(
        'predict-market-details-tab-bar-tab-1',
      );
      fireEvent.press(aboutTab);

      expect(
        screen.getByText('predict.market_details.volume'),
      ).toBeOnTheScreen();
    });

    it('resets to Outcomes when selected tab becomes invalid after tabs change on closed market', async () => {
      const closedMarket = createMockMarket({
        status: 'closed',
      });

      const { rerender } = setupPredictMarketDetailsTest(
        closedMarket,
        {},
        {
          positions: {
            positions: [
              {
                id: 'position-1',
                outcomeId: 'outcome-1',
                outcome: 'Yes',
                size: 1,
                initialValue: 1,
                currentValue: 1,
                avgPrice: 1,
                percentPnl: 0,
              },
            ],
          },
        },
      );

      const aboutTabWithPositions = screen.getByTestId(
        'predict-market-details-tab-bar-tab-2',
      );
      fireEvent.press(aboutTabWithPositions);

      const { usePredictPositions } = jest.requireMock(
        '../../hooks/usePredictPositions',
      );
      usePredictPositions.mockReturnValue({
        positions: [],
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: jest.fn(),
      });

      rerender(<PredictMarketDetails />);

      await waitFor(() => {
        expect(
          screen.queryByText('predict.market_details.volume'),
        ).not.toBeOnTheScreen();
        expect(
          screen.getByTestId('predict-market-details-outcomes-tab'),
        ).toBeOnTheScreen();
      });
    });
  });

  describe('Multiple Open Outcomes Partially Resolved', () => {
    it('renders expandable resolved outcomes section when market has multiple outcomes with some resolved', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won' },
              { id: 'token-2', price: 0.0, title: 'Lost' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      expect(screen.getByText('predict.resolved_outcomes')).toBeOnTheScreen();
    });

    it('renders chart when market has open outcomes despite partial resolution', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won' },
              { id: 'token-2', price: 0.0, title: 'Lost' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });

    it('displays resolved outcomes count badge', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won' },
              { id: 'token-2', price: 0.0, title: 'Lost' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      expect(screen.getByText('1')).toBeOnTheScreen();
    });

    it('expands to show closed outcomes when pressable is pressed', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A Long Title That Should Be Truncated',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won' },
              { id: 'token-2', price: 0.0, title: 'Lost' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      const arrowDownIcon = screen.getByTestId('icon-ArrowDown');
      const pressable = arrowDownIcon.parent?.parent;

      if (pressable) {
        fireEvent.press(pressable);

        expect(
          screen.getByText('Option A Long Title That Should Be Truncated'),
        ).toBeOnTheScreen();
      }
    });

    it('displays groupItemTitle with truncation when expanded', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle:
              'Very Long Outcome Title That Exceeds One Line And Should Be Truncated',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won' },
              { id: 'token-2', price: 0.0, title: 'Lost' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      const arrowDownIcon = screen.getByTestId('icon-ArrowDown');
      const pressable = arrowDownIcon.parent?.parent;

      if (pressable) {
        fireEvent.press(pressable);

        const groupItemTitle = screen.getByText(
          'Very Long Outcome Title That Exceeds One Line And Should Be Truncated',
        );
        expect(groupItemTitle).toBeOnTheScreen();
        expect(groupItemTitle.props.numberOfLines).toBe(1);
        expect(groupItemTitle.props.ellipsizeMode).toBe('tail');
      }
    });

    it('displays volume for closed outcomes when expanded', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won' },
              { id: 'token-2', price: 0.0, title: 'Lost' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      const arrowDownIcon = screen.getByTestId('icon-ArrowDown');
      const pressable = arrowDownIcon.parent?.parent;

      if (pressable) {
        fireEvent.press(pressable);

        expect(screen.getByText(/1,000,000/)).toBeOnTheScreen();
        expect(
          screen.getByText(/predict\.volume_abbreviated/),
        ).toBeOnTheScreen();
      }
    });

    it('displays winning token title when token prices differ', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 0.8, title: 'Winner' },
              { id: 'token-2', price: 0.2, title: 'Loser' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      const arrowDownIcon = screen.getByTestId('icon-ArrowDown');
      const pressable = arrowDownIcon.parent?.parent;

      if (pressable) {
        fireEvent.press(pressable);

        expect(screen.getByText('Winner')).toBeOnTheScreen();
      }
    });

    it('displays draw when token prices are equal', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 0.5, title: 'Token A' },
              { id: 'token-2', price: 0.5, title: 'Token B' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      const arrowDownIcon = screen.getByTestId('icon-ArrowDown');
      const pressable = arrowDownIcon.parent?.parent;

      if (pressable) {
        fireEvent.press(pressable);

        expect(screen.getByText('predict.outcome_draw')).toBeOnTheScreen();
      }
    });

    it('displays ArrowDown icon when collapsed', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won' },
              { id: 'token-2', price: 0.0, title: 'Lost' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      expect(screen.getByTestId('icon-ArrowDown')).toBeOnTheScreen();
    });

    it('displays ArrowUp icon when expanded', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won' },
              { id: 'token-2', price: 0.0, title: 'Lost' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      const arrowDownIcon = screen.getByTestId('icon-ArrowDown');
      const pressable = arrowDownIcon.parent?.parent;

      if (pressable) {
        fireEvent.press(pressable);

        expect(screen.getByTestId('icon-ArrowUp')).toBeOnTheScreen();
      }
    });

    it('collapses when pressable is pressed again', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won' },
              { id: 'token-2', price: 0.0, title: 'Lost' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      const arrowDownIcon = screen.getByTestId('icon-ArrowDown');
      const pressable = arrowDownIcon.parent?.parent;

      if (pressable) {
        fireEvent.press(pressable);
        expect(screen.getByText('Option A')).toBeOnTheScreen();

        const arrowUpIcon = screen.getByTestId('icon-ArrowUp');
        const pressableAgain = arrowUpIcon.parent?.parent;
        if (pressableAgain) {
          fireEvent.press(pressableAgain);
          expect(screen.queryByText('Option A')).not.toBeOnTheScreen();
          expect(screen.getByTestId('icon-ArrowDown')).toBeOnTheScreen();
        }
      }
    });

    it('displays open outcomes below resolved outcomes section', () => {
      const marketWithPartialResolution = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won' },
              { id: 'token-2', price: 0.0, title: 'Lost' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-3', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithPartialResolution);

      expect(screen.getByText('Option B')).toBeOnTheScreen();
    });

    it('handles multiple closed outcomes in expanded section', () => {
      const marketWithMultipleResolved = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-1', price: 1.0, title: 'Won A' },
              { id: 'token-2', price: 0.0, title: 'Lost A' },
            ],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'closed',
            resolutionStatus: 'resolved',
            tokens: [
              { id: 'token-3', price: 0.7, title: 'Won B' },
              { id: 'token-4', price: 0.3, title: 'Lost B' },
            ],
            volume: 500000,
          },
          {
            id: 'outcome-3',
            title: 'Option C',
            groupItemTitle: 'Option C',
            status: 'open',
            tokens: [{ id: 'token-5', price: 0.5 }],
            volume: 300000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithMultipleResolved);

      expect(screen.getByText('2')).toBeOnTheScreen();

      const arrowDownIcon = screen.getByTestId('icon-ArrowDown');
      const pressable = arrowDownIcon.parent?.parent;

      if (pressable) {
        fireEvent.press(pressable);

        expect(screen.getByText('Option A')).toBeOnTheScreen();
        expect(screen.getByText('Option B')).toBeOnTheScreen();
      }
    });

    it('does not render resolved outcomes section when market has no resolved outcomes', () => {
      const marketWithoutResolved = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Option A',
            groupItemTitle: 'Option A',
            status: 'open',
            tokens: [{ id: 'token-1', price: 0.5 }],
            volume: 1000000,
          },
          {
            id: 'outcome-2',
            title: 'Option B',
            groupItemTitle: 'Option B',
            status: 'open',
            tokens: [{ id: 'token-2', price: 0.5 }],
            volume: 500000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithoutResolved);

      expect(
        screen.queryByText('predict.resolved_outcomes'),
      ).not.toBeOnTheScreen();
      expect(screen.getByTestId('predict-details-chart')).toBeOnTheScreen();
    });
  });

  describe('Real-time Price Updates', () => {
    it('calls usePredictPrices hook for open markets', () => {
      const { usePredictPrices } = jest.requireMock(
        '../../hooks/usePredictPrices',
      );

      const marketWithTokens = createMockMarket({
        status: 'open',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 0.65 }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithTokens);

      expect(usePredictPrices).toHaveBeenCalled();
    });

    it('handles usePredictPrices hook being called', () => {
      const { usePredictPrices } = jest.requireMock(
        '../../hooks/usePredictPrices',
      );

      setupPredictMarketDetailsTest();

      expect(usePredictPrices).toHaveBeenCalled();
    });

    it('uses usePredictPrices hook with providerId', () => {
      const { usePredictPrices } = jest.requireMock(
        '../../hooks/usePredictPrices',
      );

      setupPredictMarketDetailsTest();

      expect(usePredictPrices).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: 'polymarket',
        }),
      );
    });

    it('handles price fetching errors gracefully', () => {
      const { usePredictPrices } = jest.requireMock(
        '../../hooks/usePredictPrices',
      );

      usePredictPrices.mockReturnValue({
        prices: { providerId: '', results: [] },
        isFetching: false,
        error: new Error('Failed to fetch prices'),
        refetch: jest.fn(),
      });

      setupPredictMarketDetailsTest();

      expect(
        screen.getByTestId('predict-market-details-screen'),
      ).toBeOnTheScreen();
    });
  });

  describe('Fee Exemption Display', () => {
    it('displays fee exemption message when market has Middle East tag', () => {
      const marketWithMiddleEastTag = createMockMarket({
        status: 'open',
        tags: ['Middle East'],
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.65 },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithMiddleEastTag);

      expect(
        screen.getByText('predict.market_details.fee_exemption'),
      ).toBeOnTheScreen();
    });

    it('hides fee exemption message when market does not have Middle East tag', () => {
      const marketWithoutMiddleEastTag = createMockMarket({
        status: 'open',
        tags: ['Sports', 'Politics'],
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.65 },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithoutMiddleEastTag);

      expect(
        screen.queryByText('predict.market_details.fee_exemption'),
      ).not.toBeOnTheScreen();
    });

    it('hides fee exemption message when market has no tags', () => {
      const marketWithoutTags = createMockMarket({
        status: 'open',
        tags: [],
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.65 },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithoutTags);

      expect(
        screen.queryByText('predict.market_details.fee_exemption'),
      ).not.toBeOnTheScreen();
    });

    it('hides fee exemption message when market tags property is undefined', () => {
      const marketWithUndefinedTags = createMockMarket({
        status: 'open',
        tags: undefined,
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.65 },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithUndefinedTags);

      expect(
        screen.queryByText('predict.market_details.fee_exemption'),
      ).not.toBeOnTheScreen();
    });

    it('displays fee exemption message when Middle East tag exists among multiple tags', () => {
      const marketWithMultipleTags = createMockMarket({
        status: 'open',
        tags: ['Politics', 'Middle East', 'International'],
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.65 },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(marketWithMultipleTags);

      expect(
        screen.getByText('predict.market_details.fee_exemption'),
      ).toBeOnTheScreen();
    });

    it('displays fee exemption message when market is closed with Middle East tag', () => {
      const closedMarketWithMiddleEastTag = createMockMarket({
        status: 'closed',
        tags: ['Middle East'],
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [{ id: 'token-1', price: 1.0 }],
            volume: 1000000,
          },
        ],
      });

      setupPredictMarketDetailsTest(closedMarketWithMiddleEastTag);

      // Note: The component currently shows the fee exemption message for closed markets
      // if they have the Middle East tag. This behavior matches the current implementation.
      expect(
        screen.getByText('predict.market_details.fee_exemption'),
      ).toBeOnTheScreen();
    });

    it('removes fee exemption message when market updates without Middle East tag', async () => {
      const { usePredictMarket } = jest.requireMock(
        '../../hooks/usePredictMarket',
      );

      const marketWithMiddleEastTag = createMockMarket({
        status: 'open',
        tags: ['Middle East', 'Politics'],
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.65 },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      const { rerender } = setupPredictMarketDetailsTest(
        marketWithMiddleEastTag,
      );

      expect(
        screen.getByText('predict.market_details.fee_exemption'),
      ).toBeOnTheScreen();

      const marketWithoutMiddleEastTag = createMockMarket({
        status: 'open',
        tags: ['Politics'],
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.65 },
              { id: 'token-2', title: 'No', price: 0.35 },
            ],
            volume: 1000000,
          },
        ],
      });

      usePredictMarket.mockReturnValue({
        market: marketWithoutMiddleEastTag,
        isFetching: false,
        refetch: jest.fn(),
      });

      rerender(<PredictMarketDetails />);

      await waitFor(() => {
        expect(
          screen.queryByText('predict.market_details.fee_exemption'),
        ).not.toBeOnTheScreen();
      });
    });
  });
});
