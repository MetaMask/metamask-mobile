import { DiscountType } from '@metamask/bridge-controller';
import {
  NavigationProp,
  RouteProp,
  StackActions,
} from '@react-navigation/native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  PredictOutcome,
  PredictPosition,
  PredictPositionStatus,
  PredictExecutionPreviewResult,
  PredictFees,
  Recurrence,
  Side,
  type OrderPreview,
} from '../../types';
import {
  createExecutablePredictExecutionResult,
  createPredictExecutionMetadata,
  createPredictExecutionPreview,
} from '../../testUtils/execution';
import { PredictNavigationParamList } from '../../types/navigation';
import PredictSellPreview from './PredictSellPreview';
import {
  PredictOrderRetryNoticeSelectorsIDs,
  PredictOrderRetrySheetSelectorsIDs,
} from '../../Predict.testIds';

import { POLYMARKET_PROVIDER_ID } from '../../providers/polymarket/constants';

jest.mock('../../selectors/featureFlags', () => {
  const feeCollection = {
    enabled: true,
    metamaskFee: 0.02,
    providerFee: 0.02,
  };

  return {
    ...jest.requireActual('../../selectors/featureFlags'),
    selectPredictFeeCollectionFlag: jest.fn(() => feeCollection),
  };
});

// Mock Engine for analytics tracking
jest.mock('../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackPredictOrderEvent: jest.fn(),
    },
  },
}));

// Mock React Native Alert API
const mockAlert = jest.fn();
jest.spyOn(Alert, 'alert').mockImplementation(mockAlert);

// Mock navigation hooks
const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
const mockUseNavigation = jest.fn();
const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockUseNavigation(),
  useRoute: () => mockUseRoute(),
}));

// Mock usePredictPlaceOrder hook - external API dependency
const mockPlaceOrder = jest.fn();
const mockReset = jest.fn();
let mockLoadingState = false;
let mockPlaceOrderResult: { success: boolean; response?: unknown } | null =
  null;
let mockPlaceOrderError: string | undefined;

interface PlaceOrderResult {
  success: boolean;
  txMeta: { id: string };
}

jest.mock('../../hooks/usePredictPlaceOrder', () => ({
  usePredictPlaceOrder: (options?: {
    onError?: (error: string) => void;
    onComplete?: (result: PlaceOrderResult) => void;
  }) => {
    const { onError, onComplete } = options || {};
    return {
      placeOrder: async (...args: unknown[]) => {
        mockLoadingState = true;
        try {
          const result = mockPlaceOrder(...args);
          mockLoadingState = false;
          if (onComplete && result) onComplete(result);
          return result;
        } catch (error) {
          mockLoadingState = false;
          if (onError && error instanceof Error) {
            onError(error.message);
          }
          throw error;
        }
      },
      isLoading: mockLoadingState,
      loading: mockLoadingState,
      result: mockPlaceOrderResult,
      error: mockPlaceOrderError,
      reset: mockReset,
      isOrderNotFilled: false,
      resetOrderNotFilled: jest.fn(),
    };
  },
}));

jest.mock('../../hooks/usePredictOrderRetry', () => ({
  usePredictOrderRetry: () => ({
    retrySheetRef: { current: null },
    retrySheetVariant: 'busy' as const,
    retryQuote: null,
    isRetrying: false,
    handleRetry: jest.fn(),
    handleRetryConfirm: jest.fn(),
  }),
}));

// Mock usePredictTrading — the pre-submit execution preview is an external
// controller dependency. usePredictSellExecution runs for real against it.
const mockPreviewExecutionOrder = jest.fn();

jest.mock('../../hooks/usePredictTrading', () => ({
  usePredictTrading: () => ({
    previewExecutionOrder: (...args: unknown[]) =>
      mockPreviewExecutionOrder(...args),
    placeOrder: jest.fn(),
    claim: jest.fn(),
    getBalance: jest.fn(),
    previewOrder: jest.fn(),
    prepareWithdraw: jest.fn(),
    deposit: jest.fn(),
    initPayWithAnyToken: jest.fn(),
  }),
}));

// Mock the component-library BottomSheet FILE module: the pre-submit execution
// sheet drives open/close through its ref, and the reanimated close animation
// callback never completes under fake timers. The folder-index mock in the
// global test setup does not intercept this direct file import.
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    const BottomSheet = ReactActual.forwardRef(
      (
        {
          children,
          onClose,
          onOpen,
        }: {
          children?: React.ReactNode;
          onClose?: (...args: unknown[]) => void;
          onOpen?: () => void;
        },
        ref: React.Ref<unknown>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onOpenDialog: () => onOpen?.(),
          onOpenBottomSheet: () => onOpen?.(),
          onCloseDialog: () => onClose?.(),
          onCloseBottomSheet: (callback?: () => void) => {
            onClose?.(Boolean(callback));
            callback?.();
          },
        }));
        return ReactActual.createElement(
          View,
          { testID: 'bottom-sheet' },
          children,
        );
      },
    );
    BottomSheet.displayName = 'BottomSheet';
    return { __esModule: true, default: BottomSheet };
  },
);

