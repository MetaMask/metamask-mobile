/*
 * Perps COMPONENT integration-test harness — Shape C.
 *
 * Builds on Shape B (`./perps-flow`) and adds the React Native app providers
 * needed to render real perps components/screens with `render(...)`.
 *
 * Use this when the user-facing interaction itself matters: a rendered button
 * press should flow through component → hook → Engine shim → real
 * TradingService → real provider → mocked SDK, then back into visible UI/toast
 * state. Tests still mock only the I/O boundary and native runtime.
 *
 * REAL:
 *   - Rendered perps React components and their hooks
 *   - Redux selectors against a minimal app state
 *   - `usePerpsTrading` → Shape B Engine shim → real TradingService/provider
 *
 * MOCKED:
 *   - Shape A/B I/O boundary mocks (SDK, wallet, subscriptions, readiness)
 *   - React Native runtime modules that do not affect perps logic
 *   - Toast ref implementation, captured for assertions
 */

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  Reanimated.default.call = () => undefined;
  return Reanimated;
});

jest.mock('react-native-gesture-handler', () => {
  const RN = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const mockGesture = () => ({
    enabled: jest.fn().mockReturnThis(),
    onBegin: jest.fn().mockReturnThis(),
    onUpdate: jest.fn().mockReturnThis(),
    onEnd: jest.fn().mockReturnThis(),
    onFinalize: jest.fn().mockReturnThis(),
  });
  return {
    GestureHandlerRootView: RN.View,
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    Gesture: {
      Pan: jest.fn(mockGesture),
      Tap: jest.fn(mockGesture),
      Simultaneous: jest.fn((...gestures) => gestures),
    },
    PanGestureHandler: ReactActual.forwardRef(
      ({ children }: { children: React.ReactNode }, _ref) => children,
    ),
  };
});

jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('react-native-device-info', () => ({
  __esModule: true,
  getVersion: () => '99.0.0',
}));
jest.mock('react-native-performance', () => ({
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
}));
jest.mock('../../../app/util/haptics', () => {
  const actual = jest.requireActual('../../../app/util/haptics');
  return {
    ...actual,
    fireSwitchHaptic: jest.fn(),
    playSuccessNotification: jest.fn(),
    playErrorNotification: jest.fn(),
    playWarningNotification: jest.fn(),
    playNotification: jest.fn(),
    playImpact: jest.fn(),
    playSelection: jest.fn(),
    useHaptics: () => ({
      play: jest.fn(),
      playImpact: jest.fn(),
      playNotification: jest.fn(),
      playSelection: jest.fn(),
    }),
  };
});
jest.mock(
  '../../../app/components/Views/confirmations/hooks/pay/useTransactionPayData',
  () => ({
    useTransactionPayTotals: () => null,
    useIsTransactionPayQuoteLoading: () => false,
  }),
);
jest.mock(
  '../../../app/components/Views/confirmations/hooks/pay/useTransactionPayMetrics',
  () => ({
    useTransactionPayMetrics: jest.fn(),
  }),
);
jest.mock(
  '../../../app/components/Views/confirmations/hooks/pay/useTransactionPayToken',
  () => ({
    useTransactionPayToken: () => ({ payToken: null }),
  }),
);
jest.mock(
  '../../../app/components/Views/confirmations/hooks/tokens/useAddToken',
  () => ({
    useAddToken: jest.fn(),
  }),
);
jest.mock(
  '../../../app/components/Views/confirmations/hooks/transactions/useTransactionConfirm',
  () => ({
    useTransactionConfirm: () => ({
      onConfirm: jest.fn().mockResolvedValue(undefined),
    }),
  }),
);
jest.mock(
  '../../../app/components/Views/confirmations/hooks/transactions/useTransactionCustomAmount',
  () => ({
    useTransactionCustomAmount: () => ({ setCustomAmount: jest.fn() }),
  }),
);
jest.mock(
  '../../../app/components/Views/confirmations/hooks/transactions/useTransactionMetadataRequest',
  () => ({
    useTransactionMetadataRequest: () => undefined,
  }),
);
jest.mock(
  '../../../app/components/Views/confirmations/hooks/transactions/useUpdateTokenAmount',
  () => ({
    useUpdateTokenAmount: () => jest.fn(),
  }),
);
jest.mock(
  '../../../app/components/Views/confirmations/hooks/useConfirmActions',
  () => ({
    useConfirmActions: () => ({ onReject: jest.fn() }),
  }),
);
jest.mock(
  '../../../app/components/Views/confirmations/hooks/alerts/useInsufficientPayTokenBalanceAlert',
  () => ({
    useInsufficientPayTokenBalanceAlert: () => [],
  }),
);
jest.mock(
  '../../../app/components/Views/confirmations/hooks/alerts/useNoPayTokenQuotesAlert',
  () => ({
    useNoPayTokenQuotesAlert: () => [],
  }),
);
jest.mock('../../../app/util/trace', () => ({
  TraceName: {
    PerpsOrderView: 'PerpsOrderView',
    PerpsOrderSubmissionToast: 'PerpsOrderSubmissionToast',
    PerpsFlipPositionSheet: 'PerpsFlipPositionSheet',
  },
  TraceOperation: {
    PerpsOperation: 'PerpsOperation',
    PerpsOrderSubmission: 'PerpsOrderSubmission',
  },
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createStackNavigator } from '@react-navigation/stack';

import { buildPerpsFlowHarness, type PerpsFlowHarness } from './perps-flow';
import type { PerpsHarnessOptions } from './perps';
import renderWithProvider, {
  type DeepPartial,
} from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { ToastContext } from '../../../app/component-library/components/Toast';
import {
  PerpsConnectionContext,
  type PerpsConnectionContextValue,
} from '../../../app/components/UI/Perps/providers/PerpsConnectionProvider';
import {
  PerpsStreamProvider,
  type PerpsStreamManager,
} from '../../../app/components/UI/Perps/providers/PerpsStreamManager';
import { AccessRestrictedProvider } from '../../../app/components/UI/Compliance';
import Routes from '../../../app/constants/navigation/Routes';
import { initialStatePerps } from '../../component-view/presets/perpsStatePreset';

type ToastOptionsForHarness = Record<string, unknown>;

interface PerpsComponentRenderOptions {
  stateOverrides?: DeepPartial<RootState>;
  streamOverrides?: {
    prices?: Record<
      string,
      { price: string; markPrice?: string; percentChange24h?: string }
    >;
    topOfBook?: { bestBid?: string; bestAsk?: string; spread?: string };
    positions?: unknown[];
    account?: unknown;
  };
}

export interface PerpsComponentHarness extends PerpsFlowHarness {
  renderWithFlow: (
    component: React.ReactElement,
    options?: PerpsComponentRenderOptions,
  ) => ReturnType<typeof renderWithProvider>;
  renderScreenWithFlow: (
    Component: React.ComponentType,
    options: PerpsComponentRenderOptions & {
      routeName: string;
      initialParams?: Record<string, unknown>;
    },
  ) => ReturnType<typeof renderWithProvider>;
  mocks: PerpsFlowHarness['harness']['mocks'] & {
    showToast: jest.Mock<void, [ToastOptionsForHarness]>;
    closeToast: jest.Mock<void, []>;
  };
  teardown: () => void;
}

const noopUnsubscribe = (): void => undefined;

const testConnectionValue: PerpsConnectionContextValue = {
  isConnected: true,
  isConnecting: false,
  isInitialized: true,
  error: null,
  connect: async (): Promise<void> => undefined,
  disconnect: async (): Promise<void> => undefined,
  resetError: (): void => undefined,
  reconnectWithNewContext: async (): Promise<void> => undefined,
};

function channelWithInitialValue<T>(initialValue: T) {
  return {
    subscribe: (params: { callback: (data: T) => void }): (() => void) => {
      params.callback(initialValue);
      return noopUnsubscribe;
    },
    getSnapshot: () => initialValue,
  };
}

function pricesChannel(
  prices: NonNullable<PerpsComponentRenderOptions['streamOverrides']>['prices'],
) {
  return {
    subscribe: (): (() => void) => noopUnsubscribe,
    subscribeToSymbols: (params: {
      symbols: string[];
      callback: (data: typeof prices) => void;
    }): (() => void) => {
      params.callback(prices);
      return noopUnsubscribe;
    },
    getSnapshot: () => prices,
  };
}

function topOfBookChannel(
  topOfBook: NonNullable<
    PerpsComponentRenderOptions['streamOverrides']
  >['topOfBook'],
) {
  return {
    subscribe: (): (() => void) => noopUnsubscribe,
    subscribeToSymbol: (params: {
      callback: (data: typeof topOfBook) => void;
    }): (() => void) => {
      params.callback(topOfBook);
      return noopUnsubscribe;
    },
    getSnapshot: () => topOfBook,
  };
}

function createTestStreamManager(
  streamOverrides: PerpsComponentRenderOptions['streamOverrides'] = {},
): PerpsStreamManager {
  const prices = streamOverrides.prices ?? {
    BTC: { price: '50000', markPrice: '50000', percentChange24h: '0' },
    ETH: { price: '3000', markPrice: '3000', percentChange24h: '0' },
  };
  const topOfBook = streamOverrides.topOfBook ?? {
    bestBid: '49990',
    bestAsk: '50010',
    spread: '20',
  };
  const account = streamOverrides.account ?? {
    spendableBalance: '10000',
    withdrawableBalance: '10000',
    totalBalance: '10000',
    marginUsed: '0',
    unrealizedPnl: '0',
    returnOnEquity: '0',
  };

  return {
    prices: pricesChannel(prices),
    topOfBook: topOfBookChannel(topOfBook),
    positions: channelWithInitialValue(streamOverrides.positions ?? []),
    account: channelWithInitialValue(account),
    orders: channelWithInitialValue([]),
    fills: channelWithInitialValue([]),
    marketData: channelWithInitialValue([]),
    oiCaps: channelWithInitialValue([]),
    candles: channelWithInitialValue([]),
    clearAllChannels: (): void => undefined,
  } as unknown as PerpsStreamManager;
}

export function buildPerpsComponentHarness(
  options: PerpsHarnessOptions = {},
): PerpsComponentHarness {
  const flowHarness = buildPerpsFlowHarness(options);
  const showToast = jest.fn<void, [ToastOptionsForHarness]>();
  const closeToast = jest.fn<void, []>();
  const toastRef = { current: { showToast, closeToast } };

  const renderWithFlow = (
    component: React.ReactElement,
    renderOptions: PerpsComponentRenderOptions = {},
  ) => {
    const stateBuilder = initialStatePerps();
    if (renderOptions.stateOverrides) {
      stateBuilder.withOverrides(renderOptions.stateOverrides);
    }

    const streamManager = createTestStreamManager(
      renderOptions.streamOverrides,
    );

    const wrappedComponent = (
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <ToastContext.Provider value={{ toastRef }}>
          <AccessRestrictedProvider>
            <PerpsConnectionContext.Provider value={testConnectionValue}>
              <PerpsStreamProvider testStreamManager={streamManager}>
                {component}
              </PerpsStreamProvider>
            </PerpsConnectionContext.Provider>
          </AccessRestrictedProvider>
        </ToastContext.Provider>
      </SafeAreaProvider>
    );

    return renderWithProvider(wrappedComponent, {
      state: stateBuilder.build(),
    });
  };

  const renderScreenWithFlow = (
    Component: React.ComponentType,
    renderOptions: PerpsComponentRenderOptions & {
      routeName: string;
      initialParams?: Record<string, unknown>;
    },
  ) => {
    const Stack = createStackNavigator();
    return renderWithFlow(
      <Stack.Navigator>
        <Stack.Screen
          name={renderOptions.routeName}
          component={Component}
          initialParams={renderOptions.initialParams}
        />
        <Stack.Screen name={Routes.PERPS.ROOT} component={View} />
      </Stack.Navigator>,
      renderOptions,
    );
  };

  return {
    ...flowHarness,
    renderWithFlow,
    renderScreenWithFlow,
    mocks: {
      ...flowHarness.harness.mocks,
      showToast,
      closeToast,
    },
    teardown: () => {
      flowHarness.harness.mocks.subscription.clearAll();
    },
  };
}
