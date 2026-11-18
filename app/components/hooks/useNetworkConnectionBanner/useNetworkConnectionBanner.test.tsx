import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { legacy_createStore as createStore } from 'redux';
import { Provider } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import useNetworkConnectionBanner, {
  SLOW_NETWORK_BANNER_SNOOZE_MS,
} from './useNetworkConnectionBanner';
import { useSettledNetworkLatency } from '../../../hooks/useNetworkLatency';
import StorageWrapper from '../../../store/storage-wrapper';
import { SLOW_NETWORK_BANNER_DISMISSED_AT } from '../../../constants/storage';
import { createMockRouteMessenger } from '../../../util/test/mock-route-messenger';
import { RouteMessengerContext } from '../../../contexts/route-messenger';
import type { RouteMessenger } from '../../../messengers/route-messenger';
import { useAnalytics } from '../useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  selectNetworkConnectionBannerStatus,
  selectNetworkConnectionBannerNetwork,
} from '../../../selectors/networkConnectionBanner';
import Routes from '../../../constants/navigation/Routes';
import { isPublicEndpointUrl } from '../../../core/Engine/controllers/network-controller/utils';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { selectSlowNetworkBannerEnabled } from '../../../selectors/featureFlagController/slowNetworkBanner';
import {
  getHardwareTier,
  getNetworkTierSnapshot,
} from '../../../util/deviceCapability';
import { AppStateEventProcessor } from '../../../core/AppStateEventListener';

jest.mock('@react-navigation/native');
jest.mock('../useAnalytics/useAnalytics');
jest.mock('../../../selectors/networkConnectionBanner');
jest.mock('../../../hooks/useNetworkLatency');
jest.mock('../../../selectors/featureFlagController/slowNetworkBanner');
jest.mock('../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(),
  getNetworkTierSnapshot: jest.fn(),
}));
jest.mock('../../../core/AppStateEventListener', () => ({
  AppStateEventProcessor: { getOpenedAt: jest.fn() },
}));
jest.mock('../../../core/Engine/controllers/network-controller/utils', () => ({
  ...jest.requireActual(
    '../../../core/Engine/controllers/network-controller/utils',
  ),
  isPublicEndpointUrl: jest.fn(),
}));
jest.mock('../../../constants/network', () => ({
  ...jest.requireActual('../../../constants/network'),
  INFURA_PROJECT_ID: 'test-infura-project-id',
}));

const SWITCH_TO_INFURA_ACTION =
  'NetworkConnectionBannerController:switchToDefaultInfuraRpcEndpoint';

// A minimal store whose snapshot changes on every SYNC dispatch. The banner
// selectors are mocked, so the store content is irrelevant, but changing the
// snapshot forces `useSelector` to re-read the mocks between renders, which
// simulates the controller syncing new state into redux.
const storeReducer = (
  state: { tick: number } | undefined,
  action: { type: string },
) => {
  const current = state ?? { tick: 0 };
  return action.type === 'SYNC' ? { tick: current.tick + 1 } : current;
};

const mockNavigate = jest.fn();
const mockShowToast = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: jest.fn() },
};

const statusMock = jest.mocked(selectNetworkConnectionBannerStatus);
const networkMock = jest.mocked(selectNetworkConnectionBannerNetwork);
const latencyMock = jest.mocked(useSettledNetworkLatency);
const getItemSyncMock = jest.mocked(StorageWrapper.getItemSync);
const setItemMock = jest.mocked(StorageWrapper.setItem);

/**
 * Configure the mocked controller selectors to describe a failing network.
 *
 * @param overrides - Partial `FailedNetwork` fields to override the defaults.
 * @returns The full failing-network object the selector will return.
 */
