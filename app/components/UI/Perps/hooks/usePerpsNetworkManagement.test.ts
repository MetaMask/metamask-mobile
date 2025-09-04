import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { toHex } from '@metamask/controller-utils';
import { RpcEndpointType } from '@metamask/network-controller';
import { usePerpsNetworkManagement } from './usePerpsNetworkManagement';
import { usePerpsNetwork } from './usePerpsNetwork';
import { useNetworkEnablement } from '../../../hooks/useNetworkEnablement/useNetworkEnablement';
import Engine from '../../../../core/Engine';
import {
  ARBITRUM_MAINNET_CAIP_CHAIN_ID,
  ARBITRUM_TESTNET_CAIP_CHAIN_ID,
} from '../constants/hyperLiquidConfig';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./usePerpsNetwork', () => ({
  usePerpsNetwork: jest.fn(),
}));

jest.mock('../../../hooks/useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      addNetwork: jest.fn(),
    },
  },
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
}));

// Mock environment variable
jest.mock('process', () => ({
  env: {
    MM_INFURA_PROJECT_ID: 'test-infura-key',
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('usePerpsNetworkManagement', () => {
  const mockUsePerpsNetwork = usePerpsNetwork as jest.MockedFunction<
    typeof usePerpsNetwork
  >;
  const mockUseNetworkEnablement = useNetworkEnablement as jest.MockedFunction<
    typeof useNetworkEnablement
  >;
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockAddNetwork = Engine.context.NetworkController
    .addNetwork as jest.MockedFunction<
    typeof Engine.context.NetworkController.addNetwork
  >;

  const mockEnableNetwork = jest.fn();
  const mockNetworkConfigurations = {};

  beforeEach(() => {
    mockUsePerpsNetwork.mockReturnValue('mainnet');
    mockUseNetworkEnablement.mockReturnValue({
      enableNetwork: mockEnableNetwork,
    } as unknown as ReturnType<typeof useNetworkEnablement>);
    mockUseSelector.mockReturnValue(mockNetworkConfigurations);
    mockAddNetwork.mockResolvedValue({});
  });

  describe('getArbitrumChainId', () => {
    it('should return mainnet chain ID when current network is mainnet', () => {
      mockUsePerpsNetwork.mockReturnValue('mainnet');

      const { result } = renderHook(() => usePerpsNetworkManagement());

      expect(result.current.getArbitrumChainId()).toBe(
        ARBITRUM_MAINNET_CAIP_CHAIN_ID,
      );
    });

    it('should return testnet chain ID when current network is testnet', () => {
      mockUsePerpsNetwork.mockReturnValue('testnet');

      const { result } = renderHook(() => usePerpsNetworkManagement());

      expect(result.current.getArbitrumChainId()).toBe(
        ARBITRUM_TESTNET_CAIP_CHAIN_ID,
      );
    });

    it('should update chain ID when network changes', () => {
      const { result, rerender } = renderHook(() =>
        usePerpsNetworkManagement(),
      );

      // Initially mainnet
      expect(result.current.getArbitrumChainId()).toBe(
        ARBITRUM_MAINNET_CAIP_CHAIN_ID,
      );

      // Change to testnet
      mockUsePerpsNetwork.mockReturnValue('testnet');
      rerender();

      expect(result.current.getArbitrumChainId()).toBe(
        ARBITRUM_TESTNET_CAIP_CHAIN_ID,
      );
    });
  });

  describe('enableArbitrumNetwork', () => {
    it('should call enableNetwork with correct chain ID for mainnet', () => {
      mockUsePerpsNetwork.mockReturnValue('mainnet');

      const { result } = renderHook(() => usePerpsNetworkManagement());

      act(() => {
        result.current.enableArbitrumNetwork();
      });

      expect(mockEnableNetwork).toHaveBeenCalledWith(
        ARBITRUM_MAINNET_CAIP_CHAIN_ID,
      );
    });

    it('should call enableNetwork with correct chain ID for testnet', () => {
      mockUsePerpsNetwork.mockReturnValue('testnet');

      const { result } = renderHook(() => usePerpsNetworkManagement());

      act(() => {
        result.current.enableArbitrumNetwork();
      });

      expect(mockEnableNetwork).toHaveBeenCalledWith(
        ARBITRUM_TESTNET_CAIP_CHAIN_ID,
      );
    });
  });

  describe('ensureArbitrumNetworkExists', () => {
    const mainnetChainId = toHex(
      parseInt(ARBITRUM_MAINNET_CAIP_CHAIN_ID.split(':')[1], 10),
    );
    const testnetChainId = toHex(
      parseInt(ARBITRUM_TESTNET_CAIP_CHAIN_ID.split(':')[1], 10),
    );

    describe('when network already exists', () => {
      it('should only enable network for mainnet', async () => {
        mockUsePerpsNetwork.mockReturnValue('mainnet');
        mockUseSelector.mockReturnValue({
          [mainnetChainId]: { chainId: mainnetChainId },
        });

        const { result } = renderHook(() => usePerpsNetworkManagement());

        await act(async () => {
          await result.current.ensureArbitrumNetworkExists();
        });

        expect(mockEnableNetwork).toHaveBeenCalledWith(
          ARBITRUM_MAINNET_CAIP_CHAIN_ID,
        );
        expect(mockAddNetwork).not.toHaveBeenCalled();
      });

      it('should only enable network for testnet', async () => {
        mockUsePerpsNetwork.mockReturnValue('testnet');
        mockUseSelector.mockReturnValue({
          [testnetChainId]: { chainId: testnetChainId },
        });

        const { result } = renderHook(() => usePerpsNetworkManagement());

        await act(async () => {
          await result.current.ensureArbitrumNetworkExists();
        });

        expect(mockEnableNetwork).toHaveBeenCalledWith(
          ARBITRUM_TESTNET_CAIP_CHAIN_ID,
        );
        expect(mockAddNetwork).not.toHaveBeenCalled();
      });
    });

    describe('when network does not exist', () => {
      it('should add and enable mainnet network', async () => {
        mockUsePerpsNetwork.mockReturnValue('mainnet');
        mockUseSelector.mockReturnValue({});

        const { result } = renderHook(() => usePerpsNetworkManagement());

        await act(async () => {
          await result.current.ensureArbitrumNetworkExists();
        });

        expect(mockAddNetwork).toHaveBeenCalledWith({
          chainId: mainnetChainId,
          blockExplorerUrls: ['https://arbiscan.io'],
          defaultRpcEndpointIndex: 0,
          defaultBlockExplorerUrlIndex: 0,
          name: 'Arbitrum One',
          nativeCurrency: 'ETH',
          rpcEndpoints: [
            {
              url: 'https://arbitrum-mainnet.infura.io/v3/undefined',
              name: 'Arbitrum One',
              type: RpcEndpointType.Custom,
            },
          ],
        });
        expect(mockEnableNetwork).toHaveBeenCalledWith(
          ARBITRUM_MAINNET_CAIP_CHAIN_ID,
        );
      });

      it('should add and enable testnet network', async () => {
        mockUsePerpsNetwork.mockReturnValue('testnet');
        mockUseSelector.mockReturnValue({});

        const { result } = renderHook(() => usePerpsNetworkManagement());

        await act(async () => {
          await result.current.ensureArbitrumNetworkExists();
        });

        expect(mockAddNetwork).toHaveBeenCalledWith({
          chainId: testnetChainId,
          blockExplorerUrls: ['https://sepolia.arbiscan.io'],
          defaultRpcEndpointIndex: 0,
          defaultBlockExplorerUrlIndex: 0,
          name: 'Arbitrum Sepolia',
          nativeCurrency: 'ETH',
          rpcEndpoints: [
            {
              url: 'https://arbitrum-sepolia.infura.io/v3/undefined',
              name: 'Arbitrum Sepolia',
              type: RpcEndpointType.Custom,
            },
          ],
        });
        expect(mockEnableNetwork).toHaveBeenCalledWith(
          ARBITRUM_TESTNET_CAIP_CHAIN_ID,
        );
      });

      it('should handle missing Infura key', async () => {
        process.env.MM_INFURA_PROJECT_ID = 'null';
        mockUsePerpsNetwork.mockReturnValue('mainnet');
        mockUseSelector.mockReturnValue({});

        const { result } = renderHook(() => usePerpsNetworkManagement());

        await act(async () => {
          await result.current.ensureArbitrumNetworkExists();
        });

        expect(mockAddNetwork).toHaveBeenCalledWith({
          chainId: mainnetChainId,
          blockExplorerUrls: ['https://arbiscan.io'],
          defaultRpcEndpointIndex: 0,
          defaultBlockExplorerUrlIndex: 0,
          name: 'Arbitrum One',
          nativeCurrency: 'ETH',
          rpcEndpoints: [
            {
              url: 'https://arbitrum-mainnet.infura.io/v3/undefined',
              name: 'Arbitrum One',
              type: RpcEndpointType.Custom,
            },
          ],
        });
      });
    });

    describe('error handling', () => {
      it('should log error and still try to enable network when addNetwork fails', async () => {
        const consoleErrorSpy = jest
          .spyOn(console, 'error')
          .mockImplementation();
        const addNetworkError = new Error('Network addition failed');
        mockAddNetwork.mockRejectedValue(addNetworkError);
        mockUsePerpsNetwork.mockReturnValue('mainnet');
        mockUseSelector.mockReturnValue({});

        const { result } = renderHook(() => usePerpsNetworkManagement());

        await act(async () => {
          await expect(
            result.current.ensureArbitrumNetworkExists(),
          ).rejects.toThrow('Network addition failed');
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to add Arbitrum network:',
          addNetworkError,
        );
        expect(mockEnableNetwork).toHaveBeenCalledWith(
          ARBITRUM_MAINNET_CAIP_CHAIN_ID,
        );

        consoleErrorSpy.mockRestore();
      });

      it('should throw the original error after logging', async () => {
        const addNetworkError = new Error('Network addition failed');
        mockAddNetwork.mockRejectedValue(addNetworkError);
        mockUsePerpsNetwork.mockReturnValue('mainnet');
        mockUseSelector.mockReturnValue({});

        const { result } = renderHook(() => usePerpsNetworkManagement());

        await act(async () => {
          await expect(
            result.current.ensureArbitrumNetworkExists(),
          ).rejects.toThrow('Network addition failed');
        });
      });
    });
  });

  describe('returned values', () => {
    it('should return all expected functions and values', () => {
      const { result } = renderHook(() => usePerpsNetworkManagement());

      expect(result.current).toEqual({
        ensureArbitrumNetworkExists: expect.any(Function),
        enableArbitrumNetwork: expect.any(Function),
        getArbitrumChainId: expect.any(Function),
        currentNetwork: 'mainnet',
      });
    });

    it('should return current network value', () => {
      mockUsePerpsNetwork.mockReturnValue('testnet');

      const { result } = renderHook(() => usePerpsNetworkManagement());

      expect(result.current.currentNetwork).toBe('testnet');
    });
  });

  describe('memoization', () => {
    it('should memoize getArbitrumChainId based on currentNetwork', () => {
      const { result, rerender } = renderHook(() =>
        usePerpsNetworkManagement(),
      );

      const firstCall = result.current.getArbitrumChainId;

      // Rerender with same network
      rerender();

      const secondCall = result.current.getArbitrumChainId;

      expect(firstCall).toBe(secondCall);
    });

    it('should update getArbitrumChainId when network changes', () => {
      const { result, rerender } = renderHook(() =>
        usePerpsNetworkManagement(),
      );

      const mainnetCall = result.current.getArbitrumChainId;

      // Change network
      mockUsePerpsNetwork.mockReturnValue('testnet');
      rerender();

      const testnetCall = result.current.getArbitrumChainId;

      expect(mainnetCall).not.toBe(testnetCall);
    });
  });
});
