import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Hex, KnownCaipNamespace } from '@metamask/utils';
import {
  NetworkConfiguration,
  NetworkStatus,
  RpcEndpointType,
} from '@metamask/network-controller';

import useNetworkConnectionBanners from './useNetworkConnectionBanners';
import Engine from '../../../core/Engine';
import { MetaMetricsEvents, useMetrics } from '../useMetrics';
import { selectNetworkConnectionBannersState } from '../../../selectors/networkConnectionBanners';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { useNetworkEnablement } from '../useNetworkEnablement/useNetworkEnablement';
import Routes from '../../../constants/navigation/Routes';

// Mock dependencies
jest.mock('@react-navigation/native');
jest.mock('../../../core/Engine');
jest.mock('../useNetworkEnablement/useNetworkEnablement');
jest.mock('../useMetrics');
jest.mock('../../../selectors/networkConnectionBanners');
jest.mock('../../../selectors/networkController');

const mockStore = configureMockStore();
const mockNavigation = {
  navigate: jest.fn(),
};

const mockNetworkConfiguration: NetworkConfiguration = {
  chainId: '0x1',
  name: 'Ethereum Mainnet',
  rpcEndpoints: [
    {
      url: 'https://mainnet.infura.io/v3/test',
      networkClientId: '0x1',
      type: RpcEndpointType.Custom,
    },
    {
      url: 'https://eth-mainnet.alchemyapi.io/v2/test',
      networkClientId: '0x1',
      type: RpcEndpointType.Custom,
    },
  ],
  defaultRpcEndpointIndex: 0,
  blockExplorerUrls: ['https://etherscan.io'],
  nativeCurrency: 'ETH',
};

const mockNetworkConfigurationByChainId: Record<Hex, NetworkConfiguration> = {
  '0x1': mockNetworkConfiguration,
  '0x89': {
    ...mockNetworkConfiguration,
    chainId: '0x89',
    name: 'Polygon Mainnet',
  },
};

const mockEnabledNetworksByNamespace = Object.freeze({
  [KnownCaipNamespace.Eip155]: {
    '0x1': true,
    '0x89': true,
  },
});

const NETWORK_CLIENT_ID_1 = 'network-client-1';
const NETWORK_CLIENT_ID_89 = 'network-client-89';

const mockNetworkMetadata = {
  [NETWORK_CLIENT_ID_1]: { status: NetworkStatus.Available },
  [NETWORK_CLIENT_ID_89]: { status: NetworkStatus.Unavailable },
};

const mockNetworkController = {
  state: {
    networksMetadata: mockNetworkMetadata,
  },
  findNetworkClientIdByChainId: jest.fn((chainId: Hex) => {
    const clientIdMap: Record<Hex, string> = {
      '0x1': NETWORK_CLIENT_ID_1,
      '0x89': NETWORK_CLIENT_ID_89,
    };
    return clientIdMap[chainId];
  }),
  getNetworkConfigurationByNetworkClientId: jest.fn(
    (networkClientId: string) => {
      const configMap: Record<string, NetworkConfiguration> = {
        [NETWORK_CLIENT_ID_1]: mockNetworkConfigurationByChainId['0x1'],
        [NETWORK_CLIENT_ID_89]: mockNetworkConfigurationByChainId['0x89'],
      };
      return configMap[networkClientId];
    },
  ),
};

const mockEngine = {
  lookupEnabledNetworks: jest.fn(),
  context: {
    NetworkController: mockNetworkController,
  },
};

