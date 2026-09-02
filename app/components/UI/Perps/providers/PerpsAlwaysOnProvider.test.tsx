import React from 'react';
import { render, act, cleanup } from '@testing-library/react-native';
import { Text, AppState } from 'react-native';
import {
  ChaseOrderSuspensionError,
  type PerpsProviderType,
} from '@metamask/perps-controller';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { PerpsAlwaysOnProvider } from './PerpsAlwaysOnProvider';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';
import {
  CHASE_ORDER_UI_CONFIG,
  PERPS_CONNECTION_SOURCE,
} from '../constants/perpsConfig';
import NotificationsService, {
  isPushPermissionGranted,
} from '../../../../util/notifications/services/NotificationService';
import { selectPerpsEnabledFlag } from '../index';
import { selectPerpsMobileChaseEnabledFlag } from '../selectors/featureFlags';
import { selectIsMetaMaskPushNotificationsEnabled } from '../../../../selectors/notifications';
import {
  reportSuspendedChaseOrders,
  resetSuspendedChaseOrderBufferForTests,
} from '../services/ChaseOrderSuspensionEvents';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../services/PerpsConnectionManager');

jest.mock('../utils/perpsLifecycleContext', () => ({
  initPerpsLifecycleTracking: jest.fn(() => jest.fn()),
}));

const mockTrack = jest.fn();
const mockSuspendChaseOrders = jest.fn().mockResolvedValue([]);
let mockHasLiveChaseOrders = false;
let mockChaseOrders: {
  handle: string;
  symbol: string;
  status: string;
  providerId?: PerpsProviderType;
  repricings?: number;
  startedAt?: number;
}[] = [];
let mockIsChaseOrderDiscoveryResolved = true;
let mockIsPerpsPushNotificationsEnabled = true;
const mockUseFeatureNotificationsStatus = jest.fn(() => ({
  isPushEnabled: mockIsPerpsPushNotificationsEnabled,
}));
const mockUsePerpsChaseOrders = jest.fn(
  (_options: { isEnabled: boolean; enableDiscovery?: boolean }) => ({
    chaseOrders: mockChaseOrders,
    hasLiveChaseOrders: mockHasLiveChaseOrders,
    isChaseOrderDiscoveryResolved: mockIsChaseOrderDiscoveryResolved,
    suspendChaseOrders: mockSuspendChaseOrders,
  }),
);
const mockIsChaseOrderHandleVisible = jest.fn(
  (_handle: string): boolean => false,
);

jest.mock('../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: mockTrack }),
}));

jest.mock('../hooks/usePerpsChaseOrders', () => ({
  usePerpsChaseOrders: (options: {
    isEnabled: boolean;
    enableDiscovery?: boolean;
  }) => mockUsePerpsChaseOrders(options),
}));

jest.mock('../services/ChaseOrderVisibility', () => ({
  isChaseOrderHandleVisible: (handle: string) =>
    mockIsChaseOrderHandleVisible(handle),
}));

jest.mock(
  '../../../../util/notifications/services/NotificationService',
  () => ({
    displayNotification: jest.fn(),
    isPushPermissionGranted: jest.fn(),
  }),
);

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  context: {
    PerpsController: {
      startMarketDataPreload: jest.fn(),
      stopMarketDataPreload: jest.fn(),
    },
  },
}));

// Prevent PerpsStreamManager singleton from instantiating PERFORMANCE_CONFIG
jest.mock('../providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('@metamask/perps-controller', () => ({
  ChaseOrderSuspensionError: class MockChaseOrderSuspensionError extends Error {
    suspendedOrders: unknown[];
    failures: unknown[];

    constructor({
      suspendedOrders,
      failures,
    }: {
      suspendedOrders: unknown[];
      failures: unknown[];
    }) {
      super('Partial Chase suspension');
      this.suspendedOrders = suspendedOrders;
      this.failures = failures;
    }
  },
  CHASE_ORDER_STATUS: {
    Active: 'active',
    TerminationPending: 'termination_pending',
    Backgrounded: 'backgrounded',
    MaxDistanceReached: 'max_distance_reached',
    DurationReached: 'duration_reached',
    RepricingLimitReached: 'repricing_limit_reached',
    Filled: 'filled',
    Canceled: 'canceled',
    Failed: 'failed',
  },
  PERPS_EVENT_PROPERTY: {
    INTERACTION_TYPE: 'interaction_type',
    ASSET: 'asset',
  },
  PERPS_CONSTANTS: {
    FeatureName: 'perps',
    ReconnectionDelayAndroidMs: 500,
    ConnectRetryDelayMs: 1000,
  },
  HYPERLIQUID_TWAP_LIMITS: {
    MinDurationMinutes: 5,
    MaxDurationMinutes: 1440,
    MinNotionalUsd: 100,
  },
  PERPS_EVENT_VALUE: {
    INTERACTION_TYPE: {
      CHASE_BACKGROUNDED_CONVERTED: 'chase_backgrounded_converted',
    },
    NOTIFICATION_TYPE: {
      CHASE_BACKGROUNDED: 'chase_backgrounded',
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../util/errorUtils', () => ({
  ensureError: jest.fn((err) =>
    err instanceof Error ? err : new Error(String(err)),
  ),
}));

jest.mock('../index', () => ({
  selectPerpsEnabledFlag: jest.fn(),
}));

jest.mock('../selectors/featureFlags', () => ({
  selectPerpsMobileChaseEnabledFlag: jest.fn(),
}));

jest.mock('../../../../selectors/notifications', () => ({
  selectIsMetaMaskPushNotificationsEnabled: jest.fn(),
}));

jest.mock(
  '../../../Views/Settings/NotificationsSettings/hooks/useFeatureNotificationsStatus',
  () => ({
    useFeatureNotificationsStatus: () => mockUseFeatureNotificationsStatus(),
  }),
);

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const secondaryProvider = 'secondary-provider' as PerpsProviderType;
const mockResumeFromForeground =
  PerpsConnectionManager.resumeFromForeground as jest.Mock;
