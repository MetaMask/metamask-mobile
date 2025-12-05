import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Hex } from '@metamask/utils';
import {
  NetworkConfiguration,
  NetworkStatus,
  RpcEndpointType,
} from '@metamask/network-controller';

import useNetworkConnectionBanner from './useNetworkConnectionBanner';
import Engine from '../../../core/Engine';
import { MetaMetricsEvents, useMetrics } from '../useMetrics';
import { selectNetworkConnectionBannerState } from '../../../selectors/networkConnectionBanner';
import { selectEVMEnabledNetworks } from '../../../selectors/networkEnablementController';
import Routes from '../../../constants/navigation/Routes';
import { isPublicEndpointUrl } from '../../../core/Engine/controllers/network-controller/utils';

// Mock dependencies
jest.mock('@react-navigation/native');
jest.mock('../../../core/Engine');
jest.mock('../../../selectors/networkEnablementController');
jest.mock('../useMetrics');
jest.mock('../../../selectors/networkConnectionBanner');
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

const mockStore = configureMockStore();
const mockNavigation = {
  navigate: jest.fn(),
};

const mockNetworkConfiguration: NetworkConfiguration = {
  chainId: '0x1',
  name: 'Ethereum Mainnet',
  rpcEndpoints: [
    {
      url: 'https://mainnet.infura.io/v3/test-infura-project-id',
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
    rpcEndpoints: [
      {
        url: 'https://polygon-rpc.com',
        networkClientId: '0x89',
        type: RpcEndpointType.Custom,
      },
    ],
  },
};

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
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  context: {
    NetworkController: mockNetworkController,
  },
};