jest.mock('../../../shared/MembershipVipBadge/MembershipVipBadge', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return ({ hasProEntitlement }: { hasProEntitlement?: boolean }) =>
    hasProEntitlement
      ? ReactActual.createElement(
          Text,
          { testID: 'rewards-member-badge' },
          'Member',
        )
      : null;
});

jest.mock('../../hooks/usePredictRewards', () => ({
  usePredictRewards: jest.fn(() => ({
    shouldShowRewardsRow: false,
    accountOptedIn: false,
    rewardsAccountScope: null,
    estimatedPoints: null,
    isLoading: false,
    hasError: false,
  })),
}));

interface MockFees {
  metamaskFee: number;
  providerFee: number;
  marketFee: number;
  totalFee: number;
  totalFeePercentage: number;
  collector: string;
  executors: string[];
  permit2Enabled: boolean;
}

interface MockPreview {
  marketId: string;
  outcomeId: string;
  outcomeTokenId: string;
  timestamp: number;
  side: string;
  sharePrice: number;
  maxAmountSpent: number;
  minAmountReceived: number;
  slippage: number;
  tickSize: number;
  minOrderSize: number;
  negRisk: boolean;
  fees?: MockFees;
  originalFees?: MockFees;
  feePolicy?: {
    discountType: DiscountType;
    builderCode: string;
  };
}

const mockFees: MockFees = {
  metamaskFee: 1.8,
  providerFee: 0.6,
  marketFee: 0.3,
  totalFee: 2.4,
  totalFeePercentage: 4,
  collector: '0xCollector',
  executors: [],
  permit2Enabled: false,
};

// Mock usePredictOrderPreview hook - external API dependency
let mockPreview: MockPreview | null = {
  marketId: 'market-1',
  outcomeId: 'outcome-456',
  outcomeTokenId: 'outcome-token-789',
  timestamp: Date.now(),
  side: 'SELL',
  sharePrice: 0.5,
  maxAmountSpent: 100,
  minAmountReceived: 60,
  slippage: 0.005,
  tickSize: 0.01,
  minOrderSize: 1,
  negRisk: false,
  fees: mockFees,
};
let mockPreviewError: string | null = null;
let mockIsCalculating = false;
jest.mock('../../hooks/usePredictOrderPreview', () => ({
  usePredictOrderPreview: () => ({
    preview: mockPreview,
    isCalculating: mockIsCalculating,
    isLoading: mockPreview === null && !mockPreviewError && mockIsCalculating,
    error: mockPreviewError,
  }),
}));

const mockPosition: PredictPosition = {
  id: 'position-1',
  providerId: POLYMARKET_PROVIDER_ID,
  marketId: 'market-1',
  outcomeId: 'outcome-456',
  outcome: 'Yes',
  outcomeTokenId: 'outcome-token-789',
  title: 'Will Bitcoin reach $150,000?',
  icon: 'https://example.com/bitcoin.png',
  amount: 100,
  price: 0.5,
  status: PredictPositionStatus.OPEN,
  size: 50,
  outcomeIndex: 0,
  realizedPnl: 10,
  percentPnl: 20,
  cashPnl: 5,
  claimable: true,
  initialValue: 50,
  avgPrice: 0.5,
  currentValue: 60,
  endDate: '2024-12-31',
};

const mockOutcome: PredictOutcome = {
  id: 'outcome-123',
  providerId: POLYMARKET_PROVIDER_ID,
  marketId: 'market-123',
  title: 'Bitcoin Price Outcome',
  description: 'Outcome description',
  image: 'https://example.com/outcome.png',
  status: 'open',
  tokens: [
    {
      id: 'outcome-token-123',
      title: 'Yes',
      price: 0.5,
    },
  ],
  volume: 1000000,
  groupItemTitle: 'Bitcoin Price',
};

const mockMarket = {
  id: 'market-123',
  providerId: POLYMARKET_PROVIDER_ID,
  slug: 'bitcoin-price',
  title: 'Will Bitcoin reach $150,000?',
  description: 'Market description',
  image: 'https://example.com/market.png',
  status: 'open' as const,
  recurrence: Recurrence.NONE,
  category: 'crypto' as const,
  tags: ['blockchain', 'cryptocurrency'],
  outcomes: [mockOutcome],
  liquidity: 1000000,
  volume: 1000000,
};