const mockDisconnect = PerpsConnectionManager.disconnect as jest.Mock;
const mockDisplayNotification =
  NotificationsService.displayNotification as jest.Mock;
const mockIsPushPermissionGranted = isPushPermissionGranted as jest.Mock;
const mockStartMarketDataPreload = Engine.context.PerpsController
  .startMarketDataPreload as jest.Mock;
const mockStopMarketDataPreload = Engine.context.PerpsController
  .stopMarketDataPreload as jest.Mock;
const mockControllerSubscribe = Engine.controllerMessenger
  .subscribe as jest.Mock;
const mockControllerUnsubscribe = Engine.controllerMessenger
  .unsubscribe as jest.Mock;
let mockProviderChildRenderAction: (() => void) | undefined;
const ProviderRenderProbe = () => {
  mockProviderChildRenderAction?.();
  return <Text>child</Text>;
};

describe('PerpsAlwaysOnProvider', () => {
  let mockAppStateListener: ((state: string) => void) | null = null;
  let mockMaxDistanceHandler:
    | ((event: {
        handle: string;
        symbol: string;
        side: 'buy' | 'sell';
        restingOrderId: string | null;
        restingPrice: string;
        maxDistanceBps: number;
        timestamp: number;
        providerId: PerpsProviderType;
      }) => void)
    | null = null;
  let mockSubscriptionRemove: jest.Mock;
  let addEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockResumeFromForeground.mockResolvedValue(undefined);
    mockDisconnect.mockResolvedValue(undefined);
    mockDisplayNotification.mockResolvedValue(undefined);
    mockIsPushPermissionGranted.mockResolvedValue(true);
    mockSuspendChaseOrders.mockReset().mockResolvedValue([]);
    mockHasLiveChaseOrders = false;
    mockChaseOrders = [];
    mockIsChaseOrderDiscoveryResolved = true;
    mockIsPerpsPushNotificationsEnabled = true;
    mockProviderChildRenderAction = undefined;
    mockIsChaseOrderHandleVisible.mockReturnValue(false);
    resetSuspendedChaseOrderBufferForTests();
    mockStartMarketDataPreload.mockClear();
    mockStopMarketDataPreload.mockClear();
    mockControllerSubscribe.mockImplementation((eventName, handler) => {
      if (eventName === 'PerpsController:chaseOrderMaxDistanceReached') {
        mockMaxDistanceHandler = handler;
      }
    });
    mockSubscriptionRemove = jest.fn();
    addEventListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((event, handler) => {
        if (event === 'change') {
          mockAppStateListener = handler as (state: string) => void;
        }
        return { remove: mockSubscriptionRemove };
      });

    // In real app, AppState.currentState starts as 'active'.
    // In Jest (native not initialized) it's null — mock it so lastAppState
    // initializes correctly and the prevState === 'active' guard works.
    Object.defineProperty(AppState, 'currentState', {
      get: () => 'active',
      configurable: true,
    });

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectPerpsMobileChaseEnabledFlag) return true;
      if (selector === selectIsMetaMaskPushNotificationsEnabled) return true;
      return undefined;
    });
  });

  afterEach(() => {
    cleanup();
    act(() => {
      jest.runOnlyPendingTimers();
    });
    resetSuspendedChaseOrderBufferForTests();
    jest.useRealTimers();
    addEventListenerSpy.mockRestore();
    mockAppStateListener = null;
    mockMaxDistanceHandler = null;
  });

  it('renders children', () => {
    const { getByText } = render(
      <PerpsAlwaysOnProvider>
        <Text>child content</Text>
      </PerpsAlwaysOnProvider>,
    );
    expect(getByText('child content')).toBeOnTheScreen();
  });

  it('calls resumeFromForeground on mount when perps is enabled', () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    expect(mockResumeFromForeground).toHaveBeenCalledTimes(1);
    expect(mockResumeFromForeground).toHaveBeenCalledWith({
      source: PERPS_CONNECTION_SOURCE.WALLET_ROOT_MOUNT,
      suppressError: true,
    });
  });

  it('starts market data preload on mount when perps is enabled', () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    expect(mockStartMarketDataPreload).toHaveBeenCalledTimes(1);
  });

  it('subscribes to max-distance events and unsubscribes on unmount', () => {
    const view = render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    const subscribedHandler = mockMaxDistanceHandler;

    view.unmount();

    expect(mockControllerSubscribe).toHaveBeenCalledWith(
      'PerpsController:chaseOrderMaxDistanceReached',
      expect.any(Function),
    );
    expect(mockControllerUnsubscribe).toHaveBeenCalledWith(
      'PerpsController:chaseOrderMaxDistanceReached',
      subscribedHandler,
    );
  });

  it('samples each newly observed tenth Chase reprice without remount backfill', () => {
    const chase = {
      handle: 'chase-reprice-sampling',
      symbol: 'ETH',
      status: 'active',
      providerId: 'hyperliquid' as const,
      repricings: 9,
      startedAt: 1_711_756_800_000,
    };
    mockChaseOrders = [chase];
    const view = render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    expect(mockTrack).not.toHaveBeenCalled();
    mockChaseOrders = [{ ...chase, repricings: 21 }];
    view.rerender(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    expect(mockTrack).toHaveBeenCalledTimes(2);
    expect(mockTrack).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        interaction_type: 'chase_reprice',
        asset: 'ETH',
      }),
    );
    expect(mockTrack).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        interaction_type: 'chase_reprice',
        asset: 'ETH',
      }),
    );
    view.unmount();
    mockTrack.mockClear();

    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('tracks and notifies a max-distance event once', async () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    const event = {
      handle: 'chase-max-distance',
      symbol: 'ETH',
      side: 'buy' as const,
      restingOrderId: 'resting-1',
      restingPrice: '2500',
      maxDistanceBps: 100,
      timestamp: 1_711_756_800_000,
      providerId: 'hyperliquid' as const,
    };

    await act(async () => {
      mockMaxDistanceHandler?.(event);
      mockMaxDistanceHandler?.(event);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockTrack).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        interaction_type: 'chase_max_distance_hit',
        asset: 'ETH',
      }),
    );
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    expect(mockDisplayNotification).toHaveBeenCalledWith({
      id: 'perps-chase-max-distance-chase-max-distance',
      title: 'Chase max distance reached',
      body: 'Your ETH Chase order reached its max distance and is now resting as a limit order.',
      data: {
        notification_id: 'perps-chase-max-distance-chase-max-distance',
      },
    });
    expect(mockDisplayNotification.mock.calls[0][0]).not.toHaveProperty(
      'pressActionId',
    );
  });

  it('dedupes max-distance analytics by provider and Chase handle', async () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    const event = {
      handle: 'shared-max-distance-handle',
      symbol: 'ETH',
      side: 'buy' as const,
      restingOrderId: 'resting-shared',
      restingPrice: '2500',
      maxDistanceBps: 100,
      timestamp: 1_711_756_800_000,
      providerId: 'hyperliquid' as PerpsProviderType,
    };

    await act(async () => {
      mockMaxDistanceHandler?.(event);
      mockMaxDistanceHandler?.(event);
      mockMaxDistanceHandler?.({
        ...event,
        providerId: secondaryProvider,
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockTrack).toHaveBeenCalledTimes(2);
  });

  it('suppresses max-distance notification on the visible Chase market screen', async () => {
    mockIsChaseOrderHandleVisible.mockImplementation(
      (handle) => handle === 'visible-chase',
    );
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockMaxDistanceHandler?.({
        handle: 'visible-chase',
        symbol: 'ETH',
        side: 'buy',
        restingOrderId: 'resting-visible',
        restingPrice: '2500',
        maxDistanceBps: 100,
        timestamp: 1_711_756_800_000,
        providerId: 'hyperliquid',
      });
      await Promise.resolve();
    });

    expect(mockIsPushPermissionGranted).not.toHaveBeenCalled();
    expect(mockDisplayNotification).not.toHaveBeenCalled();
    expect(mockTrack).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        interaction_type: 'chase_max_distance_hit',
        asset: 'ETH',
      }),
    );
  });

  it.each([
    { scenario: 'another Chase on the same market', visibleHandle: 'chase-b' },
    { scenario: 'Lite mode', visibleHandle: null },
    { scenario: 'another Pro tab', visibleHandle: null },
  ])(
    'delivers max-distance notification for $scenario without a matching visible Chase row',
    async ({ visibleHandle }) => {
      mockIsChaseOrderHandleVisible.mockImplementation(
        (handle) => handle === visibleHandle,
      );
      render(
        <PerpsAlwaysOnProvider>
          <Text>child</Text>
        </PerpsAlwaysOnProvider>,
      );

      await act(async () => {
        mockMaxDistanceHandler?.({
          handle: 'not-visible-chase',
          symbol: 'BTC',
          side: 'buy',
          restingOrderId: 'resting-not-visible',
          restingPrice: '64000',
          maxDistanceBps: 100,
          timestamp: 1_711_756_800_000,
          providerId: 'hyperliquid',
        });
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    },
  );

  it('delivers max-distance notification during background transition', async () => {
    mockIsChaseOrderHandleVisible.mockReturnValue(true);
    Object.defineProperty(AppState, 'currentState', {
      value: 'background',
      configurable: true,
    });
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockMaxDistanceHandler?.({
        handle: 'background-chase',
        symbol: 'ETH',
        side: 'buy',
        restingOrderId: 'resting-background',
        restingPrice: '2500',
        maxDistanceBps: 100,
        timestamp: 1_711_756_800_000,
        providerId: 'hyperliquid',
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
  });

  it('retries a max-distance notification after permission is granted', async () => {
    mockIsPushPermissionGranted
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    const event = {
      handle: 'chase-max-distance-permission',
      symbol: 'BTC',
      side: 'sell' as const,
      restingOrderId: null,
      restingPrice: '64000',
      maxDistanceBps: 125,
      timestamp: 1_711_756_800_000,
      providerId: 'hyperliquid' as const,
    };

    await act(async () => {
      mockMaxDistanceHandler?.(event);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockDisplayNotification).not.toHaveBeenCalled();
    await act(async () => {
      mockMaxDistanceHandler?.(event);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
  });

  it('skips max-distance notification when global push is disabled', async () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectPerpsMobileChaseEnabledFlag) return true;
      if (selector === selectIsMetaMaskPushNotificationsEnabled) return false;
      return undefined;
    });
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockMaxDistanceHandler?.({
        handle: 'chase-max-distance-disabled',
        symbol: 'ETH',
        side: 'buy',
        restingOrderId: 'resting-disabled',
        restingPrice: '2500',
        maxDistanceBps: 100,
        timestamp: 1_711_756_800_000,
        providerId: 'hyperliquid',
      });
      await Promise.resolve();
    });

    expect(mockIsPushPermissionGranted).not.toHaveBeenCalled();
    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  it('skips max-distance notification when Perps push is disabled', async () => {
    mockIsPerpsPushNotificationsEnabled = false;
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockMaxDistanceHandler?.({
        handle: 'chase-max-distance-perps-disabled',
        symbol: 'ETH',
        side: 'buy',
        restingOrderId: 'resting-disabled',
        restingPrice: '2500',
        maxDistanceBps: 100,
        timestamp: 1_711_756_800_000,
        providerId: 'hyperliquid',
      });
      await Promise.resolve();
    });

    expect(mockIsPushPermissionGranted).not.toHaveBeenCalled();
    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  it('rechecks Perps push after the permission await', async () => {
    let resolvePermission: ((isGranted: boolean) => void) | undefined;
    mockIsPushPermissionGranted.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePermission = resolve;
        }),
    );
    const view = render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    const event = {
      handle: 'chase-max-distance-perps-rerender',
      symbol: 'ETH',
      side: 'buy' as const,
      restingOrderId: 'resting-rerender',
      restingPrice: '2500',
      maxDistanceBps: 100,
      timestamp: 1_711_756_800_000,
      providerId: 'hyperliquid' as const,
    };

    await act(async () => {
      mockMaxDistanceHandler?.(event);
      await Promise.resolve();
    });
    mockIsPerpsPushNotificationsEnabled = false;
    view.rerender(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    await act(async () => {
      resolvePermission?.(true);
      await Promise.resolve();
    });

    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  it('retries max-distance notification after display failure', async () => {
    mockDisplayNotification
      .mockRejectedValueOnce(new Error('display failed'))
      .mockResolvedValueOnce(undefined);
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    const event = {
      handle: 'chase-max-distance-display-retry',
      symbol: 'ETH',
      side: 'buy' as const,
      restingOrderId: 'resting-display-retry',
      restingPrice: '2500',
      maxDistanceBps: 100,
      timestamp: 1_711_756_800_000,
      providerId: 'hyperliquid' as const,
    };

    await act(async () => {
      mockMaxDistanceHandler?.(event);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      mockMaxDistanceHandler?.(event);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockDisplayNotification).toHaveBeenCalledTimes(2);
  });

  it('uses committed notification settings during a render-phase event', async () => {
    let notificationsEnabled = true;
    let permissionCallsDuringRender = 0;
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectPerpsMobileChaseEnabledFlag) return true;
      if (selector === selectIsMetaMaskPushNotificationsEnabled) {
        return notificationsEnabled;
      }
      return undefined;
    });
    const view = render(
      <PerpsAlwaysOnProvider>
        <ProviderRenderProbe />
      </PerpsAlwaysOnProvider>,
    );
    const event = {
      handle: 'chase-max-distance-render',
      symbol: 'ETH',
      side: 'buy' as const,
      restingOrderId: 'resting-render',
      restingPrice: '2500',
      maxDistanceBps: 100,
      timestamp: 1_711_756_800_000,
      providerId: 'hyperliquid' as const,
    };

    notificationsEnabled = false;
    mockProviderChildRenderAction = () => {
      mockMaxDistanceHandler?.(event);
      permissionCallsDuringRender =
        mockIsPushPermissionGranted.mock.calls.length;
      mockProviderChildRenderAction = undefined;
    };
    view.rerender(
      <PerpsAlwaysOnProvider>
        <ProviderRenderProbe />
      </PerpsAlwaysOnProvider>,
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(permissionCallsDuringRender).toBe(1);
    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  it('does not call resumeFromForeground on mount when perps is disabled', () => {
    mockUseSelector.mockReturnValue(false);

    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    expect(mockResumeFromForeground).not.toHaveBeenCalled();
  });

  it('disables Chase polling when perps is disabled', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return false;
      if (selector === selectPerpsMobileChaseEnabledFlag) return true;
      if (selector === selectIsMetaMaskPushNotificationsEnabled) return true;
      return undefined;
    });

    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    expect(mockUsePerpsChaseOrders).toHaveBeenCalledWith({
      isEnabled: false,
      enableDiscovery: true,
    });
  });

  it('keeps wallet-root Chase discovery off the screen polling loop', () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    expect(mockUsePerpsChaseOrders).toHaveBeenCalledWith({
      isEnabled: false,
      enableDiscovery: true,
    });
    expect(mockUseFeatureNotificationsStatus).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      state: 'Perps disabled',
      selector: selectPerpsEnabledFlag,
    },
    {
      state: 'Chase disabled',
      selector: selectPerpsMobileChaseEnabledFlag,
    },
    {
      state: 'global push disabled',
      selector: selectIsMetaMaskPushNotificationsEnabled,
    },
  ])('skips the Perps notification query when $state', ({ selector }) => {
    mockUseSelector.mockImplementation((currentSelector) => {
      if (currentSelector === selector) return false;
      if (currentSelector === selectPerpsEnabledFlag) return true;
      if (currentSelector === selectPerpsMobileChaseEnabledFlag) return true;
      if (currentSelector === selectIsMetaMaskPushNotificationsEnabled) {
        return true;
      }
      return undefined;
    });

    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    expect(mockUseFeatureNotificationsStatus).not.toHaveBeenCalled();
  });

  it('keeps notification preferences for a retained Chase after rollout turns off', async () => {
    let isChaseEnabled = true;
    mockHasLiveChaseOrders = true;
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectPerpsMobileChaseEnabledFlag) {
        return isChaseEnabled;
      }
      if (selector === selectIsMetaMaskPushNotificationsEnabled) return true;
      return undefined;
    });
    mockSuspendChaseOrders.mockResolvedValueOnce([
      { handle: 'retained-chase', symbol: 'ETH', status: 'backgrounded' },
    ]);
    const view = render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    isChaseEnabled = false;
    view.rerender(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
  });

  it('reports the wallet-root suspension notification after parent unmount', async () => {
    mockHasLiveChaseOrders = true;
    mockSuspendChaseOrders.mockResolvedValueOnce([
      { handle: 'unmount-chase', symbol: 'ETH', status: 'backgrounded' },
    ]);
    const view = render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      view.unmount();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('does not start market data preload when perps is disabled', () => {
    mockUseSelector.mockReturnValue(false);

    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    expect(mockStartMarketDataPreload).not.toHaveBeenCalled();
    expect(mockStopMarketDataPreload).toHaveBeenCalledTimes(1);
  });

  it('suspends retained Chase before disconnecting when Perps is disabled', async () => {
    let isPerpsEnabled = true;
    mockHasLiveChaseOrders = true;
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return isPerpsEnabled;
      if (selector === selectPerpsMobileChaseEnabledFlag) return false;
      if (selector === selectIsMetaMaskPushNotificationsEnabled) return true;
      return undefined;
    });
    const view = render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    mockDisconnect.mockClear();

    isPerpsEnabled = false;
    view.rerender(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSuspendChaseOrders).toHaveBeenCalledTimes(1);
    expect(mockSuspendChaseOrders.mock.invocationCallOrder[0]).toBeLessThan(
      mockDisconnect.mock.invocationCallOrder[0],
    );
  });

  it('tracks converted Chase orders before disconnecting when Perps is disabled', async () => {
    let isPerpsEnabled = true;
    mockHasLiveChaseOrders = true;
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return isPerpsEnabled;
      if (selector === selectPerpsMobileChaseEnabledFlag) return false;
      if (selector === selectIsMetaMaskPushNotificationsEnabled) return true;
      return undefined;
    });
    mockSuspendChaseOrders.mockResolvedValueOnce([
      { handle: 'chase-disable', symbol: 'ETH', status: 'backgrounded' },
    ]);
    const view = render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    mockDisconnect.mockClear();

    isPerpsEnabled = false;
    view.rerender(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockTrack).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        interaction_type: 'chase_backgrounded_converted',
        asset: 'ETH',
      }),
    );
    expect(mockDisplayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          notification_id: 'perps-chase-backgrounded-chase-disable',
          notification_type: 'chase_backgrounded',
        },
      }),
    );
    expect(mockTrack.mock.invocationCallOrder[0]).toBeLessThan(
      mockDisconnect.mock.invocationCallOrder[0],
    );
  });

  it('registers AppState listener when perps is enabled', () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });

  it('does not register AppState listener when perps is disabled', () => {
    mockUseSelector.mockReturnValue(false);

    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  it('calls disconnect when app goes to background', async () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('disconnects without another suspension for rollout-off backgrounded history', async () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectPerpsMobileChaseEnabledFlag) return false;
      if (selector === selectIsMetaMaskPushNotificationsEnabled) return true;
      return undefined;
    });
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
    });

    expect(mockSuspendChaseOrders).not.toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('suspends before disconnecting while rollout-off discovery is unresolved', async () => {
    mockIsChaseOrderDiscoveryResolved = false;
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectPerpsMobileChaseEnabledFlag) return false;
      if (selector === selectIsMetaMaskPushNotificationsEnabled) return true;
      return undefined;
    });
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSuspendChaseOrders).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('fails closed on rollout rollback until empty discovery resolves', async () => {
    let isChaseEnabled = true;
    mockSuspendChaseOrders.mockResolvedValueOnce([
      {
        handle: 'chase-accepted-before-rollback',
        symbol: 'ETH',
        status: 'backgrounded',
      },
    ]);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectPerpsMobileChaseEnabledFlag) {
        return isChaseEnabled;
      }
      if (selector === selectIsMetaMaskPushNotificationsEnabled) return true;
      return undefined;
    });
    const view = render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    mockDisconnect.mockClear();

    isChaseEnabled = false;
    mockIsChaseOrderDiscoveryResolved = false;
    view.rerender(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSuspendChaseOrders).toHaveBeenCalledTimes(1);
    expect(mockSuspendChaseOrders.mock.invocationCallOrder[0]).toBeLessThan(
      mockDisconnect.mock.invocationCallOrder[0],
    );

    act(() => mockAppStateListener?.('active'));
    mockIsChaseOrderDiscoveryResolved = true;
    view.rerender(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    mockSuspendChaseOrders.mockClear();
    mockDisconnect.mockClear();
    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
    });

    expect(mockSuspendChaseOrders).not.toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('suspends retained Chase before disconnecting while rollout is off', async () => {
    let resolveSuspension: (() => void) | undefined;
    mockHasLiveChaseOrders = true;
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectPerpsMobileChaseEnabledFlag) return false;
      if (selector === selectIsMetaMaskPushNotificationsEnabled) return true;
      return undefined;
    });
    mockSuspendChaseOrders.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSuspension = () => resolve([]);
        }),
    );
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    act(() => {
      mockAppStateListener?.('background');
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSuspendChaseOrders).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).not.toHaveBeenCalled();

    await act(async () => {
      resolveSuspension?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(mockSuspendChaseOrders.mock.invocationCallOrder[0]).toBeLessThan(
      mockDisconnect.mock.invocationCallOrder[0],
    );
  });

  it('keeps one lifecycle subscription when Chase eligibility changes', async () => {
    let isChaseEnabled = true;
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectPerpsMobileChaseEnabledFlag) {
        return isChaseEnabled;
      }
      if (selector === selectIsMetaMaskPushNotificationsEnabled) return true;
      return undefined;
    });
    const { rerender } = render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    isChaseEnabled = false;
    mockHasLiveChaseOrders = true;
    rerender(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
    expect(mockSubscriptionRemove).not.toHaveBeenCalled();
    expect(mockResumeFromForeground).toHaveBeenCalledTimes(1);
    expect(mockSuspendChaseOrders).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('keeps Chase connected during a transient inactive state', async () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('inactive');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSuspendChaseOrders).not.toHaveBeenCalled();
    expect(mockDisconnect).not.toHaveBeenCalled();
  });

  it('disconnects on inactive when Chase suspension is unnecessary', async () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectPerpsMobileChaseEnabledFlag) return false;
      if (selector === selectIsMetaMaskPushNotificationsEnabled) return true;
      return undefined;
    });
    mockIsChaseOrderDiscoveryResolved = true;
    mockHasLiveChaseOrders = false;
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('inactive');
      await Promise.resolve();
    });

    expect(mockSuspendChaseOrders).not.toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('uses the leaving-active suspension decision after discovery resolves while inactive', async () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectPerpsMobileChaseEnabledFlag) return false;
      if (selector === selectIsMetaMaskPushNotificationsEnabled) return true;
      return undefined;
    });
    mockIsChaseOrderDiscoveryResolved = false;
    const view = render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    act(() => mockAppStateListener?.('inactive'));
    expect(mockDisconnect).not.toHaveBeenCalled();

    mockIsChaseOrderDiscoveryResolved = true;
    view.rerender(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSuspendChaseOrders).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('suspends before disconnecting when mounted while already inactive', async () => {
    Object.defineProperty(AppState, 'currentState', {
      get: () => 'inactive',
      configurable: true,
    });
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSuspendChaseOrders).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('upgrades a false inactive latch when retained Chase appears before background', async () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectPerpsMobileChaseEnabledFlag) return false;
      if (selector === selectIsMetaMaskPushNotificationsEnabled) return true;
      return undefined;
    });
    mockIsChaseOrderDiscoveryResolved = true;
    mockHasLiveChaseOrders = false;
    const view = render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    act(() => mockAppStateListener?.('inactive'));
    expect(mockDisconnect).toHaveBeenCalledTimes(1);

    mockHasLiveChaseOrders = true;
    view.rerender(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSuspendChaseOrders).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('suspends Chase orders once when iOS transitions through inactive to background', async () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('inactive');
      mockAppStateListener?.('background');
      await Promise.resolve();
    });

    expect(mockSuspendChaseOrders).toHaveBeenCalledTimes(1);
  });

  it('waits for Chase suspension before disconnecting', async () => {
    let resolveSuspension: (() => void) | undefined;
    mockSuspendChaseOrders.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSuspension = () => resolve([]);
        }),
    );
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    act(() => {
      mockAppStateListener?.('background');
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSuspendChaseOrders).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).not.toHaveBeenCalled();

    await act(async () => {
      resolveSuspension?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('schedules truthful backgrounding notice before suspension settles', async () => {
    let resolveSuspension: (() => void) | undefined;
    mockChaseOrders = [
      { handle: 'chase-live', symbol: 'ETH', status: 'active' },
    ];
    mockSuspendChaseOrders.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSuspension = () => resolve([]);
        }),
    );
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSuspendChaseOrders).toHaveBeenCalledTimes(1);
    expect(mockDisplayNotification).toHaveBeenCalledWith({
      id: 'perps-chase-backgrounded-chase-live',
      title: 'Securing Chase orders',
      body: 'MetaMask is stopping Chase repricing before disconnecting.',
      data: { notification_id: 'perps-chase-backgrounded-chase-live' },
    });
    await act(async () => resolveSuspension?.());
  });

  it('writes final conversion copy after a pending preliminary notification', async () => {
    let resolvePreliminaryNotification: (() => void) | undefined;
    let resolveSuspension:
      | ((orders: { handle: string; symbol: string; status: string }[]) => void)
      | undefined;
    mockChaseOrders = [
      { handle: 'chase-serialized', symbol: 'ETH', status: 'active' },
    ];
    mockSuspendChaseOrders.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSuspension = resolve;
        }),
    );
    mockDisplayNotification
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePreliminaryNotification = () => resolve(undefined);
          }),
      )
      .mockResolvedValueOnce(undefined);
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    expect(mockDisplayNotification).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ title: 'Securing Chase orders' }),
    );
    await act(async () => {
      resolveSuspension?.([
        {
          handle: 'chase-serialized',
          symbol: 'ETH',
          status: 'backgrounded',
        },
      ]);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolvePreliminaryNotification?.();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockDisplayNotification).toHaveBeenCalledTimes(2);
    expect(mockDisplayNotification).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ title: 'Chase became a limit order' }),
    );
  });

  it('skips the pre-suspension notice without notification permission', async () => {
    mockChaseOrders = [
      { handle: 'chase-no-permission', symbol: 'ETH', status: 'active' },
    ];
    mockIsPushPermissionGranted.mockResolvedValueOnce(false);
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockDisplayNotification).not.toHaveBeenCalled();
    expect(mockSuspendChaseOrders).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('continues suspension and disconnect after pre-suspension notice failure', async () => {
    mockChaseOrders = [
      { handle: 'chase-notice-failure', symbol: 'ETH', status: 'active' },
    ];
    mockDisplayNotification.mockRejectedValueOnce(new Error('display failed'));
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    expect(mockSuspendChaseOrders).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('skips queued suspension after repeated background and foreground transitions', async () => {
    let resolveFirstSuspension: (() => void) | undefined;
    mockSuspendChaseOrders.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirstSuspension = () => resolve([]);
        }),
    );
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    act(() => {
      mockAppStateListener?.('background');
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockSuspendChaseOrders).toHaveBeenCalledTimes(1);

    act(() => {
      mockAppStateListener?.('active');
      mockAppStateListener?.('background');
      mockAppStateListener?.('active');
    });
    await act(async () => {
      resolveFirstSuspension?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSuspendChaseOrders).toHaveBeenCalledTimes(1);
  });

  it('notifies and tracks converted Chase orders after suspension', async () => {
    mockSuspendChaseOrders.mockResolvedValueOnce([
      { handle: 'chase-backgrounded', symbol: 'ETH', status: 'backgrounded' },
    ]);
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockTrack).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        interaction_type: 'chase_backgrounded_converted',
        asset: 'ETH',
      }),
    );
    expect(mockDisplayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          notification_id: 'perps-chase-backgrounded-chase-backgrounded',
          notification_type: 'chase_backgrounded',
        },
        title: 'Chase became a limit order',
      }),
    );
    expect(mockDisplayNotification.mock.calls[0][0]).not.toHaveProperty(
      'pressActionId',
    );
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('uses final conversion copy only for confirmed Backgrounded orders', async () => {
    mockSuspendChaseOrders.mockResolvedValueOnce([
      { handle: 'chase-still-active', symbol: 'BTC', status: 'active' },
      { handle: 'chase-converted', symbol: 'ETH', status: 'backgrounded' },
    ]);
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ asset: 'ETH' }),
    );
    expect(mockDisplayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'perps-chase-backgrounded-chase-converted',
        title: 'Chase became a limit order',
        body: 'Your Chase order is now resting as a limit order at its last chased price.',
      }),
    );
  });

  it('reports every asset and uses truthful copy for multiple suspended orders', async () => {
    mockSuspendChaseOrders.mockResolvedValueOnce([
      { handle: 'chase-b', symbol: 'ETH', status: 'backgrounded' },
      { handle: 'chase-a', symbol: 'BTC', status: 'backgrounded' },
    ]);
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockTrack).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ asset: 'ETH' }),
    );
    expect(mockTrack).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ asset: 'BTC' }),
    );
    expect(mockDisplayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'perps-chase-backgrounded-chase-a-chase-b',
        title: 'Chase became a limit order',
        data: {
          notification_id: 'perps-chase-backgrounded-chase-a-chase-b',
          notification_type: 'chase_backgrounded',
        },
        body: '2 Chase orders are now resting as limit orders at their last chased prices.',
      }),
    );
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('notifies a previously denied batch after permission is granted', async () => {
    mockIsPushPermissionGranted
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const backgroundedOrder = {
      handle: 'chase-permission-retry',
      symbol: 'ETH',
      status: 'backgrounded',
    };
    mockSuspendChaseOrders.mockResolvedValue([backgroundedOrder]);
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockDisplayNotification).not.toHaveBeenCalled();
    act(() => mockAppStateListener?.('active'));
    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockDisplayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'perps-chase-backgrounded-chase-permission-retry',
      }),
    );
    expect(mockDisconnect).toHaveBeenCalledTimes(2);
  });

  it('skips background notification when global push is disabled', async () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectPerpsMobileChaseEnabledFlag) return true;
      if (selector === selectIsMetaMaskPushNotificationsEnabled) return false;
      return undefined;
    });
    mockSuspendChaseOrders.mockResolvedValueOnce([
      {
        handle: 'chase-background-disabled',
        symbol: 'ETH',
        status: 'backgrounded',
      },
    ]);
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockIsPushPermissionGranted).not.toHaveBeenCalled();
    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  it('skips background notification when Perps push is disabled', async () => {
    mockIsPerpsPushNotificationsEnabled = false;
    mockSuspendChaseOrders.mockResolvedValueOnce([
      {
        handle: 'chase-background-perps-disabled',
        symbol: 'ETH',
        status: 'backgrounded',
      },
    ]);
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockIsPushPermissionGranted).not.toHaveBeenCalled();
    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  it('skips background notification after unmount during permission check', async () => {
    let resolvePermission: ((isGranted: boolean) => void) | undefined;
    mockIsPushPermissionGranted.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePermission = resolve;
        }),
    );
    mockSuspendChaseOrders.mockResolvedValue([
      {
        handle: 'chase-background-unmount',
        symbol: 'ETH',
        status: 'backgrounded',
      },
    ]);
    const view = render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
    });
    view.unmount();
    await act(async () => {
      resolvePermission?.(true);
      await Promise.resolve();
    });

    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  it('retries background notification after display failure', async () => {
    const backgroundedOrder = {
      handle: 'chase-background-display-retry',
      symbol: 'ETH',
      status: 'backgrounded',
    };
    mockSuspendChaseOrders.mockResolvedValue([backgroundedOrder]);
    mockDisplayNotification
      .mockRejectedValueOnce(new Error('display failed'))
      .mockResolvedValueOnce(undefined);
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    act(() => mockAppStateListener?.('active'));
    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockDisplayNotification).toHaveBeenCalledTimes(2);
  });

  it('reports each backgrounded Chase handle only on its first transition', async () => {
    const backgroundedOrder = {
      handle: 'chase-repeated-background',
      symbol: 'ETH',
      status: 'backgrounded',
    };
    mockSuspendChaseOrders.mockResolvedValue([backgroundedOrder]);
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
    });
    act(() => mockAppStateListener?.('active'));
    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSuspendChaseOrders).toHaveBeenCalledTimes(2);
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
  });

  it('disconnects when Chase suspension reaches the hook timeout', async () => {
    mockSuspendChaseOrders.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error('Chase mutation timed out')),
            CHASE_ORDER_UI_CONFIG.BackgroundSuspensionTimeoutMs,
          );
        }),
    );
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    act(() => {
      mockAppStateListener?.('background');
    });
    await act(async () => Promise.resolve());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        CHASE_ORDER_UI_CONFIG.BackgroundSuspensionTimeoutMs,
      );
    });

    expect(mockSuspendChaseOrders).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('still disconnects without notifying when Chase suspension fails', async () => {
    mockSuspendChaseOrders.mockRejectedValueOnce(new Error('suspend failed'));
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockDisplayNotification).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('reports a successful partial suspension before disconnecting', async () => {
    const suspendedOrder = {
      handle: 'chase-partial',
      symbol: 'ETH',
      status: 'backgrounded',
    };
    mockSuspendChaseOrders.mockRejectedValueOnce(
      new ChaseOrderSuspensionError({
        suspendedOrders: [suspendedOrder] as never[],
        failures: [
          {
            providerId: secondaryProvider,
            reason: new Error('secondary provider failed'),
          },
        ],
      }),
    );
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockTrack).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ asset: 'ETH' }),
    );
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    expect(mockTrack.mock.invocationCallOrder[0]).toBeLessThan(
      mockDisconnect.mock.invocationCallOrder[0],
    );
  });

  it('reports a late suspension event once with its asset', async () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    const lateOrder = {
      handle: 'late-suspension',
      symbol: 'SOL',
      status: 'backgrounded',
    } as never;

    await act(async () => {
      reportSuspendedChaseOrders([lateOrder]);
      reportSuspendedChaseOrders([lateOrder]);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        interaction_type: 'chase_backgrounded_converted',
        asset: 'SOL',
      }),
    );
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
  });

  it('reports timeout-late suspension once after Chase rollout turns off', async () => {
    let isChaseEnabled = true;
    mockHasLiveChaseOrders = true;
    mockSuspendChaseOrders.mockRejectedValueOnce(
      new Error('Chase suspension timed out'),
    );
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectPerpsMobileChaseEnabledFlag) {
        return isChaseEnabled;
      }
      if (selector === selectIsMetaMaskPushNotificationsEnabled) return true;
      return undefined;
    });
    const view = render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    await act(async () => {
      mockAppStateListener?.('background');
      await Promise.resolve();
      await Promise.resolve();
    });
    isChaseEnabled = false;
    view.rerender(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    const lateOrder = {
      handle: 'rollout-off-late-suspension',
      symbol: 'SOL',
      status: 'backgrounded',
    } as never;

    await act(async () => {
      reportSuspendedChaseOrders([lateOrder]);
      reportSuspendedChaseOrders([lateOrder]);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        interaction_type: 'chase_backgrounded_converted',
        asset: 'SOL',
      }),
    );
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
  });

  it('buffers wallet-unmount late suspension until one remount', async () => {
    mockHasLiveChaseOrders = true;
    mockSuspendChaseOrders.mockRejectedValueOnce(
      new Error('Chase suspension timed out'),
    );
    const first = render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    const lateOrder = {
      handle: 'wallet-unmount-late-suspension',
      symbol: 'ETH',
      status: 'backgrounded',
    } as never;

    act(() => {
      first.unmount();
    });
    await act(async () => {
      await Promise.resolve();
      reportSuspendedChaseOrders([lateOrder]);
      reportSuspendedChaseOrders([lateOrder]);
      await Promise.resolve();
    });
    expect(mockDisplayNotification).not.toHaveBeenCalled();

    const second = render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        interaction_type: 'chase_backgrounded_converted',
        asset: 'ETH',
      }),
    );
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);

    second.unmount();
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
  });

  it('calls resumeFromForeground after delay when app returns to foreground', () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    // Clear the initial mount call
    mockResumeFromForeground.mockClear();

    act(() => {
      mockAppStateListener?.('background');
    });
    act(() => {
      mockAppStateListener?.('active');
    });

    // Should not reconnect immediately — uses a timer delay
    expect(mockResumeFromForeground).not.toHaveBeenCalled();

    act(() => {
      jest.runAllTimers();
    });

    expect(mockResumeFromForeground).toHaveBeenCalledTimes(1);
  });

  it('cancels pending reconnect timer if app goes background before timer fires', async () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    mockResumeFromForeground.mockClear();

    // Goes active — schedules reconnect timer
    act(() => {
      mockAppStateListener?.('active');
    });

    // Goes background before timer fires — cancels the pending reconnect
    act(() => {
      mockAppStateListener?.('background');
    });

    act(() => {
      jest.runAllTimers();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // resumeFromForeground should NOT have been called (timer was cancelled)
    expect(mockResumeFromForeground).not.toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('only disconnects once on iOS active→inactive→background sequence', async () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    mockDisconnect.mockClear();

    // iOS fires active → inactive → background when backgrounding. Chase waits
    // for the real background transition.
    act(() => {
      mockAppStateListener?.('inactive');
    });
    act(() => {
      mockAppStateListener?.('background');
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('does not disconnect a foreground reconnect after a transient inactive state', async () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    mockResumeFromForeground.mockClear();
    mockDisconnect.mockClear();

    // Pull-down: active → inactive → active
    act(() => {
      mockAppStateListener?.('inactive');
    });
    act(() => {
      mockAppStateListener?.('active'); // schedule reconnect
    });

    act(() => {
      jest.runAllTimers();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockDisconnect).not.toHaveBeenCalled();
    expect(mockResumeFromForeground).toHaveBeenCalledTimes(1);
  });

  it('retries connection when initial resumeFromForeground fails', async () => {
    // Arrange: make initial connect reject
    mockResumeFromForeground.mockRejectedValueOnce(
      new Error('initial failure'),
    );
    // Subsequent calls succeed
    mockResumeFromForeground.mockResolvedValue(undefined);

    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    // Flush the rejection microtask so the .catch() handler runs
    // and schedules the retry timer
    await act(async () => {
      await Promise.resolve();
    });

    // Now advance timers to fire the retry setTimeout
    await act(async () => {
      jest.runAllTimers();
    });

    // Initial call (rejected) + retry call from the timer
    expect(mockResumeFromForeground).toHaveBeenCalledTimes(2);
  });

  it('clears existing reconnect timer when scheduling a new one', () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    mockResumeFromForeground.mockClear();

    // First foreground event schedules a timer
    act(() => {
      mockAppStateListener?.('background');
    });
    act(() => {
      mockAppStateListener?.('active');
    });

    // Second foreground event before the first timer fires — should clear the first
    act(() => {
      mockAppStateListener?.('background');
    });
    act(() => {
      mockAppStateListener?.('active');
    });

    // Only one timer should fire (the second one replaced the first)
    act(() => {
      jest.runAllTimers();
    });

    expect(mockResumeFromForeground).toHaveBeenCalledTimes(1);
  });

  it('logs error when foreground reconnect timer callback fails', async () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    mockResumeFromForeground.mockClear();
    // Make the delayed reconnect reject
    mockResumeFromForeground.mockRejectedValueOnce(
      new Error('reconnect failed'),
    );

    // Trigger foreground → schedules timer
    act(() => {
      mockAppStateListener?.('background');
    });
    act(() => {
      mockAppStateListener?.('active');
    });

    // Fire the timer — the catch logs but does not throw
    await act(async () => {
      jest.runAllTimers();
    });

    expect(mockResumeFromForeground).toHaveBeenCalledTimes(1);
  });

  it('suspends Chase before disconnecting on Wallet-root unmount', async () => {
    let resolveSuspension: ((orders: []) => void) | undefined;
    mockSuspendChaseOrders.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSuspension = resolve;
        }),
    );
    const { unmount } = render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    mockDisconnect.mockClear();

    act(() => {
      unmount();
    });

    expect(mockSuspendChaseOrders).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).not.toHaveBeenCalled();
    await act(async () => resolveSuspension?.([]));

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(mockSuspendChaseOrders.mock.invocationCallOrder[0]).toBeLessThan(
      mockDisconnect.mock.invocationCallOrder[0],
    );
    expect(mockSubscriptionRemove).toHaveBeenCalledTimes(1);
    expect(mockStopMarketDataPreload).toHaveBeenCalledTimes(1);
  });
});