describe('useNetworkConnectionBanner', () => {
  let store: ReturnType<typeof mockStore>;
  let stableTrackEvent: jest.Mock;
  let stableCreateEventBuilder: jest.Mock;
  let mockAddProperties: jest.Mock;
  let mockBuild: jest.Mock;

  const setupMocks = () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup mocks
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    jest.mocked(selectEVMEnabledNetworks).mockReturnValue(['0x1', '0x89']);
    jest.mocked(selectNetworkConnectionBannerState).mockReturnValue({
      visible: false,
    });

    // Mock Engine methods directly (safer than spyOn after jest.mock)
    Engine.lookupEnabledNetworks = mockEngine.lookupEnabledNetworks;
    // @ts-expect-error - Mocking Engine for testing
    Engine.controllerMessenger = mockEngine.controllerMessenger;
    // @ts-expect-error - Mocking Engine for testing
    Engine.context = mockEngine.context;

    // Mock the useMetrics hook to return stable functions
    stableTrackEvent = jest.fn();
    mockAddProperties = jest.fn().mockReturnThis();
    mockBuild = jest.fn(() => ({ event: 'test-event', properties: {} }));
    stableCreateEventBuilder = jest.fn(() => ({
      addProperties: mockAddProperties,
      build: mockBuild,
    }));

    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: stableTrackEvent,
      createEventBuilder: stableCreateEventBuilder,
    });

    jest.mocked(isPublicEndpointUrl).mockReturnValue(true);

    store = mockStore({
      networkConnectionBanner: {
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

    return renderHook(() => useNetworkConnectionBanner(), {
      wrapper,
      initialProps: {},
    });
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

      expect(result.current.networkConnectionBannerState.visible).toBe(false);
      expect(
        // @ts-expect-error - chainId is not defined in the initial state
        result.current.networkConnectionBannerState.chainId,
      ).toBeUndefined();
      expect(typeof result.current.updateRpc).toBe('function');
    });

    it('should call Engine.lookupEnabledNetworks on mount', () => {
      renderHookWithProvider();

      expect(mockEngine.lookupEnabledNetworks).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateRpc function', () => {
    it('should navigate to edit network screen with provided rpcUrl', () => {
      const status = 'degraded';
      const rpcUrl = 'https://mainnet.infura.io/v3/test-infura-project-id';
      const chainId = '0x1';
      (selectNetworkConnectionBannerState as jest.Mock).mockReturnValue({
        visible: true,
        chainId,
        status,
      });

      const { result } = renderHookWithProvider();

      act(() => {
        result.current.updateRpc(rpcUrl, status, chainId);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.EDIT_NETWORK,
        {
          network: rpcUrl,
          shouldNetworkSwitchPopToWallet: false,
          shouldShowPopularNetworks: false,
          trackRpcUpdateFromBanner: true,
        },
      );
    });

    it('should track degraded RPC update event', () => {
      const status = 'degraded';
      const rpcUrl = 'https://mainnet.infura.io/v3/test-infura-project-id';
      const chainId = '0x1';
      (selectNetworkConnectionBannerState as jest.Mock).mockReturnValue({
        visible: true,
        chainId,
        status,
      });

      const { result } = renderHookWithProvider();

      act(() => {
        result.current.updateRpc(rpcUrl, status, chainId);
      });

      expect(stableCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_UPDATE_RPC_CLICKED,
      );
      expect(stableTrackEvent).toHaveBeenCalled();
      expect(isPublicEndpointUrl).toHaveBeenCalledWith(
        rpcUrl,
        'test-infura-project-id',
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        banner_type: 'degraded',
        chain_id_caip: 'eip155:1',
        rpc_endpoint_url: 'mainnet.infura.io',
        rpc_domain: 'mainnet.infura.io',
      });
    });

    it('should track unavailable RPC update event', () => {
      const status = 'unavailable';
      const rpcUrl = 'https://mainnet.infura.io/v3/test-infura-project-id';
      const chainId = '0x1';
      (selectNetworkConnectionBannerState as jest.Mock).mockReturnValue({
        visible: true,
        chainId,
        status,
      });

      const { result } = renderHookWithProvider();

      act(() => {
        result.current.updateRpc(rpcUrl, status, chainId);
      });

      expect(stableCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_UPDATE_RPC_CLICKED,
      );
      expect(stableTrackEvent).toHaveBeenCalled();
      expect(isPublicEndpointUrl).toHaveBeenCalledWith(
        rpcUrl,
        'test-infura-project-id',
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        banner_type: 'unavailable',
        chain_id_caip: 'eip155:1',
        rpc_endpoint_url: 'mainnet.infura.io',
        rpc_domain: 'mainnet.infura.io',
      });
    });

    it('should track RPC update event with custom endpoint for non-public URLs', () => {
      const status = 'degraded';
      const rpcUrl = 'https://custom-rpc.example.com';
      const chainId = '0x1';

      jest.mocked(isPublicEndpointUrl).mockReturnValue(false);

      (selectNetworkConnectionBannerState as jest.Mock).mockReturnValue({
        visible: true,
        chainId,
        status,
      });

      const { result } = renderHookWithProvider();

      act(() => {
        result.current.updateRpc(rpcUrl, status, chainId);
      });

      expect(stableCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_UPDATE_RPC_CLICKED,
      );
      expect(stableTrackEvent).toHaveBeenCalled();
      expect(isPublicEndpointUrl).toHaveBeenCalledWith(
        rpcUrl,
        'test-infura-project-id',
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        banner_type: 'degraded',
        chain_id_caip: 'eip155:1',
        rpc_endpoint_url: 'custom',
        rpc_domain: 'custom',
      });
    });

    it('should use mocked Infura project ID from constants', () => {
      const status = 'degraded';
      const rpcUrl = 'https://mainnet.infura.io/v3/test-infura-project-id';
      const chainId = '0x1';

      (selectNetworkConnectionBannerState as jest.Mock).mockReturnValue({
        visible: true,
        chainId,
        status,
      });

      const { result } = renderHookWithProvider();

      act(() => {
        result.current.updateRpc(rpcUrl, status, chainId);
      });

      expect(stableCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_UPDATE_RPC_CLICKED,
      );
      expect(stableTrackEvent).toHaveBeenCalled();
      expect(isPublicEndpointUrl).toHaveBeenCalledWith(
        rpcUrl,
        'test-infura-project-id',
      );
    });
  });

  describe('useEffect', () => {
    it('should show network connection banner after timeout', () => {
      jest.mocked(selectNetworkConnectionBannerState).mockReturnValue({
        visible: false,
      });

      renderHookWithProvider();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toStrictEqual({
        type: 'SHOW_NETWORK_CONNECTION_BANNER',
        chainId: '0x89',
        status: 'degraded',
        networkName: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        isInfuraEndpoint: false,
      });
    });

    it('should not show banner if already visible for the same network', () => {
      jest.mocked(selectNetworkConnectionBannerState).mockReturnValue({
        visible: true,
        chainId: '0x89', // Same as the unavailable network in our mock
        status: 'degraded',
        networkName: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        isInfuraEndpoint: false,
      });

      renderHookWithProvider();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(0);
    });

    it('should update banner if already visible for a different network', () => {
      jest.mocked(selectNetworkConnectionBannerState).mockReturnValue({
        visible: true,
        chainId: '0x1', // Different from the unavailable network (0x89)
        status: 'degraded',
        networkName: 'Ethereum Mainnet',
        rpcUrl: 'https://mainnet.infura.io/v3/test-infura-project-id',
        isInfuraEndpoint: true,
      });

      renderHookWithProvider();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toStrictEqual({
        type: 'SHOW_NETWORK_CONNECTION_BANNER',
        chainId: '0x89',
        status: 'degraded',
        networkName: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        isInfuraEndpoint: false,
      });
    });

    it('should update banner when problematic network changes', () => {
      // Start with banner visible for 0x89
      jest.mocked(selectNetworkConnectionBannerState).mockReturnValue({
        visible: true,
        chainId: '0x89',
        status: 'degraded',
        networkName: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        isInfuraEndpoint: false,
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
      expect(actions[0]).toStrictEqual({
        type: 'SHOW_NETWORK_CONNECTION_BANNER',
        chainId: '0x1',
        status: 'degraded',
        networkName: 'Ethereum Mainnet',
        rpcUrl: 'https://mainnet.infura.io/v3/test-infura-project-id',
        isInfuraEndpoint: true,
      });
    });

    it('should hide banner when all networks become available', () => {
      // Start with banner visible for 0x89
      jest.mocked(selectNetworkConnectionBannerState).mockReturnValue({
        visible: true,
        chainId: '0x89',
        status: 'degraded',
        networkName: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        isInfuraEndpoint: false,
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
      expect(actions[0]).toStrictEqual({
        type: 'HIDE_NETWORK_CONNECTION_BANNER',
      });
    });

    it('should show degraded banner after 5 seconds for degraded networks', () => {
      jest.mocked(selectNetworkConnectionBannerState).mockReturnValue({
        visible: false,
      });

      renderHookWithProvider();

      // Fast-forward to 5 seconds (degraded banner timeout)
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toStrictEqual({
        type: 'SHOW_NETWORK_CONNECTION_BANNER',
        chainId: '0x89',
        status: 'degraded',
        networkName: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        isInfuraEndpoint: false,
      });
    });

    it('should show unavailable banner after 30 seconds for unavailable networks', () => {
      jest.mocked(selectNetworkConnectionBannerState).mockReturnValue({
        visible: false,
      });

      renderHookWithProvider();

      // Fast-forward to 30 seconds (unavailable banner timeout)
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(2); // Both degraded and unavailable banners
      expect(actions[0]).toStrictEqual({
        type: 'SHOW_NETWORK_CONNECTION_BANNER',
        chainId: '0x89',
        status: 'degraded',
        networkName: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        isInfuraEndpoint: false,
      });

      expect(actions[1]).toStrictEqual({
        type: 'SHOW_NETWORK_CONNECTION_BANNER',
        chainId: '0x89',
        status: 'unavailable',
        networkName: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        isInfuraEndpoint: false,
      });
    });

    it('should track correct events for degraded banner', () => {
      const rpcUrl = 'https://polygon-rpc.com';
      jest.mocked(selectNetworkConnectionBannerState).mockReturnValue({
        visible: true,
        chainId: '0x89',
        status: 'degraded',
        networkName: 'Polygon Mainnet',
        rpcUrl,
        isInfuraEndpoint: false,
      });

      renderHookWithProvider();

      expect(stableCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_SHOWN,
      );
      expect(stableTrackEvent).toHaveBeenCalled();
      expect(isPublicEndpointUrl).toHaveBeenCalledWith(
        rpcUrl,
        'test-infura-project-id',
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        banner_type: 'degraded',
        chain_id_caip: 'eip155:137',
        rpc_endpoint_url: 'polygon-rpc.com',
        rpc_domain: 'polygon-rpc.com',
      });
    });

    it('should track correct events for unavailable banner', () => {
      const rpcUrl = 'https://polygon-rpc.com';
      jest.mocked(selectNetworkConnectionBannerState).mockReturnValue({
        visible: true,
        chainId: '0x89',
        status: 'unavailable',
        networkName: 'Polygon Mainnet',
        rpcUrl,
        isInfuraEndpoint: false,
      });

      renderHookWithProvider();

      expect(stableCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_SHOWN,
      );
      expect(stableTrackEvent).toHaveBeenCalled();
      expect(isPublicEndpointUrl).toHaveBeenCalledWith(
        rpcUrl,
        'test-infura-project-id',
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        banner_type: 'unavailable',
        chain_id_caip: 'eip155:137',
        rpc_endpoint_url: 'polygon-rpc.com',
        rpc_domain: 'polygon-rpc.com',
      });
    });

    it('should not track events when banner is not visible', () => {
      jest.mocked(selectNetworkConnectionBannerState).mockReturnValue({
        visible: false,
      });

      renderHookWithProvider();

      expect(stableCreateEventBuilder).not.toHaveBeenCalled();
      expect(stableTrackEvent).not.toHaveBeenCalled();
    });

    it('should update from degraded to unavailable status when network becomes truly unavailable', () => {
      // Start with degraded banner visible
      jest.mocked(selectNetworkConnectionBannerState).mockReturnValue({
        visible: true,
        chainId: '0x89',
        status: 'degraded',
        networkName: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        isInfuraEndpoint: false,
      });

      renderHookWithProvider();

      // Fast-forward to 30 seconds to trigger unavailable banner
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toStrictEqual({
        type: 'SHOW_NETWORK_CONNECTION_BANNER',
        chainId: '0x89',
        status: 'unavailable',
        networkName: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        isInfuraEndpoint: false,
      });
    });

    it('should update from unavailable to degraded status when network improves', () => {
      // Start with unavailable banner visible
      jest.mocked(selectNetworkConnectionBannerState).mockReturnValue({
        visible: true,
        chainId: '0x89',
        status: 'unavailable',
        networkName: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        isInfuraEndpoint: false,
      });

      renderHookWithProvider();

      // Fast-forward to 5 seconds (degraded banner timeout)
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toStrictEqual({
        type: 'SHOW_NETWORK_CONNECTION_BANNER',
        chainId: '0x89',
        status: 'degraded',
        networkName: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        isInfuraEndpoint: false,
      });
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

      jest.mocked(selectNetworkConnectionBannerState).mockReturnValue({
        visible: false,
      });

      renderHookWithProvider();

      // Fast-forward time to trigger the unavailable banner timeout (30 seconds)
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toStrictEqual({
        type: 'SHOW_NETWORK_CONNECTION_BANNER',
        chainId: '0x89',
        status: 'degraded',
        networkName: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        isInfuraEndpoint: false,
      });
      expect(actions[1]).toStrictEqual({
        type: 'SHOW_NETWORK_CONNECTION_BANNER',
        chainId: '0x89',
        status: 'unavailable',
        networkName: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        isInfuraEndpoint: false,
      });
      expect(actions[1].status).toBe('unavailable');
      expect(actions[1].networkName).toBe('Polygon Mainnet');
      expect(actions[1].rpcUrl).toBe('https://polygon-rpc.com');
    });

    it('should track banner shown event when showing banner', () => {
      const rpcUrl = 'https://polygon-rpc.com';
      jest.mocked(selectNetworkConnectionBannerState).mockReturnValue({
        visible: true,
        chainId: '0x89',
        status: 'degraded',
        networkName: 'Polygon Mainnet',
        rpcUrl,
        isInfuraEndpoint: false,
      });

      renderHookWithProvider();

      expect(stableCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_SHOWN,
      );
      expect(stableTrackEvent).toHaveBeenCalled();
      expect(isPublicEndpointUrl).toHaveBeenCalledWith(
        rpcUrl,
        'test-infura-project-id',
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        banner_type: 'degraded',
        chain_id_caip: 'eip155:137',
        rpc_endpoint_url: 'polygon-rpc.com',
        rpc_domain: 'polygon-rpc.com',
      });
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

      jest.mocked(selectNetworkConnectionBannerState).mockReturnValue({
        visible: false,
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

      jest.mocked(selectNetworkConnectionBannerState).mockReturnValue({
        visible: false,
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

      // Should be called twice - once for degraded timeout, once for unavailable timeout
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('enabled networks computation', () => {
    it('should compute enabled EVM networks correctly', () => {
      renderHookWithProvider();

      // The hook should compute enabled networks internally
      // We can't directly test the internal computation, but we can verify
      // that the selector is called
      expect(selectEVMEnabledNetworks).toHaveBeenCalled();
    });

    it('should handle empty enabled networks', () => {
      jest.mocked(selectEVMEnabledNetworks).mockReturnValue([]);

      jest.mocked(selectNetworkConnectionBannerState).mockReturnValue({
        visible: false,
      });

      renderHookWithProvider();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(0);
    });
  });

  describe('NetworkController:rpcEndpointChainAvailable event subscription', () => {
    it('subscribes to rpcEndpointChainAvailable event on mount', () => {
      renderHookWithProvider();

      expect(mockEngine.controllerMessenger.subscribe).toHaveBeenCalledWith(
        'NetworkController:rpcEndpointChainAvailable',
        expect.any(Function),
      );
    });

    it('unsubscribes from rpcEndpointChainAvailable event on unmount', () => {
      const { unmount } = renderHookWithProvider();

      const subscribeCall = (
        mockEngine.controllerMessenger.subscribe as jest.Mock
      ).mock.calls.find(
        (call) => call[0] === 'NetworkController:rpcEndpointChainAvailable',
      );
      const subscribedHandler = subscribeCall?.[1];

      unmount();

      expect(mockEngine.controllerMessenger.unsubscribe).toHaveBeenCalledWith(
        'NetworkController:rpcEndpointChainAvailable',
        subscribedHandler,
      );
    });

    it('hides banner when rpcEndpointChainAvailable event fires for matching chain', () => {
      jest.mocked(selectNetworkConnectionBannerState).mockReturnValue({
        visible: true,
        chainId: '0x89',
        status: 'degraded',
        networkName: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        isInfuraEndpoint: false,
      });

      renderHookWithProvider();

      const subscribeCall = (
        mockEngine.controllerMessenger.subscribe as jest.Mock
      ).mock.calls.find(
        (call) => call[0] === 'NetworkController:rpcEndpointChainAvailable',
      );
      const subscribedHandler = subscribeCall?.[1];

      act(() => {
        subscribedHandler({ chainId: '0x89' });
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toStrictEqual({
        type: 'HIDE_NETWORK_CONNECTION_BANNER',
      });
    });

    it('does not hide banner when rpcEndpointChainAvailable event fires for different chain', () => {
      jest.mocked(selectNetworkConnectionBannerState).mockReturnValue({
        visible: true,
        chainId: '0x89',
        status: 'degraded',
        networkName: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        isInfuraEndpoint: false,
      });

      renderHookWithProvider();

      const subscribeCall = (
        mockEngine.controllerMessenger.subscribe as jest.Mock
      ).mock.calls.find(
        (call) => call[0] === 'NetworkController:rpcEndpointChainAvailable',
      );
      const subscribedHandler = subscribeCall?.[1];

      act(() => {
        subscribedHandler({ chainId: '0x1' }); // Different chain
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(0);
    });

    it('does not hide banner when banner is not visible', () => {
      jest.mocked(selectNetworkConnectionBannerState).mockReturnValue({
        visible: false,
      });

      renderHookWithProvider();

      const subscribeCall = (
        mockEngine.controllerMessenger.subscribe as jest.Mock
      ).mock.calls.find(
        (call) => call[0] === 'NetworkController:rpcEndpointChainAvailable',
      );
      const subscribedHandler = subscribeCall?.[1];

      act(() => {
        subscribedHandler({ chainId: '0x89' });
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(0);
    });
  });
});
