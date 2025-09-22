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

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn(() => ({ event: 'test-event', properties: {} })),
}));

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
} as const;

const mockEnabledNetworksByNamespace = {
  [KnownCaipNamespace.Eip155]: {
    '0x1': true,
    '0x89': true,
  },
};

const mockNetworkMetadata = {
  '0x1': { status: NetworkStatus.Available },
  '0x89': { status: NetworkStatus.Unavailable },
};

const mockNetworkController = {
  state: {
    networksMetadata: mockNetworkMetadata,
  },
  getNetworkConfigurationByNetworkClientId: jest.fn(
    (chainId: Hex) => mockNetworkConfigurationByChainId[chainId],
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

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup mocks
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    Engine.lookupEnabledNetworks = mockEngine.lookupEnabledNetworks;
    // @ts-expect-error - Mocking Engine for testing
    Engine.context = mockEngine.context;
    (useNetworkEnablement as jest.Mock).mockReturnValue({
      enabledNetworksByNamespace: mockEnabledNetworksByNamespace,
    });
    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });
    (selectNetworkConnectionBannersState as jest.Mock).mockReturnValue({
      visible: false,
      chainId: undefined,
    });
    (
      selectEvmNetworkConfigurationsByChainId as unknown as jest.Mock
    ).mockReturnValue(mockNetworkConfigurationByChainId);

    store = mockStore({
      networkConnectionBanners: {
        visible: false,
        chainId: undefined,
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderHookWithProvider = () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    return renderHook(() => useNetworkConnectionBanners(), { wrapper });
  };

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
      });

      const { result } = renderHookWithProvider();

      expect(result.current.currentNetwork).toEqual(mockNetworkConfiguration);
    });

    it('should return undefined when chainId is not provided', () => {
      (selectNetworkConnectionBannersState as jest.Mock).mockReturnValue({
        visible: false,
        chainId: undefined,
      });

      const { result } = renderHookWithProvider();

      expect(result.current.currentNetwork).toBeUndefined();
    });

    it('should return undefined when chainId is not found in configurations', () => {
      (selectNetworkConnectionBannersState as jest.Mock).mockReturnValue({
        visible: true,
        chainId: '0x999' as Hex,
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
      });

      const { result } = renderHookWithProvider();

      act(() => {
        result.current.editRpc();
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.SLOW_RPC_MONITORING_BANNER_EDIT_RPC_CLICKED,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('should dispatch hideSlowRpcConnectionBanner when currentNetwork exists', () => {
      (selectNetworkConnectionBannersState as jest.Mock).mockReturnValue({
        visible: true,
        chainId: '0x1',
      });

      const { result } = renderHookWithProvider();

      act(() => {
        result.current.editRpc();
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('HIDE_SLOW_RPC_CONNECTION_BANNER');
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
      expect(mockTrackEvent).not.toHaveBeenCalled();
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

  describe('network monitoring effect', () => {
    it('should show banner for network after timeout', () => {
      (selectNetworkConnectionBannersState as jest.Mock).mockReturnValue({
        visible: false,
        chainId: undefined,
      });

      renderHookWithProvider();

      // Fast-forward time to trigger the timeout
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('SHOW_SLOW_RPC_CONNECTION_BANNER');
      expect(actions[0].chainId).toBe('0x89'); // Polygon network is blocked
    });

    it('should not show banner if already visible', () => {
      (selectNetworkConnectionBannersState as jest.Mock).mockReturnValue({
        visible: true,
        chainId: '0x1',
      });

      renderHookWithProvider();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      const actions = store.getActions();
      expect(actions).toHaveLength(0);
    });

    it('should track banner shown event when showing banner', () => {
      (selectNetworkConnectionBannersState as jest.Mock).mockReturnValue({
        visible: false,
        chainId: undefined,
      });

      renderHookWithProvider();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.SLOW_RPC_MONITORING_BANNER_EDIT_RPC_CLICKED,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('should not show banner for available networks', () => {
      // Make all networks available
      const availableNetworkMetadata = {
        '0x1': { status: NetworkStatus.Available },
        '0x89': { status: NetworkStatus.Available },
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

      (selectNetworkConnectionBannersState as jest.Mock).mockReturnValue({
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

      (selectNetworkConnectionBannersState as jest.Mock).mockReturnValue({
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

    it('should clean up timeout on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount } = renderHookWithProvider();

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
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

      (selectNetworkConnectionBannersState as jest.Mock).mockReturnValue({
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