function mockFailedNetwork(overrides: Record<string, unknown> = {}) {
  const network = {
    networkClientId: 'test-client',
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/test-infura-project-id',
    chainId: '0x1',
    isInfuraEndpoint: true,
    switchableInfuraNetworkClientId: null,
    ...overrides,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  networkMock.mockReturnValue(network as any);
  return network;
}

describe('useNetworkConnectionBanner', () => {
  let mockTrackEvent: jest.Mock;
  let mockBuild: jest.Mock;
  let mockAddProperties: jest.Mock;
  let mockCreateEventBuilder: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    statusMock.mockReturnValue('available');
    networkMock.mockReturnValue(null);
    latencyMock.mockReturnValue('OK');
    getItemSyncMock.mockReturnValue(null);
    jest.mocked(selectSlowNetworkBannerEnabled).mockReturnValue(true);
    jest.mocked(getHardwareTier).mockReturnValue('MID');
    jest.mocked(getNetworkTierSnapshot).mockReturnValue('WIFI');
    jest.mocked(AppStateEventProcessor.getOpenedAt).mockReturnValue(0);
    setItemMock.mockResolvedValue(undefined);

    (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });
    jest.mocked(isPublicEndpointUrl).mockReturnValue(true);

    mockTrackEvent = jest.fn();
    mockBuild = jest.fn(() => ({ event: 'test-event', properties: {} }));
    mockAddProperties = jest.fn().mockReturnThis();
    mockCreateEventBuilder = jest.fn(() => ({
      addProperties: mockAddProperties,
      build: mockBuild,
    }));
    (useAnalytics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });
  });

  const renderHookWithProviders = (
    routeMessenger: RouteMessenger = createMockRouteMessenger(),
  ) => {
    const store = createStore(storeReducer);
    const utils = renderHook(() => useNetworkConnectionBanner(), {
      wrapper: ({ children }) => (
        <Provider store={store}>
          <RouteMessengerContext.Provider value={routeMessenger}>
            <ToastContext.Provider
              value={
                { toastRef: mockToastRef } as unknown as React.ContextType<
                  typeof ToastContext
                >
              }
            >
              {children}
            </ToastContext.Provider>
          </RouteMessengerContext.Provider>
        </Provider>
      ),
    });
    // Bump the store snapshot so `useSelector` re-reads the mocked selectors,
    // mirroring the controller syncing new state into redux.
    const syncControllerState = () =>
      act(() => {
        store.dispatch({ type: 'SYNC' });
      });
    return { ...utils, syncControllerState };
  };

  it('returns the banner state from the controller selectors', () => {
    const { result } = renderHookWithProviders();
    expect(result.current.status).toBe('available');
    expect(result.current.network).toBeNull();
  });

  it('fires the banner shown analytics event when the banner becomes visible', () => {
    statusMock.mockReturnValue('degraded');
    mockFailedNetwork();

    renderHookWithProviders();

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.NETWORK_CONNECTION_BANNER_SHOWN,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        banner_type: 'degraded',
        chain_id_caip: 'eip155:1',
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('does not fire a second shown event when the failing network is re-saved with the same status and client id', () => {
    statusMock.mockReturnValue('degraded');
    mockFailedNetwork({ networkClientId: 'mainnet' });

    const { syncControllerState } = renderHookWithProviders();
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    // The controller re-saves the failing network on every re-evaluation, so a
    // new object reference arrives with the same status and client id.
    mockFailedNetwork({ networkClientId: 'mainnet' });
    syncControllerState();

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('fires a new shown event when the banner escalates from degraded to unavailable', () => {
    statusMock.mockReturnValue('degraded');
    mockFailedNetwork({ networkClientId: 'mainnet' });

    const { syncControllerState } = renderHookWithProviders();
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    statusMock.mockReturnValue('unavailable');
    mockFailedNetwork({ networkClientId: 'mainnet' });
    syncControllerState();

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
  });

  it('fires again after the banner hides and the same network fails once more', () => {
    statusMock.mockReturnValue('degraded');
    mockFailedNetwork({ networkClientId: 'mainnet' });

    const { syncControllerState } = renderHookWithProviders();
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    statusMock.mockReturnValue('available');
    networkMock.mockReturnValue(null);
    syncControllerState();

    statusMock.mockReturnValue('degraded');
    mockFailedNetwork({ networkClientId: 'mainnet' });
    syncControllerState();

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
  });

  it('does not fire analytics when the banner is hidden', () => {
    renderHookWithProviders();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  describe('isSlowNetwork', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    });

    afterEach(() => {
      jest.mocked(Date.now).mockRestore();
    });

    it('is true when latency is slow and the RPC banner is hidden', () => {
      latencyMock.mockReturnValue('SLOW');

      const { result } = renderHookWithProviders();

      expect(result.current.isSlowNetwork).toBe(true);
    });

    it('is false when latency is not slow', () => {
      latencyMock.mockReturnValue('UNKNOWN');

      const { result } = renderHookWithProviders();

      expect(result.current.isSlowNetwork).toBe(false);
    });

    it('takes priority over the "Still connecting" RPC banner', () => {
      latencyMock.mockReturnValue('SLOW');
      statusMock.mockReturnValue('degraded');
      mockFailedNetwork();

      const { result } = renderHookWithProviders();

      expect(result.current.isSlowNetwork).toBe(true);
      expect(result.current.isVisible).toBe(true);
    });

    it('gives way to the "Unable to connect" RPC banner', () => {
      latencyMock.mockReturnValue('SLOW');
      statusMock.mockReturnValue('unavailable');
      mockFailedNetwork();

      const { result } = renderHookWithProviders();

      expect(result.current.isSlowNetwork).toBe(false);
      expect(result.current.isVisible).toBe(true);
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ banner_type: 'unavailable' }),
      );
    });

    it('does not send the RPC banner shown event while the slow banner shows', async () => {
      latencyMock.mockReturnValue('SLOW');
      statusMock.mockReturnValue('degraded');
      mockFailedNetwork();

      renderHookWithProviders();
      await act(async () => undefined);

      expect(mockAddProperties).not.toHaveBeenCalledWith(
        expect.objectContaining({ banner_type: 'degraded' }),
      );
    });

    it('is false when the slowNetworkBanner flag is off', () => {
      jest.mocked(selectSlowNetworkBannerEnabled).mockReturnValue(false);
      latencyMock.mockReturnValue('SLOW');

      const { result } = renderHookWithProviders();

      expect(result.current.isSlowNetwork).toBe(false);
      expect(result.current.isVisible).toBe(false);
    });

    it('shows the RPC banner once the slow banner is dismissed', () => {
      latencyMock.mockReturnValue('SLOW');
      statusMock.mockReturnValue('degraded');
      mockFailedNetwork();
      const { result } = renderHookWithProviders();

      act(() => {
        result.current.dismissSlowNetwork();
      });

      expect(result.current.isSlowNetwork).toBe(false);
      expect(result.current.isVisible).toBe(true);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_SHOWN,
      );
    });

    it('is false within a week of being dismissed', () => {
      latencyMock.mockReturnValue('SLOW');
      getItemSyncMock.mockReturnValue(
        String(Date.now() - SLOW_NETWORK_BANNER_SNOOZE_MS + 60_000),
      );

      const { result } = renderHookWithProviders();

      expect(result.current.isSlowNetwork).toBe(false);
    });

    it('is true again once a week has passed since dismissal', () => {
      latencyMock.mockReturnValue('SLOW');
      getItemSyncMock.mockReturnValue(
        String(Date.now() - SLOW_NETWORK_BANNER_SNOOZE_MS - 60_000),
      );

      const { result } = renderHookWithProviders();

      expect(result.current.isSlowNetwork).toBe(true);
    });

    it('hides the banner and stores the dismissal time when dismissed', () => {
      latencyMock.mockReturnValue('SLOW');
      const { result } = renderHookWithProviders();

      act(() => {
        result.current.dismissSlowNetwork();
      });

      expect(result.current.isSlowNetwork).toBe(false);
      expect(setItemMock).toHaveBeenCalledWith(
        SLOW_NETWORK_BANNER_DISMISSED_AT,
        expect.stringMatching(/^\d+$/),
      );
    });

    it('turns false when the device goes offline', () => {
      latencyMock.mockReturnValue('SLOW');
      const { result, rerender } = renderHookWithProviders();

      latencyMock.mockReturnValue('UNKNOWN');
      rerender(undefined);

      expect(result.current.isSlowNetwork).toBe(false);
    });

    it('stays dismissed when the stored dismissal cannot be read back', () => {
      latencyMock.mockReturnValue('SLOW');
      const { result, rerender } = renderHookWithProviders();
      act(() => {
        result.current.dismissSlowNetwork();
      });

      latencyMock.mockReturnValue('OK');
      rerender(undefined);
      latencyMock.mockReturnValue('SLOW');
      rerender(undefined);

      expect(getItemSyncMock).toHaveReturnedWith(null);
      expect(result.current.isSlowNetwork).toBe(false);
    });

    it('turns false once latency reads OK', () => {
      latencyMock.mockReturnValue('SLOW');
      const { result, rerender } = renderHookWithProviders();

      latencyMock.mockReturnValue('OK');
      rerender(undefined);

      expect(result.current.isSlowNetwork).toBe(false);
    });

    it('shows again mid-session once the week has run out', () => {
      latencyMock.mockReturnValue('SLOW');
      getItemSyncMock.mockReturnValue(
        String(Date.now() - SLOW_NETWORK_BANNER_SNOOZE_MS + 60_000),
      );
      const { result, rerender } = renderHookWithProviders();
      expect(result.current.isSlowNetwork).toBe(false);

      latencyMock.mockReturnValue('OK');
      rerender(undefined);
      jest.mocked(Date.now).mockReturnValue(1_800_000_000_000 + 2 * 60_000);
      latencyMock.mockReturnValue('SLOW');
      rerender(undefined);

      expect(result.current.isSlowNetwork).toBe(true);
    });

    it('shows again on return to foreground once the week has run out, while latency stays slow', () => {
      let emitAppState: (state: AppStateStatus) => void = () => undefined;
      jest
        .spyOn(AppState, 'addEventListener')
        .mockImplementation((_, listener) => {
          emitAppState = listener;
          return { remove: jest.fn() };
        });
      latencyMock.mockReturnValue('SLOW');
      getItemSyncMock.mockReturnValue(
        String(Date.now() - SLOW_NETWORK_BANNER_SNOOZE_MS + 60_000),
      );
      const { result } = renderHookWithProviders();
      expect(result.current.isSlowNetwork).toBe(false);

      act(() => emitAppState('background'));
      jest.mocked(Date.now).mockReturnValue(1_800_000_000_000 + 2 * 60_000);
      act(() => emitAppState('active'));

      expect(result.current.isSlowNetwork).toBe(true);
    });

    it('stays snoozed on return to foreground within the week', () => {
      let emitAppState: (state: AppStateStatus) => void = () => undefined;
      jest
        .spyOn(AppState, 'addEventListener')
        .mockImplementation((_, listener) => {
          emitAppState = listener;
          return { remove: jest.fn() };
        });
      latencyMock.mockReturnValue('SLOW');
      getItemSyncMock.mockReturnValue(
        String(Date.now() - SLOW_NETWORK_BANNER_SNOOZE_MS + 60_000),
      );
      const { result } = renderHookWithProviders();

      act(() => emitAppState('background'));
      jest.mocked(Date.now).mockReturnValue(1_800_000_000_000 + 30_000);
      act(() => emitAppState('active'));

      expect(result.current.isSlowNetwork).toBe(false);
    });

    it('is true when the stored dismissal time is in the future', () => {
      latencyMock.mockReturnValue('SLOW');
      getItemSyncMock.mockReturnValue(String(Date.now() + 60_000));

      const { result } = renderHookWithProviders();

      expect(result.current.isSlowNetwork).toBe(true);
    });
  });

  describe('slow network analytics', () => {
    const SHOWN_AT_MS = 1_800_000_000_000;

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(SHOWN_AT_MS);
      jest
        .mocked(AppStateEventProcessor.getOpenedAt)
        .mockReturnValue(SHOWN_AT_MS - 4_200);
    });

    afterEach(() => {
      jest.mocked(Date.now).mockRestore();
    });

    it('sends the shown event once with the slow banner properties', () => {
      latencyMock.mockReturnValue('SLOW');
      const { rerender } = renderHookWithProviders();

      rerender(undefined);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_SHOWN,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        banner_type: 'slow',
        hardware_tier: 'MID',
        network_tier: 'WIFI',
        rpc_status: 'available',
        seconds_since_app_open: 4,
        previously_dismissed: false,
      });
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('marks the shown event when the banner was dismissed before', () => {
      latencyMock.mockReturnValue('SLOW');
      getItemSyncMock.mockReturnValue(
        String(SHOWN_AT_MS - SLOW_NETWORK_BANNER_SNOOZE_MS - 60_000),
      );

      renderHookWithProviders();

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ previously_dismissed: true }),
      );
    });

    it('sends unknown tiers when they cannot be read', () => {
      jest.mocked(getHardwareTier).mockReturnValue(null);
      jest.mocked(getNetworkTierSnapshot).mockReturnValue(null);
      latencyMock.mockReturnValue('SLOW');

      renderHookWithProviders();

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          hardware_tier: 'UNKNOWN',
          network_tier: 'UNKNOWN',
        }),
      );
    });

    it('sends the hidden event with the user trigger and how long the banner was visible', () => {
      latencyMock.mockReturnValue('SLOW');
      const { result } = renderHookWithProviders();

      jest.mocked(Date.now).mockReturnValue(SHOWN_AT_MS + 3_500);
      act(() => {
        result.current.dismissSlowNetwork();
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_HIDDEN,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        banner_type: 'slow',
        hardware_tier: 'MID',
        network_tier: 'WIFI',
        trigger: 'user',
        duration_ms: 3_500,
      });
    });

    it('sends the hidden event with the auto trigger when latency recovers while the banner shows', () => {
      latencyMock.mockReturnValue('SLOW');
      const { rerender } = renderHookWithProviders();

      jest.mocked(Date.now).mockReturnValue(SHOWN_AT_MS + 12_000);
      latencyMock.mockReturnValue('OK');
      rerender(undefined);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_HIDDEN,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ trigger: 'auto', duration_ms: 12_000 }),
      );
    });

    it('sends only the user hidden event when latency recovers after a dismissal', () => {
      latencyMock.mockReturnValue('SLOW');
      const { result, rerender } = renderHookWithProviders();

      act(() => {
        result.current.dismissSlowNetwork();
      });
      latencyMock.mockReturnValue('OK');
      rerender(undefined);

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ trigger: 'user' }),
      );
      expect(mockAddProperties).not.toHaveBeenCalledWith(
        expect.objectContaining({ trigger: 'auto' }),
      );
    });

    it('hides the banner without a hidden event when the device goes offline', () => {
      latencyMock.mockReturnValue('SLOW');
      const { result, rerender } = renderHookWithProviders();

      jest.mocked(Date.now).mockReturnValue(SHOWN_AT_MS + 5_000);
      latencyMock.mockReturnValue('UNKNOWN');
      rerender(undefined);

      expect(result.current.isSlowNetwork).toBe(false);
      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_HIDDEN,
      );
    });

    it('keeps one shown event and leaves out offline time when the device reconnects slow', () => {
      latencyMock.mockReturnValue('SLOW');
      const { rerender } = renderHookWithProviders();

      jest.mocked(Date.now).mockReturnValue(SHOWN_AT_MS + 5_000);
      latencyMock.mockReturnValue('UNKNOWN');
      rerender(undefined);

      jest.mocked(Date.now).mockReturnValue(SHOWN_AT_MS + 60_000);
      latencyMock.mockReturnValue('SLOW');
      rerender(undefined);

      jest.mocked(Date.now).mockReturnValue(SHOWN_AT_MS + 62_000);
      latencyMock.mockReturnValue('OK');
      rerender(undefined);

      expect(
        mockCreateEventBuilder.mock.calls.filter(
          ([event]) =>
            event === MetaMetricsEvents.NETWORK_CONNECTION_BANNER_SHOWN,
        ),
      ).toHaveLength(1);
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ duration_ms: 7_000 }),
      );
    });

    it('leaves out time the app spent in the background', () => {
      let emitAppState: (state: AppStateStatus) => void = () => undefined;
      jest
        .spyOn(AppState, 'addEventListener')
        .mockImplementation((_, listener) => {
          emitAppState = listener;
          return { remove: jest.fn() };
        });
      latencyMock.mockReturnValue('SLOW');
      const { result } = renderHookWithProviders();

      jest.mocked(Date.now).mockReturnValue(SHOWN_AT_MS + 2_000);
      act(() => emitAppState('background'));
      jest.mocked(Date.now).mockReturnValue(SHOWN_AT_MS + 10_800_000);
      act(() => emitAppState('active'));
      jest.mocked(Date.now).mockReturnValue(SHOWN_AT_MS + 10_801_000);
      act(() => {
        result.current.dismissSlowNetwork();
      });

      expect(
        mockCreateEventBuilder.mock.calls.filter(
          ([event]) =>
            event === MetaMetricsEvents.NETWORK_CONNECTION_BANNER_SHOWN,
        ),
      ).toHaveLength(1);
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ duration_ms: 3_000 }),
      );
    });

    it('keeps one shown event and counts only visible time while "Unable to connect" covers the banner', () => {
      latencyMock.mockReturnValue('SLOW');
      const { rerender, syncControllerState } = renderHookWithProviders();

      jest.mocked(Date.now).mockReturnValue(SHOWN_AT_MS + 2_000);
      statusMock.mockReturnValue('unavailable');
      mockFailedNetwork();
      syncControllerState();

      jest.mocked(Date.now).mockReturnValue(SHOWN_AT_MS + 10_000);
      statusMock.mockReturnValue('available');
      networkMock.mockReturnValue(null);
      syncControllerState();

      jest.mocked(Date.now).mockReturnValue(SHOWN_AT_MS + 13_000);
      latencyMock.mockReturnValue('OK');
      rerender(undefined);

      expect(
        mockAddProperties.mock.calls.filter(
          ([properties]) =>
            properties.banner_type === 'slow' && 'rpc_status' in properties,
        ),
      ).toHaveLength(1);
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ duration_ms: 5_000 }),
      );
    });

    it('does not send a second "Still connecting" shown event after the slow banner clears', () => {
      statusMock.mockReturnValue('degraded');
      mockFailedNetwork();
      const { rerender } = renderHookWithProviders();

      latencyMock.mockReturnValue('SLOW');
      rerender(undefined);
      latencyMock.mockReturnValue('OK');
      rerender(undefined);

      expect(
        mockAddProperties.mock.calls.filter(
          ([properties]) => properties.banner_type === 'degraded',
        ),
      ).toHaveLength(1);
    });

    it('sends no slow banner events while it is snoozed', () => {
      latencyMock.mockReturnValue('SLOW');
      getItemSyncMock.mockReturnValue(String(SHOWN_AT_MS - 60_000));

      renderHookWithProviders();

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });

  describe('isVisible', () => {
    it('is true while the RPC banner shows', () => {
      statusMock.mockReturnValue('unavailable');
      mockFailedNetwork();

      const { result } = renderHookWithProviders();

      expect(result.current.isVisible).toBe(true);
    });

    it('is true while the slow network banner shows', () => {
      latencyMock.mockReturnValue('SLOW');

      const { result } = renderHookWithProviders();

      expect(result.current.isVisible).toBe(true);
    });

    it('is false when neither banner shows', () => {
      const { result } = renderHookWithProviders();

      expect(result.current.isVisible).toBe(false);
    });
  });

  describe('updateRpc', () => {
    it('navigates to the edit network screen and tracks the click event', () => {
      statusMock.mockReturnValue('degraded');
      mockFailedNetwork({
        name: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        chainId: '0x89',
      });
      const { result } = renderHookWithProviders();

      act(() => {
        result.current.updateRpc();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.EDIT_NETWORK, {
        network: 'https://polygon-rpc.com',
        shouldNetworkSwitchPopToWallet: false,
        shouldShowPopularNetworks: false,
        trackRpcUpdateFromBanner: true,
      });
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_UPDATE_RPC_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          banner_type: 'degraded',
          chain_id_caip: 'eip155:137',
        }),
      );
    });

    it('records the RPC as "custom" when the URL is not public', () => {
      jest.mocked(isPublicEndpointUrl).mockReturnValue(false);
      statusMock.mockReturnValue('unavailable');
      mockFailedNetwork({
        rpcUrl: 'https://my-private-rpc.example',
        chainId: '0x1',
        isInfuraEndpoint: false,
      });
      const { result } = renderHookWithProviders();

      act(() => {
        result.current.updateRpc();
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          rpc_domain: 'custom',
          rpc_endpoint_url: 'custom',
        }),
      );
    });
  });

  describe('switchToInfura', () => {
    it('is a no-op when the banner is not visible', async () => {
      const switchToInfura = jest.fn().mockResolvedValue(undefined);
      const messenger = createMockRouteMessenger({
        [SWITCH_TO_INFURA_ACTION]: switchToInfura,
      });

      const { result } = renderHookWithProviders(messenger);

      await act(async () => {
        await result.current.switchToInfura();
      });

      expect(switchToInfura).not.toHaveBeenCalled();
    });

    it('is a no-op when no Infura endpoint is available', async () => {
      statusMock.mockReturnValue('degraded');
      mockFailedNetwork({
        name: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        chainId: '0x89',
        isInfuraEndpoint: false,
        switchableInfuraNetworkClientId: null,
      });

      const switchToInfura = jest.fn().mockResolvedValue(undefined);
      const messenger = createMockRouteMessenger({
        [SWITCH_TO_INFURA_ACTION]: switchToInfura,
      });

      const { result } = renderHookWithProviders(messenger);

      await act(async () => {
        await result.current.switchToInfura();
      });

      expect(switchToInfura).not.toHaveBeenCalled();
    });

    it('delegates to the controller, fires analytics, and shows a success toast', async () => {
      statusMock.mockReturnValue('unavailable');
      mockFailedNetwork({
        name: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        chainId: '0x89',
        isInfuraEndpoint: false,
        switchableInfuraNetworkClientId: 'mainnet',
      });

      const switchToInfura = jest.fn().mockResolvedValue(undefined);
      const messenger = createMockRouteMessenger({
        [SWITCH_TO_INFURA_ACTION]: switchToInfura,
      });

      const { result } = renderHookWithProviders(messenger);

      await act(async () => {
        await result.current.switchToInfura();
      });

      expect(switchToInfura).toHaveBeenCalledWith('0x89');
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_SWITCH_TO_METAMASK_DEFAULT_RPC_CLICKED,
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: ToastVariants.Icon,
          iconName: IconName.Confirmation,
        }),
      );
    });

    it('does not show the toast when the controller rejects', async () => {
      statusMock.mockReturnValue('unavailable');
      mockFailedNetwork({
        name: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        chainId: '0x89',
        isInfuraEndpoint: false,
        switchableInfuraNetworkClientId: 'mainnet',
      });

      const switchToInfura = jest.fn().mockRejectedValueOnce(new Error('boom'));
      const messenger = createMockRouteMessenger({
        [SWITCH_TO_INFURA_ACTION]: switchToInfura,
      });
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const { result } = renderHookWithProviders(messenger);

      await act(async () => {
        await result.current.switchToInfura();
      });

      expect(mockShowToast).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
