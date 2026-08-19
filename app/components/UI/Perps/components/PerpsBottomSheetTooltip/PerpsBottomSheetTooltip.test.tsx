import { fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';
import { Metrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { PerpsBottomSheetTooltipSelectorsIDs } from '../../Perps.testIds';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PerpsOrderProvider } from '../../contexts/PerpsOrderContext';
import {
  PerpsStreamProvider,
  PerpsStreamManager,
} from '../../providers/PerpsStreamManager';
import PerpsBottomSheetTooltip from './PerpsBottomSheetTooltip';
import { PerpsBottomSheetTooltipProps } from './PerpsBottomSheetTooltip.types';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

// Mock usePerpsLiveAccount to avoid PerpsStreamProvider requirement
jest.mock('../../hooks/stream/usePerpsLiveAccount', () => ({
  usePerpsLiveAccount: jest.fn(() => ({
    account: {
      spendableBalance: '1000',
      withdrawableBalance: '1000',
      marginUsed: '0',
      unrealizedPnl: '0',
      returnOnEquity: '0',
      totalBalance: '1000',
    },
    isInitialLoading: false,
  })),
}));

jest.mock('../../hooks/stream/usePerpsLivePositions', () => ({
  usePerpsLivePositions: jest.fn(() => ({
    positions: [],
    isInitialLoading: false,
  })),
}));

// Mock usePerpsMarketData to prevent async operations that cause act warnings
jest.mock('../../hooks/usePerpsMarketData', () => ({
  usePerpsMarketData: jest.fn(() => ({
    marketData: {
      name: 'BTC',
      szDecimals: 6,
      maxLeverage: 50,
      marginTableId: 1,
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

// Create mock stream manager for tests
const createMockStreamManager = (): Partial<PerpsStreamManager> => ({
  // Mock prices stream with minimal required properties
  prices: {
    subscribeToSymbols: jest.fn(() => jest.fn()), // Returns an unsubscribe function
    subscribe: jest.fn(() => jest.fn()),
    unsubscribe: jest.fn(),
    prewarm: jest.fn(() =>
      Promise.resolve(() => {
        // no-op cleanup
      }),
    ),
    cleanupPrewarm: jest.fn(),
    clearCache: jest.fn(),
    disconnect: jest.fn(),
    getSnapshot: jest.fn(() => null),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,

  // Mock other stream channels
  orders: {
    subscribe: jest.fn(() => jest.fn()),
    unsubscribe: jest.fn(),
    prewarm: jest.fn(() => jest.fn()),
    cleanupPrewarm: jest.fn(),
    clearCache: jest.fn(),
    disconnect: jest.fn(),
    getSnapshot: jest.fn(() => null),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,

  positions: {
    subscribe: jest.fn(() => jest.fn()),
    unsubscribe: jest.fn(),
    prewarm: jest.fn(() => jest.fn()),
    cleanupPrewarm: jest.fn(),
    clearCache: jest.fn(),
    disconnect: jest.fn(),
    getSnapshot: jest.fn(() => null),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,

  fills: {
    subscribe: jest.fn(() => jest.fn()),
    unsubscribe: jest.fn(),
    prewarm: jest.fn(() => jest.fn()),
    cleanupPrewarm: jest.fn(),
    clearCache: jest.fn(),
    disconnect: jest.fn(),
    getSnapshot: jest.fn(() => null),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,

  account: {
    subscribe: jest.fn(() => jest.fn()),
    unsubscribe: jest.fn(),
    prewarm: jest.fn(() => jest.fn()),
    cleanupPrewarm: jest.fn(),
    clearCache: jest.fn(),
    disconnect: jest.fn(),
    getSnapshot: jest.fn(() => null),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,

  marketData: {
    subscribe: jest.fn(() => jest.fn()),
    unsubscribe: jest.fn(),
    refresh: jest.fn(() => Promise.resolve()),
    prewarm: jest.fn(() => jest.fn()),
    clearCache: jest.fn(),
    getSnapshot: jest.fn(() => null),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
});

// Test wrapper with PerpsStreamProvider
const TestWrapperWithStream = ({ children }: { children: React.ReactNode }) => (
  <PerpsStreamProvider
    testStreamManager={
      createMockStreamManager() as unknown as PerpsStreamManager
    }
  >
    {children}
  </PerpsStreamProvider>
);

describe('PerpsBottomSheetTooltip', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const initialMetrics: Metrics = {
    frame: { x: 0, y: 0, width: 320, height: 640 },
    insets: { top: 0, left: 0, right: 0, bottom: 0 },
  };

  const renderBottomSheetTooltip = ({
    isVisible = true,
    onClose = mockOnClose,
    contentKey = 'leverage',
    testID = PerpsBottomSheetTooltipSelectorsIDs.TOOLTIP,
  }: PerpsBottomSheetTooltipProps) =>
    renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <PerpsBottomSheetTooltip
          isVisible={isVisible}
          onClose={onClose}
          contentKey={contentKey}
          testID={testID}
        />
      </SafeAreaProvider>,
    );

  it('does not render when not visible', () => {
    const { queryByTestId } = renderBottomSheetTooltip({
      isVisible: false,
      onClose: mockOnClose,
      contentKey: 'leverage',
    });

    expect(
      queryByTestId(PerpsBottomSheetTooltipSelectorsIDs.TOOLTIP),
    ).toBeNull();
  });

  it('calls onClose when button is pressed', async () => {
    const { getByTestId } = renderBottomSheetTooltip({
      isVisible: true,
      onClose: mockOnClose,
      contentKey: 'leverage',
    });

    fireEvent.press(
      getByTestId(PerpsBottomSheetTooltipSelectorsIDs.GOT_IT_BUTTON),
    );

    await waitFor(
      () => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      },
      { timeout: 10000 },
    );
  }, 15000);

  it('renders different content for different contentKey (Margin Tooltip)', () => {
    const { getByText } = renderBottomSheetTooltip({
      isVisible: true,
      onClose: mockOnClose,
      contentKey: 'margin',
    });

    expect(getByText('Margin')).toBeTruthy();
    expect(
      getByText(
        "Margin is the money you put in to open a trade. It acts as collateral, and it's the most you can lose on that trade.",
      ),
    ).toBeTruthy();
  });

  it('renders custom tooltip content correctly (Fee Tooltip)', () => {
    const params = {
      initialAsset: 'BTC',
      initialDirection: 'long' as const,
      initialAmount: '6',
      initialLeverage: 5,
    };

    const { getByText } = renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <TestWrapperWithStream>
          <PerpsOrderProvider {...params}>
            <PerpsBottomSheetTooltip
              isVisible
              onClose={mockOnClose}
              contentKey={'fees'}
              testID={PerpsBottomSheetTooltipSelectorsIDs.TOOLTIP}
              data={{
                metamaskFeeRate: 0.001, // 0.1% MetaMask fee
                protocolFeeRate: 0.00045, // 0.045% protocol fee for taker
              }}
            />
          </PerpsOrderProvider>
        </TestWrapperWithStream>
      </SafeAreaProvider>,
    );

    expect(getByText('Fees')).toBeTruthy();
    expect(getByText('MetaMask fee')).toBeTruthy();
    expect(getByText('Provider fee')).toBeTruthy();
    // MetaMask fee should show 0.100%
    expect(getByText('0.100%')).toBeTruthy();
    // Provider fee (taker) should be 0.045%
    expect(getByText('0.045%')).toBeTruthy();
  });

  // TAT-3758: callers render this tooltip inside a react-native <Modal>, which
  // on Android is its own window. Without a nested SafeAreaProvider the root
  // provider measures the activity window and reports a bottom inset of 0,
  // collapsing BottomSheetDialog's bottom padding and leaving the footer button
  // under the navigation bar.
  describe('modal safe-area inset (TAT-3758)', () => {
    const originalPlatform = Platform.OS;

    afterEach(() => {
      Platform.OS = originalPlatform;
    });

    it('nests a SafeAreaProvider on Android so the bottom inset is measured against the modal window', () => {
      Platform.OS = 'android';
      const customTestID = 'geo-block-tooltip';

      const { getByTestId } = renderBottomSheetTooltip({
        isVisible: true,
        onClose: mockOnClose,
        contentKey: 'geo_block',
        testID: customTestID,
      });

      expect(getByTestId(`${customTestID}-safe-area-provider`)).toBeTruthy();
    });

    it('does not nest a SafeAreaProvider on iOS, where the root provider already reports correct insets', () => {
      Platform.OS = 'ios';
      const customTestID = 'geo-block-tooltip';

      const { queryByTestId, getByTestId } = renderBottomSheetTooltip({
        isVisible: true,
        onClose: mockOnClose,
        contentKey: 'geo_block',
        testID: customTestID,
      });

      expect(queryByTestId(`${customTestID}-safe-area-provider`)).toBeNull();
      // The tooltip still renders normally on iOS.
      expect(getByTestId(customTestID)).toBeTruthy();
      expect(
        getByTestId(PerpsBottomSheetTooltipSelectorsIDs.GOT_IT_BUTTON),
      ).toBeTruthy();
    });
  });

  it('uses custom testID when provided', () => {
    const customTestID = 'custom-tooltip-test-id';
    const { getByTestId } = renderBottomSheetTooltip({
      isVisible: true,
      onClose: mockOnClose,
      contentKey: 'leverage',
      testID: customTestID,
    });

    expect(getByTestId(customTestID)).toBeTruthy();
    expect(getByTestId(PerpsBottomSheetTooltipSelectorsIDs.TITLE)).toBeTruthy();
    expect(
      getByTestId(PerpsBottomSheetTooltipSelectorsIDs.CONTENT),
    ).toBeTruthy();
    expect(
      getByTestId(PerpsBottomSheetTooltipSelectorsIDs.GOT_IT_BUTTON),
    ).toBeTruthy();
  });
});