const mockRoute: RouteProp<PredictNavigationParamList, 'PredictSellPreview'> = {
  key: 'PredictSellPreview-key',
  name: 'PredictSellPreview',
  params: {
    market: mockMarket,
    position: mockPosition,
    outcome: mockOutcome,
  },
};

const mockNavigation: NavigationProp<PredictNavigationParamList> = {
  goBack: mockGoBack,
  dispatch: mockDispatch,
  navigate: jest.fn(),
  navigateDeprecated: jest.fn(),
  preload: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  replaceParams: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  canGoBack: jest.fn(),
  isFocused: jest.fn(),
  getParent: jest.fn(),
  getState: jest.fn(),
  getId: jest.fn(),
};

const executionFees: PredictFees = {
  metamaskFee: 0.09,
  providerFee: 0.03,
  marketFee: 0.06,
  totalFee: 0.18,
  totalFeePercentage: 2,
  collector: '0x0000000000000000000000000000000000000000',
  executors: [],
  permit2Enabled: false,
};

/** Fresh execution preview returned by the pre-submit validation flow. */
const createExecutionPreview = (
  overrides?: Partial<OrderPreview>,
): OrderPreview =>
  createPredictExecutionPreview({
    outcomeId: 'outcome-456',
    outcomeTokenId: 'outcome-token-789',
    timestamp: Date.now(),
    maxAmountSpent: 100,
    minAmountReceived: 49,
    fees: executionFees,
    ...overrides,
  });

const createExecutionMetadata = (
  overrides: Parameters<typeof createPredictExecutionMetadata>[0] = {},
) =>
  createPredictExecutionMetadata({
    requestedSize: 100,
    executableSize: 100,
    bandFloorPrice: 0.475,
    ...overrides,
  });

const createExecutableResult = (overrides?: {
  preview?: OrderPreview;
  execution?: ReturnType<typeof createExecutionMetadata>;
}) =>
  createExecutablePredictExecutionResult({
    preview: overrides?.preview ?? createExecutionPreview(),
    execution: overrides?.execution ?? createExecutionMetadata(),
  });

function createDeferred<T>() {
  let resolveDeferred!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolveDeferred = res;
  });
  return { promise, resolve: resolveDeferred };
}

/**
 * Drains the resolved-promise microtask chain of a pre-submit flow
 * (fetch → classify → submit → settle) inside an act block.
 */