describe('useNetworkConnectionBanners', () => {
  let store: ReturnType<typeof mockStore>;
  let stableTrackEvent: jest.Mock;
  let stableCreateEventBuilder: jest.Mock;

  const setupMocks = () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup mocks
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useNetworkEnablement as jest.Mock).mockReturnValue({
      enabledNetworksByNamespace: mockEnabledNetworksByNamespace,
    });
    jest.mocked(selectNetworkConnectionBannersState).mockReturnValue({
      visible: false,
      chainId: undefined,
    });
    jest
      .mocked(selectEvmNetworkConfigurationsByChainId)
      .mockReturnValue(mockNetworkConfigurationByChainId);

    // Mock Engine methods directly (safer than spyOn after jest.mock)
    Engine.lookupEnabledNetworks = mockEngine.lookupEnabledNetworks;
    // @ts-expect-error - Mocking Engine for testing
    Engine.context = mockEngine.context;

    // Mock the useMetrics hook to return stable functions
    stableTrackEvent = jest.fn();
    stableCreateEventBuilder = jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(() => ({ event: 'test-event', properties: {} })),
    }));

    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: stableTrackEvent,
      createEventBuilder: stableCreateEventBuilder,
    });

    store = mockStore({
      networkConnectionBanners: {
        visible: false,
        chainId: undefined,
      },
    });
  };

  const cleanupMocks = () => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  };

  const renderHookWithProvider = () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    return renderHook(() => useNetworkConnectionBanners(), { wrapper });
  };

  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('initial state', () => {
    it('should return initial values', () => {
      const { result } = renderHookWithProvider();

      expect(result.current.visible).toBe(false);
      expect(result.current.chainId).toBeUndefined();
      expect(result.current.currentNetwork).toBeUndefined();
      expect(typeof result.current.editRpc).toBe('function');
    });

    it('should call Engine.lookupEnabledNetworks on mount', () => {
      renderHookWithProvider();

      expect(mockEngine.lookupEnabledNetworks).toHaveBeenCalledTimes(1);
    });
  });

  describe('currentNetwork computation', () => {
    it('should return network configuration when chainId is provided', () => {
      (selectNetworkConnectionBannersState as jest.Mock).mockReturnValue({
        visible: true,
        chainId: '0x1',
        status: 'slow',
      });

      const { result } = renderHookWithProvider();

      expect(result.current.currentNetwork).toEqual(mockNetworkConfiguration);
    });

    it('should return undefined when chainId is not provided', () => {
      (selectNetworkConnectionBannersState as jest.Mock).mockReturnValue({
        visible: false,
        chainId: undefined,
        status: undefined,
      });

      const { result } = renderHookWithProvider();

      expect(result.current.currentNetwork).toBeUndefined();
    });

    it('should return undefined when chainId is not found in configurations', () => {
      (selectNetworkConnectionBannersState as jest.Mock).mockReturnValue({
        visible: true,
        chainId: '0x999',
        status: 'slow',
      });

      const { result } = renderHookWithProvider();

      expect(result.current.currentNetwork).toBeUndefined();
    });
  });

  describe('editRpc function', () => {
    it('should navigate to edit network screen when currentNetwork exists', () => {
      (selectNetworkConnectionBannersState as jest.Mock).mockReturnValue({
        visible: true,
        chainId: '0x1',
        status: 'slow',
      });

      const { result } = renderHookWithProvider();

      act(() => {
        result.current.editRpc();
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.EDIT_NETWORK,
        {
          network: 'https://mainnet.infura.io/v3/test',
          shouldNetworkSwitchPopToWallet: false,
          shouldShowPopularNetworks: false,
        },
      );
    });

    it('should track edit RPC event when currentNetwork exists', () => {
      (selectNetworkConnectionBannersState as jest.Mock).mockReturnValue({
        visible: true,
        chainId: '0x1',
        status: 'slow',
      });

      const { result } = renderHookWithProvider();

      act(() => {
        result.current.editRpc();
      });

      expect(stableCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.SLOW_RPC_BANNER_EDIT_RPC_CLICKED,
      );
      expect(stableTrackEvent).toHaveBeenCalled();
    });

    it('should dispatch hideNetworkConnectionBanner when currentNetwork exists', () => {
      (selectNetworkConnectionBannersState as jest.Mock).mockReturnValue({
        visible: true,
        chainId: '0x1',
        status: 'slow',
      });

      const { result } = renderHookWithProvider();

      act(() => {
        result.current.editRpc();
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('HIDE_NETWORK_CONNECTION_BANNER');
    });

    it('should not navigate when currentNetwork is undefined', () => {
      (selectNetworkConnectionBannersState as jest.Mock).mockReturnValue({
        visible: false,
        chainId: undefined,
      });

      const { result } = renderHookWithProvider();

      act(() => {
        result.current.editRpc();
      });

      expect(mockNavigation.navigate).not.toHaveBeenCalled();
      expect(stableTrackEvent).not.toHaveBeenCalled();
    });

    it('should use fallback RPC URL when defaultEndpointIndex is not available', () => {
      const networkConfigWithoutDefaultIndex = {
        ...mockNetworkConfiguration,
        defaultRpcEndpointIndex: undefined,
      };

      (
        selectEvmNetworkConfigurationsByChainId as unknown as jest.Mock
      ).mockReturnValue({
        '0x1': networkConfigWithoutDefaultIndex,
      });

      (selectNetworkConnectionBannersState as jest.Mock).mockReturnValue({
        visible: true,
        chainId: '0x1',
      });

      const { result } = renderHookWithProvider();

      act(() => {
        result.current.editRpc();
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.EDIT_NETWORK,
        {
          network: 'https://mainnet.infura.io/v3/test',
          shouldNetworkSwitchPopToWallet: false,
          shouldShowPopularNetworks: false,
        },
      );
    });
  });

  describe('useEffect', () => {
    it('should show network connection banner after timeout', () => {
      jest.mocked(selectNetworkConnectionBannersState).mockReturnValue({
        visible: false,
        chainId: undefined,
        status: undefined,
      });

      renderHookWithProvider();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('SHOW_NETWORK_CONNECTION_BANNER');
      expect(actions[0].chainId).toBe('0x89'); // Polygon network is unavailable
      expect(actions[0].status).toBe('slow');
    });

    it('should not show banner if already visible for the same network', () => {
      jest.mocked(selectNetworkConnectionBannersState).mockReturnValue({
        visible: true,
        chainId: '0x89', // Same as the unavailable network in our mock
        status: 'slow',
      });

      renderHookWithProvider();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(0);
    });

    it('should update banner if already visible for a different network', () => {
      jest.mocked(selectNetworkConnectionBannersState).mockReturnValue({
        visible: true,
        chainId: '0x1', // Different from the unavailable network (0x89)
        status: 'slow',
      });

      renderHookWithProvider();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('SHOW_NETWORK_CONNECTION_BANNER');
      expect(actions[0].chainId).toBe('0x89'); // Should update to the actual problematic network
      expect(actions[0].status).toBe('slow');
    });

    it('should update banner when problematic network changes', () => {
      // Start with banner visible for 0x89
      jest.mocked(selectNetworkConnectionBannersState).mockReturnValue({
        visible: true,
        chainId: '0x89',
        status: 'slow',
      });

      // Mock that 0x89 is now available but 0x1 is unavailable
      const updatedNetworkMetadata = {
        [NETWORK_CLIENT_ID_1]: { status: NetworkStatus.Unavailable },
        [NETWORK_CLIENT_ID_89]: { status: NetworkStatus.Available },
      };

      // @ts-expect-error - Mocking Engine for testing
      Engine.context = {
        NetworkController: {
          ...mockNetworkController,
          state: {
            networksMetadata: updatedNetworkMetadata,
          },
        },
      };

      renderHookWithProvider();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('SHOW_NETWORK_CONNECTION_BANNER');
      expect(actions[0].chainId).toBe('0x1'); // Should update to the new problematic network
      expect(actions[0].status).toBe('slow');
    });

    it('should hide banner when all networks become available', () => {
      // Start with banner visible for 0x89
      jest.mocked(selectNetworkConnectionBannersState).mockReturnValue({
        visible: true,
        chainId: '0x89',
        status: 'slow',
      });

      const allAvailableNetworkMetadata = {
        [NETWORK_CLIENT_ID_1]: { status: NetworkStatus.Available },
        [NETWORK_CLIENT_ID_89]: { status: NetworkStatus.Available },
      };

      const mockEngineWithAllAvailable = {
        ...mockEngine,
        context: {
          NetworkController: {
            ...mockNetworkController,
            state: {
              networksMetadata: allAvailableNetworkMetadata,
            },
          },
        },
      };

      // @ts-expect-error - Mocking Engine for testing
      Engine.context = mockEngineWithAllAvailable.context;

      renderHookWithProvider();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('HIDE_NETWORK_CONNECTION_BANNER');
    });

    it('should show slow banner after 5 seconds for slow networks', () => {
      jest.mocked(selectNetworkConnectionBannersState).mockReturnValue({
        visible: false,
        chainId: undefined,
        status: undefined,
      });

      renderHookWithProvider();

      // Fast-forward to 5 seconds (slow banner timeout)
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('SHOW_NETWORK_CONNECTION_BANNER');
      expect(actions[0].chainId).toBe('0x89');
      expect(actions[0].status).toBe('slow');
    });

    it('should show unavailable banner after 30 seconds for unavailable networks', () => {
      jest.mocked(selectNetworkConnectionBannersState).mockReturnValue({
        visible: false,
        chainId: undefined,
        status: undefined,
      });

      renderHookWithProvider();

      // Fast-forward to 30 seconds (unavailable banner timeout)
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(2); // Both slow and unavailable banners
      expect(actions[0].type).toBe('SHOW_NETWORK_CONNECTION_BANNER');
      expect(actions[0].chainId).toBe('0x89');
      expect(actions[0].status).toBe('slow');

      expect(actions[1].type).toBe('SHOW_NETWORK_CONNECTION_BANNER');
      expect(actions[1].chainId).toBe('0x89');
      expect(actions[1].status).toBe('unavailable');
    });

    it('should track correct events for slow banner', () => {
      jest.mocked(selectNetworkConnectionBannersState).mockReturnValue({
        visible: false,
        chainId: undefined,
        status: undefined,
      });

      renderHookWithProvider();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(stableCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.SLOW_RPC_BANNER_SHOWN,
      );
      expect(stableTrackEvent).toHaveBeenCalled();
    });

    it('should track correct events for unavailable banner', () => {
      jest.mocked(selectNetworkConnectionBannersState).mockReturnValue({
        visible: false,
        chainId: undefined,
        status: undefined,
      });

      renderHookWithProvider();

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should track both slow and unavailable events
      expect(stableCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.SLOW_RPC_BANNER_SHOWN,
      );
      expect(stableCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.UNAVAILABLE_RPC_BANNER_SHOWN,
      );
      expect(stableTrackEvent).toHaveBeenCalledTimes(2);
    });

    it('should update from slow to unavailable status when network becomes truly unavailable', () => {
      // Start with slow banner visible
      jest.mocked(selectNetworkConnectionBannersState).mockReturnValue({
        visible: true,
        chainId: '0x89',
        status: 'slow',
      });

      renderHookWithProvider();

      // Fast-forward to 30 seconds to trigger unavailable banner
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('SHOW_NETWORK_CONNECTION_BANNER');
      expect(actions[0].chainId).toBe('0x89');
      expect(actions[0].status).toBe('unavailable');
    });

    it('should update from unavailable to slow status when network improves', () => {
      // Start with unavailable banner visible
      jest.mocked(selectNetworkConnectionBannersState).mockReturnValue({
        visible: true,
        chainId: '0x89',
        status: 'unavailable',
      });

      renderHookWithProvider();

      // Fast-forward to 5 seconds (slow banner timeout)
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('SHOW_NETWORK_CONNECTION_BANNER');
      expect(actions[0].chainId).toBe('0x89');
      expect(actions[0].status).toBe('slow'); // Should update to slow status
    });

    it('should show unavailable banner for networks that are truly unavailable', () => {
      const unavailableNetworkMetadata = {
        [NETWORK_CLIENT_ID_1]: { status: NetworkStatus.Available },
        [NETWORK_CLIENT_ID_89]: { status: NetworkStatus.Unavailable },
      };

      const mockEngineWithUnavailableNetwork = {
        ...mockEngine,
        context: {
          NetworkController: {
            ...mockNetworkController,
            state: {
              networksMetadata: unavailableNetworkMetadata,
            },
          },
        },
      };

      // @ts-expect-error - Mocking Engine for testing
      Engine.context = mockEngineWithUnavailableNetwork.context;

      jest.mocked(selectNetworkConnectionBannersState).mockReturnValue({
        visible: false,
        chainId: undefined,
      });

      renderHookWithProvider();

      // Fast-forward time to trigger the unavailable banner timeout (30 seconds)
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0].type).toBe('SHOW_NETWORK_CONNECTION_BANNER');
      expect(actions[0].chainId).toBe('0x89'); // Polygon network is unavailable
      expect(actions[0].status).toBe('slow');

      expect(actions[1].type).toBe('SHOW_NETWORK_CONNECTION_BANNER');
      expect(actions[1].chainId).toBe('0x89'); // Polygon network is unavailable
      expect(actions[1].status).toBe('unavailable');
    });

    it('should track banner shown event when showing banner', () => {
      jest.mocked(selectNetworkConnectionBannersState).mockReturnValue({
        visible: false,
        chainId: undefined,
      });

      renderHookWithProvider();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(stableCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.SLOW_RPC_BANNER_SHOWN,
      );
      expect(stableTrackEvent).toHaveBeenCalled();
    });

    it('should not show banner for available networks', () => {
      const availableNetworkMetadata = {
        [NETWORK_CLIENT_ID_1]: { status: NetworkStatus.Available },
        [NETWORK_CLIENT_ID_89]: { status: NetworkStatus.Available },
      };

      const mockEngineWithAvailableNetworks = {
        ...mockEngine,
        context: {
          NetworkController: {
            ...mockNetworkController,
            state: {
              networksMetadata: availableNetworkMetadata,
            },
          },
        },
      };

      // @ts-expect-error - Mocking Engine for testing
      Engine.context = mockEngineWithAvailableNetworks.context;

      jest.mocked(selectNetworkConnectionBannersState).mockReturnValue({
        visible: false,
        chainId: undefined,
      });

      renderHookWithProvider();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(0);
    });

    it('should skip networks without configuration', () => {
      const mockNetworkControllerWithoutConfig = {
        ...mockNetworkController,
        findNetworkClientIdByChainId: jest.fn((chainId: Hex) => {
          const clientIdMap: Record<Hex, string> = {
            '0x1': NETWORK_CLIENT_ID_1,
            '0x89': NETWORK_CLIENT_ID_89,
          };
          return clientIdMap[chainId];
        }),
        getNetworkConfigurationByNetworkClientId: jest.fn(() => undefined),
      };

      const mockEngineWithoutConfig = {
        ...mockEngine,
        context: {
          NetworkController: mockNetworkControllerWithoutConfig,
        },
      };

      // @ts-expect-error - Mocking Engine for testing
      Engine.context = mockEngineWithoutConfig.context;

      jest.mocked(selectNetworkConnectionBannersState).mockReturnValue({
        visible: false,
        chainId: undefined,
      });

      renderHookWithProvider();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(0);
    });

    it('should clean up both timeouts on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount } = renderHookWithProvider();

      unmount();

      // Should be called twice - once for slow timeout, once for unavailable timeout
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('enabled networks computation', () => {
    it('should compute enabled EVM networks correctly', () => {
      renderHookWithProvider();

      // The hook should compute enabled networks internally
      // We can't directly test the internal computation, but we can verify
      // that the effect runs with the correct dependencies
      expect(useNetworkEnablement).toHaveBeenCalled();
    });

    it('should handle empty enabled networks', () => {
      (useNetworkEnablement as jest.Mock).mockReturnValue({
        enabledNetworksByNamespace: {
          [KnownCaipNamespace.Eip155]: {},
        },
      });

      jest.mocked(selectNetworkConnectionBannersState).mockReturnValue({
        visible: false,
        chainId: undefined,
      });

      renderHookWithProvider();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(0);
    });
  });
});