const flushMicrotasks = (rounds = 10): Promise<void> =>
  rounds === 0
    ? Promise.resolve()
    : Promise.resolve().then(() => flushMicrotasks(rounds - 1));

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictSellPreview', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock values to defaults
    mockPreview = {
      marketId: 'market-1',
      outcomeId: 'outcome-456',
      outcomeTokenId: 'outcome-token-789',
      timestamp: Date.now(),
      side: 'SELL',
      sharePrice: 0.5,
      maxAmountSpent: 100,
      minAmountReceived: 60,
      slippage: 0.005,
      tickSize: 0.01,
      minOrderSize: 1,
      negRisk: false,
      fees: mockFees,
    };
    mockPreviewError = null;
    mockIsCalculating = false;
    mockLoadingState = false;
    mockPlaceOrderResult = null;
    mockPlaceOrderError = undefined;

    // Setup default navigation mocks
    mockUseNavigation.mockReturnValue(mockNavigation);
    mockUseRoute.mockReturnValue(mockRoute);

    // Reset mock functions
    mockPlaceOrder.mockReset();
    // The pre-submit flow reads the placement outcome; default to success.
    mockPlaceOrder.mockReturnValue({ status: 'success' });
    mockPreviewExecutionOrder.mockReset();
    mockReset.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('shows cash out heading with market title and share details', () => {
      const { getAllByText, getByText, queryByText } = renderWithProvider(
        <PredictSellPreview />,
        {
          state: initialState,
        },
      );

      expect(getAllByText('Cash out').length).toBeGreaterThan(0);
      expect(getByText('Will Bitcoin reach $150,000?')).toBeOnTheScreen();
      expect(getByText('$50 on Bitcoin Price • Yes at 50¢')).toBeOnTheScreen();
      expect(
        queryByText('Funds will be added to your available balance'),
      ).toBeOnTheScreen();
    });

    it('shows estimated net proceeds from the preview', () => {
      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(screen.getAllByText('$57.30')).toHaveLength(2);
    });

    it('shows P&L percentage calculated from net proceeds after fees', () => {
      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(screen.getByText('+$7.30 (14.6%)')).toBeOnTheScreen();
    });

    it('shows negative P&L when minAmountReceived is less than initial value', () => {
      mockPreview = {
        marketId: 'market-1',
        outcomeId: 'outcome-456',
        outcomeTokenId: 'outcome-token-789',
        timestamp: Date.now(),
        side: 'SELL',
        sharePrice: 0.5,
        maxAmountSpent: 100,
        minAmountReceived: 40,
        slippage: 0.005,
        tickSize: 0.01,
        minOrderSize: 1,
        negRisk: false,
      };
      const negativePnLPosition = {
        ...mockPosition,
        percentPnl: -20,
      };
      mockUseRoute.mockReturnValue({
        ...mockRoute,
        params: {
          position: negativePnLPosition,
        },
      });

      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(screen.getByText('-$10 (-20%)')).toBeOnTheScreen();
    });

    it('shows zero cents when preview sharePrice is zero', () => {
      mockPreview = {
        marketId: 'market-1',
        outcomeId: 'outcome-456',
        outcomeTokenId: 'outcome-token-789',
        timestamp: Date.now(),
        side: 'SELL',
        sharePrice: 0,
        maxAmountSpent: 100,
        minAmountReceived: 60,
        slippage: 0.005,
        tickSize: 0.01,
        minOrderSize: 1,
        negRisk: false,
      };

      const { getByText } = renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(getByText('Selling 50 shares at 0¢')).toBeOnTheScreen();
    });
  });

  describe('user interactions', () => {
    it('places the fresh execution preview when Cash Out is pressed', async () => {
      mockPlaceOrderResult = {
        success: true,
        response: { transactionHash: '0xabc123' },
      };
      // 0.49 is one tick worse than the displayed 0.50 — inside the
      // one-tick consent band, so the exact fresh preview auto-submits.
      const freshPreview = createExecutionPreview();
      mockPreviewExecutionOrder.mockResolvedValueOnce(
        createExecutableResult({ preview: freshPreview }),
      );
      const { getByTestId, rerender } = renderWithProvider(
        <PredictSellPreview />,
        {
          state: initialState,
        },
      );
      const cashOutButton = getByTestId('predict-sell-preview-cash-out-button');

      await act(async () => {
        fireEvent.press(cashOutButton);
        await flushMicrotasks();
      });

      // The pre-submit flow validates the displayed price against a live
      // order book before anything is signed.
      expect(mockPreviewExecutionOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          marketId: 'market-1',
          outcomeId: 'outcome-456',
          outcomeTokenId: 'outcome-token-789',
          side: 'SELL',
          size: 100,
          approvedPrice: 0.5,
          positionId: 'position-1',
        }),
      );
      // The exact fresh preview — not the polled preview — is submitted.
      expect(mockPlaceOrder).toHaveBeenCalledWith({
        analyticsProperties: expect.objectContaining({
          marketId: 'market-123',
          marketTitle: 'Will Bitcoin reach $150,000?',
          marketCategory: 'crypto',
          marketTags: expect.any(Array),
          entryPoint: 'predict_market_details',
          transactionType: 'mm_predict_sell',
          liquidity: 1000000,
          volume: 1000000,
          sharePrice: 0.5,
        }),
        preview: expect.objectContaining({
          marketId: 'market-1',
          outcomeId: 'outcome-456',
          outcomeTokenId: 'outcome-token-789',
          side: 'SELL',
          minAmountReceived: 49,
        }),
      });
      rerender(<PredictSellPreview />);

      expect(mockDispatch).toHaveBeenCalledWith(StackActions.pop());
    });

    it('shows loading text when order executes', () => {
      mockLoadingState = true;
      const { getByText } = renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(getByText('Cashing out...')).toBeOnTheScreen();
      mockLoadingState = false;
    });
  });

  describe('pre-submit execution flow', () => {
    const pressCashOut = () =>
      act(async () => {
        fireEvent.press(
          screen.getByTestId('predict-sell-preview-cash-out-button'),
        );
        await flushMicrotasks();
      });

    it('shows Cash Out loading immediately while the live book is fetched', async () => {
      const deferred = createDeferred<PredictExecutionPreviewResult>();
      mockPreviewExecutionOrder.mockReturnValueOnce(deferred.promise);

      const { getByTestId, getByText } = renderWithProvider(
        <PredictSellPreview />,
        {
          state: initialState,
        },
      );
      const cashOutButton = getByTestId('predict-sell-preview-cash-out-button');

      fireEvent.press(cashOutButton);

      // The CTA flips to loading before the fetch resolves.
      expect(getByText('Cashing out...')).toBeOnTheScreen();

      await act(async () => {
        deferred.resolve(createExecutableResult());
        await flushMicrotasks();
      });

      expect(mockPlaceOrder).toHaveBeenCalledTimes(1);
    });

    it('ignores a second Cash Out press while the flow is active', async () => {
      const deferred = createDeferred<PredictExecutionPreviewResult>();
      mockPreviewExecutionOrder.mockReturnValueOnce(deferred.promise);

      const { getByTestId } = renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });
      const cashOutButton = getByTestId('predict-sell-preview-cash-out-button');

      fireEvent.press(cashOutButton);
      fireEvent.press(cashOutButton);

      expect(mockPreviewExecutionOrder).toHaveBeenCalledTimes(1);

      await act(async () => {
        deferred.resolve(createExecutableResult());
        await flushMicrotasks();
      });

      expect(mockPreviewExecutionOrder).toHaveBeenCalledTimes(1);
      expect(mockPlaceOrder).toHaveBeenCalledTimes(1);
    });

    it('does not open the retry sheet when the fresh quote is acceptable', async () => {
      mockPreviewExecutionOrder.mockResolvedValueOnce(createExecutableResult());

      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      await pressCashOut();

      expect(mockPlaceOrder).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Price moved')).toBeNull();
      expect(screen.queryByText('No match')).toBeNull();
      expect(screen.queryByText('Market timed out')).toBeNull();
      expect(screen.queryByText('Price unavailable')).toBeNull();
    });

    it('shows the moved-price sheet with refreshed price, expected fill, proceeds, worst case, and fees', async () => {
      // 0.47 is three ticks worse than the displayed 0.50 but still inside
      // the 5% band: the exact fresh quote is shown for confirmation.
      const movedResult = createExecutableResult({
        preview: createExecutionPreview({
          sharePrice: 0.47,
          minAmountReceived: 47,
        }),
        execution: createExecutionMetadata({
          refreshedPrice: 0.47,
          worstExecutablePrice: 0.47,
        }),
      });
      mockPreviewExecutionOrder.mockResolvedValueOnce(movedResult);

      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      await pressCashOut();

      expect(screen.getByText('Price moved')).toBeOnTheScreen();
      expect(screen.getByText('47¢')).toBeOnTheScreen();
      expect(screen.getByText('Expected fill')).toBeOnTheScreen();
      expect(screen.getByText('100 shares')).toBeOnTheScreen();
      expect(screen.getByText('You receive')).toBeOnTheScreen();
      expect(screen.getByText('Worst case (5% band)')).toBeOnTheScreen();
      expect(screen.getByText('Fees')).toBeOnTheScreen();
      expect(screen.getByText('Yes, sell at 47¢')).toBeOnTheScreen();
      expect(mockPlaceOrder).not.toHaveBeenCalled();
    });

    it('renders the no-match sheet without submitting', async () => {
      mockPreviewExecutionOrder.mockResolvedValueOnce({
        status: 'no_match',
        execution: createExecutionMetadata({ executableSize: 40 }),
      });

      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      await pressCashOut();

      expect(screen.getByText('No match')).toBeOnTheScreen();
      expect(mockPlaceOrder).not.toHaveBeenCalled();
    });

    it('renders the timeout sheet distinct from unavailable', async () => {
      mockPreviewExecutionOrder.mockResolvedValueOnce({ status: 'timeout' });

      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      await pressCashOut();

      expect(screen.getByText('Market timed out')).toBeOnTheScreen();
      expect(screen.getByText(/Nothing was sold/)).toBeOnTheScreen();
      expect(screen.queryByText('Price unavailable')).toBeNull();
      expect(mockPlaceOrder).not.toHaveBeenCalled();
    });

    it('renders the unavailable sheet without submitting', async () => {
      mockPreviewExecutionOrder.mockResolvedValueOnce({
        status: 'unavailable',
      });

      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      await pressCashOut();

      expect(screen.getByText('Price unavailable')).toBeOnTheScreen();
      expect(mockPlaceOrder).not.toHaveBeenCalled();
    });

    it('keeps dismissal during the Confirm refetch and locks it while the order is placed', async () => {
      const movedResult = createExecutableResult({
        preview: createExecutionPreview({
          sharePrice: 0.47,
          minAmountReceived: 47,
        }),
        execution: createExecutionMetadata({
          refreshedPrice: 0.47,
          worstExecutablePrice: 0.47,
        }),
      });
      mockPreviewExecutionOrder.mockResolvedValueOnce(movedResult);

      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      await pressCashOut();

      expect(screen.getByText('Price moved')).toBeOnTheScreen();
      // Dismissal is available at the settled confirm state.
      expect(
        screen.getByTestId(PredictOrderRetrySheetSelectorsIDs.CLOSE_BUTTON),
      ).toBeOnTheScreen();

      // The Confirm refetch stays pending: the sheet keeps its candidate,
      // and the user can still leave because nothing is signed yet.
      const deferred = createDeferred<PredictExecutionPreviewResult>();
      mockPreviewExecutionOrder.mockReturnValueOnce(deferred.promise);
      const placement = createDeferred<{ status: 'success' }>();
      mockPlaceOrder.mockReturnValueOnce(placement.promise);
      await act(async () => {
        fireEvent.press(
          screen.getByTestId(PredictOrderRetrySheetSelectorsIDs.RETRY_BUTTON),
        );
      });

      expect(screen.getByText('Price moved')).toBeOnTheScreen();
      expect(screen.getByText('Expected fill')).toBeOnTheScreen();
      expect(
        screen.getByTestId(PredictOrderRetrySheetSelectorsIDs.CLOSE_BUTTON),
      ).toBeOnTheScreen();

      // The refetched quote matches the confirmed 0.47 baseline, so the
      // exact fresh preview is submitted. Dismissal is locked while the order
      // is placed, and the sheet closes once placement settles.
      const acceptedResult = createExecutableResult({
        preview: createExecutionPreview({
          sharePrice: 0.47,
          minAmountReceived: 47,
        }),
        execution: createExecutionMetadata({
          approvedPrice: 0.47,
          refreshedPrice: 0.47,
          worstExecutablePrice: 0.47,
        }),
      });
      await act(async () => {
        deferred.resolve(acceptedResult);
        await flushMicrotasks();
      });

      expect(mockPlaceOrder).toHaveBeenCalledTimes(1);
      const placedParams = mockPlaceOrder.mock.calls[0][0] as {
        preview: OrderPreview;
      };
      expect(placedParams.preview).toBe(acceptedResult.preview);
      expect(
        screen.queryByTestId(PredictOrderRetrySheetSelectorsIDs.CLOSE_BUTTON),
      ).toBeNull();

      await act(async () => {
        placement.resolve({ status: 'success' });
        await flushMicrotasks();
      });

      expect(screen.queryByText('Price moved')).toBeNull();
    });

    it('dismisses the moved-price sheet without submitting an order', async () => {
      const movedResult = createExecutableResult({
        preview: createExecutionPreview({
          sharePrice: 0.47,
          minAmountReceived: 47,
        }),
        execution: createExecutionMetadata({
          refreshedPrice: 0.47,
          worstExecutablePrice: 0.47,
        }),
      });
      mockPreviewExecutionOrder.mockResolvedValueOnce(movedResult);

      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      await pressCashOut();
      expect(mockPlaceOrder).not.toHaveBeenCalled();

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(PredictOrderRetrySheetSelectorsIDs.CLOSE_BUTTON),
        );
        await flushMicrotasks();
      });

      expect(mockPlaceOrder).not.toHaveBeenCalled();
    });

    it('offers Try later on no match that dismisses without submitting', async () => {
      mockPreviewExecutionOrder.mockResolvedValueOnce({
        status: 'no_match',
        execution: createExecutionMetadata({ executableSize: 40 }),
      });

      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      await pressCashOut();

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            PredictOrderRetrySheetSelectorsIDs.TRY_LATER_BUTTON,
          ),
        );
        await flushMicrotasks();
      });

      expect(mockPlaceOrder).not.toHaveBeenCalled();
    });
  });

  describe('preview loading and error states', () => {
    it('shows skeleton when preview is null', () => {
      mockPreview = null;
      mockIsCalculating = true;
      mockPreviewError = null;

      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(screen.queryByText('$60')).toBeNull();
    });

    it('falls back to estimated net value when preview has error', () => {
      mockPreview = null;
      mockPreviewError = 'Failed to fetch preview';
      mockIsCalculating = false;

      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(screen.getByText('$57.60')).toBeOnTheScreen();
      expect(screen.getByText('+$7.60 (15.2%)')).toBeOnTheScreen();
    });

    it('disables Cash Out while the latest preview poll has failed', () => {
      mockPreviewError = 'Not enough liquidity';
      mockIsCalculating = false;

      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(screen.getByText('Not enough liquidity')).toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-sell-preview-cash-out-button'),
      ).toBeDisabled();
    });

    it('displays preview error message when preview fails', () => {
      mockPreview = null;
      mockPreviewError = 'Network error: Unable to fetch preview data';
      mockIsCalculating = false;

      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(
        screen.getByText('Network error: Unable to fetch preview data'),
      ).toBeOnTheScreen();
    });

    it('calculates PnL from estimated net value when preview has error', () => {
      mockPreview = null;
      mockPreviewError = 'Preview unavailable';
      mockIsCalculating = false;

      const positionWithDifferentValue = {
        ...mockPosition,
        initialValue: 100,
        currentValue: 150,
        percentPnl: 50,
        cashPnl: 50,
      };

      mockUseRoute.mockReturnValue({
        ...mockRoute,
        params: {
          ...mockRoute.params,
          position: positionWithDifferentValue,
        },
      });

      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(screen.getByText('$144')).toBeOnTheScreen();
      expect(screen.getByText('+$44 (44%)')).toBeOnTheScreen();
    });
  });

  describe('navigation after successful order', () => {
    it('dispatches navigation pop action when placeOrder succeeds', async () => {
      mockPlaceOrderResult = {
        success: true,
        response: { transactionHash: '0xabc123' },
      };
      mockPreviewExecutionOrder.mockResolvedValueOnce(createExecutableResult());
      const { getByTestId, rerender } = renderWithProvider(
        <PredictSellPreview />,
        {
          state: initialState,
        },
      );
      const cashOutButton = getByTestId('predict-sell-preview-cash-out-button');

      await act(async () => {
        fireEvent.press(cashOutButton);
        await flushMicrotasks();
      });

      expect(mockPlaceOrder).toHaveBeenCalled();
      rerender(<PredictSellPreview />);

      expect(mockDispatch).toHaveBeenCalledWith(StackActions.pop());
    });

    it('reads market and position data from route params', () => {
      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(mockUseRoute).toHaveBeenCalled();
      expect(
        screen.getByText('Will Bitcoin reach $150,000?'),
      ).toBeOnTheScreen();
    });
  });

  describe('sheet mode', () => {
    const sheetContentProps = {
      mode: 'sheet' as const,
      market: mockMarket,
      position: mockPosition,
      outcome: mockOutcome,
      onClose: jest.fn(),
    };

    beforeEach(() => {
      sheetContentProps.onClose = jest.fn();
    });

    it('hides BottomSheetHeader in sheet mode', () => {
      renderWithProvider(<PredictSellPreview {...sheetContentProps} />, {
        state: initialState,
      });

      const cashOutTexts = screen.getAllByText('Cash out');
      expect(cashOutTexts.length).toBe(1);
    });

    it('renders the cash-out amount at the DisplayLg size in sheet mode', () => {
      renderWithProvider(<PredictSellPreview {...sheetContentProps} />, {
        state: initialState,
      });

      const amount = screen.getAllByText('$57.30')[0];
      // DisplayLg: 40px / 50px, medium weight.
      expect(amount).toHaveStyle({
        fontSize: 40,
        lineHeight: 50,
        fontFamily: 'Inter-Medium',
      });
      expect(screen.getByText('+$7.30 (14.6%)')).toBeOnTheScreen();
    });

    it('hides position icon row in sheet mode', () => {
      renderWithProvider(<PredictSellPreview {...sheetContentProps} />, {
        state: initialState,
      });

      expect(
        screen.queryByText('Will Bitcoin reach $150,000?'),
      ).not.toBeOnTheScreen();
    });

    it('calls onClose on successful result in sheet mode', () => {
      mockPlaceOrderResult = {
        success: true,
        response: { transactionHash: '0xabc123' },
      };

      renderWithProvider(<PredictSellPreview {...sheetContentProps} />, {
        state: initialState,
      });

      expect(sheetContentProps.onClose).toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalledWith(StackActions.pop());
    });

    it('shows skeleton in sheet mode when preview is loading', () => {
      mockPreview = null;
      mockIsCalculating = true;
      mockPreviewError = null;

      renderWithProvider(<PredictSellPreview {...sheetContentProps} />, {
        state: initialState,
      });

      expect(screen.queryByText('$60')).toBeNull();
    });

    it('reads params from contentProps instead of route in sheet mode', () => {
      renderWithProvider(<PredictSellPreview {...sheetContentProps} />, {
        state: initialState,
      });

      expect(screen.getAllByText('$57.30')).toHaveLength(2);
    });
    it('shows a moved price inline and confirms it from Cash Out, with no nested sheet', async () => {
      mockPreviewExecutionOrder.mockResolvedValueOnce(
        createExecutableResult({
          preview: createExecutionPreview({ sharePrice: 0.47 }),
          execution: createExecutionMetadata({
            refreshedPrice: 0.47,
            worstExecutablePrice: 0.47,
          }),
        }),
      );
      renderWithProvider(<PredictSellPreview {...sheetContentProps} />, {
        state: initialState,
      });
      const pressCashOut = () =>
        act(async () => {
          fireEvent.press(
            screen.getByTestId('predict-sell-preview-cash-out-button'),
          );
          await flushMicrotasks();
        });

      await pressCashOut();

      expect(
        screen.getByTestId(PredictOrderRetryNoticeSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
      expect(screen.getByText('Price moved')).toBeOnTheScreen();
      expect(screen.queryByText('Yes, sell at 47¢')).toBeNull();
      expect(mockPlaceOrder).not.toHaveBeenCalled();

      mockPreviewExecutionOrder.mockResolvedValueOnce(
        createExecutableResult({
          preview: createExecutionPreview({ sharePrice: 0.47 }),
        }),
      );
      await pressCashOut();

      expect(mockPreviewExecutionOrder).toHaveBeenLastCalledWith(
        expect.objectContaining({ approvedPrice: 0.47 }),
      );
      expect(mockPlaceOrder).toHaveBeenCalledTimes(1);
    });

    it('clears the inline state when its close button is pressed', async () => {
      mockPreviewExecutionOrder.mockResolvedValueOnce({ status: 'timeout' });
      renderWithProvider(<PredictSellPreview {...sheetContentProps} />, {
        state: initialState,
      });
      await act(async () => {
        fireEvent.press(
          screen.getByTestId('predict-sell-preview-cash-out-button'),
        );
        await flushMicrotasks();
      });
      expect(screen.getByText('Market timed out')).toBeOnTheScreen();

      fireEvent.press(
        screen.getByTestId(PredictOrderRetryNoticeSelectorsIDs.CLOSE_BUTTON),
      );

      expect(screen.queryByText('Market timed out')).toBeNull();
    });
  });

  describe('fee disclosure', () => {
    it('renders Total row when preview has fees', () => {
      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(
        screen.getByText(strings('predict.fee_summary.total')),
      ).toBeOnTheScreen();
    });

    it('renders net proceeds as Total amount after deducting fees', () => {
      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(screen.getAllByText('$57.30')).toHaveLength(2);
    });

    it('shows the original total and member badge for a membership fee waiver', () => {
      mockPreview = {
        marketId: 'market-1',
        outcomeId: 'outcome-456',
        outcomeTokenId: 'outcome-token-789',
        timestamp: Date.now(),
        side: 'SELL',
        sharePrice: 0.5,
        maxAmountSpent: 100,
        minAmountReceived: 60,
        slippage: 0.005,
        tickSize: 0.01,
        minOrderSize: 1,
        negRisk: false,
        fees: {
          ...mockFees,
          metamaskFee: 0,
          totalFee: mockFees.providerFee,
          totalFeePercentage: 1,
        },
        originalFees: mockFees,
        feePolicy: {
          discountType: DiscountType.SUBSCRIPTION,
          builderCode: 'predict-pro-builder',
        },
      };

      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(screen.getAllByText('$59.10')).toHaveLength(2);
      expect(screen.getByText('$57.30')).toBeOnTheScreen();
      expect(screen.getByTestId('rewards-member-badge')).toBeOnTheScreen();
    });

    it('hides Total row when preview is unavailable', () => {
      mockPreview = null;
      mockIsCalculating = true;
      mockPreviewError = null;

      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      expect(
        screen.queryByText(strings('predict.fee_summary.total')),
      ).not.toBeOnTheScreen();
    });

    it('closes Price details sheet when preview refreshes to null', async () => {
      const { rerender } = renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      const totalRow = screen.getByText(strings('predict.fee_summary.total'));

      await act(async () => {
        fireEvent.press(totalRow);
      });

      expect(
        screen.getByText(strings('predict.fee_summary.price_details')),
      ).toBeOnTheScreen();

      mockPreview = null;
      mockIsCalculating = true;

      await act(async () => {
        rerender(<PredictSellPreview />);
      });

      expect(
        screen.queryByText(strings('predict.fee_summary.price_details')),
      ).not.toBeOnTheScreen();
    });

    it('opens Price details sheet when Total row is pressed', async () => {
      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      const totalRow = screen.getByText(strings('predict.fee_summary.total'));

      await act(async () => {
        fireEvent.press(totalRow);
      });

      expect(
        screen.getByText(strings('predict.fee_summary.price_details')),
      ).toBeOnTheScreen();
    });

    it('shows MetaMask fee and exchange fee in Price details sheet', async () => {
      renderWithProvider(<PredictSellPreview />, {
        state: initialState,
      });

      const totalRow = screen.getByText(strings('predict.fee_summary.total'));

      await act(async () => {
        fireEvent.press(totalRow);
      });

      expect(
        screen.getByText(strings('predict.fee_summary.metamask_fee')),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('predict.fee_summary.exchange_fee')),
      ).toBeOnTheScreen();
    });
  });
});
