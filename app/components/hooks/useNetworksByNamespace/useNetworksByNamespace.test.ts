import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { parseCaipChainId, CaipChainId } from '@metamask/utils';
import { ImageSourcePropType } from 'react-native';
import { getNetworkImageSource } from '../../../util/networks';
import { useNetworkEnablement } from '../useNetworkEnablement/useNetworkEnablement';
import { useNetworksByNamespace, NetworkType } from './useNetworksByNamespace';

jest.mock('@metamask/keyring-utils', () => ({}));
jest.mock('@metamask/keyring-api', () => ({}));
jest.mock('@metamask/rpc-errors', () => ({}));
jest.mock('@metamask/network-controller', () => ({}));
jest.mock('@metamask/controller-utils', () => ({
  hasProperty: jest.fn(),
  toHex: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@metamask/utils', () => ({
  parseCaipChainId: jest.fn(),
  CaipChainId: jest.fn(),
}));

jest.mock('../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(),
}));

jest.mock('../useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: jest.fn(),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectPopularNetworkConfigurationsByCaipChainId: jest.fn(),
  selectCustomNetworkConfigurationsByCaipChainId: jest.fn(),
}));

describe('useNetworksByNamespace', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseNetworkEnablement = useNetworkEnablement as jest.MockedFunction<
    typeof useNetworkEnablement
  >;
  const mockGetNetworkImageSource =
    getNetworkImageSource as jest.MockedFunction<typeof getNetworkImageSource>;

  const mockNetworkImageSource = {
    uri: 'test-image.png',
  } as ImageSourcePropType;

  const mockPopularNetworks = {
    'eip155:1': {
      caipChainId: 'eip155:1' as CaipChainId,
      chainId: '0x1',
      name: 'Ethereum Mainnet',
      rpcEndpoints: [{ url: 'https://mainnet.infura.io/v3/test' }],
      defaultRpcEndpointIndex: 0,
    },
    'eip155:137': {
      caipChainId: 'eip155:137' as CaipChainId,
      chainId: '0x89',
      name: 'Polygon',
      rpcEndpoints: [{ url: 'https://polygon-rpc.com' }],
      defaultRpcEndpointIndex: 0,
    },
  };

  const mockCustomNetworks = [
    {
      caipChainId: 'eip155:80001' as CaipChainId,
      chainId: '0x13881',
      name: 'Mumbai Testnet',
      rpcEndpoints: [{ url: 'https://rpc-mumbai.maticvigil.com' }],
      defaultRpcEndpointIndex: 0,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNetworkEnablement.mockReturnValue({
      namespace: 'eip155',
      enabledNetworksByNamespace: {
        eip155: {
          '0x1': true,
          '0x89': false,
          '0x13881': true,
        },
      },
      enabledNetworksForCurrentNamespace: {
        '0x1': true,
        '0x89': false,
        '0x13881': true,
      },
      networkEnablementController: {
        enableNetwork: jest.fn(),
        disableNetwork: jest.fn(),
      } as unknown as ReturnType<
        typeof useNetworkEnablement
      >['networkEnablementController'],
      enableNetwork: jest.fn(),
      disableNetwork: jest.fn(),
      enableAllPopularNetworks: jest.fn(),
      isNetworkEnabled: jest.fn(),
      hasOneEnabledNetwork: false,
      tryEnableEvmNetwork: jest.fn(),
    });

    mockUseSelector.mockImplementation((selector) => {
      const selectorStr = selector.toString();
      if (
        selectorStr.includes('selectPopularNetworkConfigurationsByCaipChainId')
      ) {
        return mockPopularNetworks;
      }
      if (
        selectorStr.includes('selectCustomNetworkConfigurationsByCaipChainId')
      ) {
        return mockCustomNetworks;
      }
      return undefined;
    });

    mockUseSelector.mockReturnValue(mockPopularNetworks);

    (parseCaipChainId as jest.Mock).mockImplementation((chainId) => {
      if (chainId === 'eip155:1') {
        return { namespace: 'eip155', reference: '1' };
      }
      if (chainId === 'eip155:137') {
        return { namespace: 'eip155', reference: '137' };
      }
      if (chainId === 'eip155:80001') {
        return { namespace: 'eip155', reference: '80001' };
      }
      return { namespace: 'unknown', reference: '0' };
    });

    mockGetNetworkImageSource.mockReturnValue(mockNetworkImageSource);
  });

  describe('basic functionality', () => {
    it('returns expected object structure for popular networks', () => {
      const { result } = renderHook(() =>
        useNetworksByNamespace({ networkType: NetworkType.Popular }),
      );

      expect(result.current).toHaveProperty('networks');
      expect(result.current).toHaveProperty('selectedNetworks');
      expect(result.current).toHaveProperty('areAllNetworksSelected');
      expect(result.current).toHaveProperty('areAnyNetworksSelected');
      expect(result.current).toHaveProperty('networkCount');
      expect(result.current).toHaveProperty('selectedCount');
    });

    it('returns expected object structure for custom networks', () => {
      mockUseSelector.mockReturnValue(mockCustomNetworks);

      const { result } = renderHook(() =>
        useNetworksByNamespace({ networkType: NetworkType.Custom }),
      );

      expect(result.current).toHaveProperty('networks');
      expect(result.current).toHaveProperty('selectedNetworks');
      expect(result.current).toHaveProperty('areAllNetworksSelected');
      expect(result.current).toHaveProperty('areAnyNetworksSelected');
      expect(result.current).toHaveProperty('networkCount');
      expect(result.current).toHaveProperty('selectedCount');
    });

    it('filters networks by namespace for popular networks', () => {
      const { result } = renderHook(() =>
        useNetworksByNamespace({ networkType: NetworkType.Popular }),
      );

      expect(result.current.networks).toHaveLength(2);
      expect(result.current.networks[0].name).toBe('Ethereum Mainnet');
      expect(result.current.networks[1].name).toBe('Polygon');
    });

    it('filters networks by namespace for custom networks', () => {
      mockUseSelector.mockReturnValue(mockCustomNetworks);

      const { result } = renderHook(() =>
        useNetworksByNamespace({ networkType: NetworkType.Custom }),
      );

      expect(result.current.networks).toHaveLength(1);
      expect(result.current.networks[0].name).toBe('Mumbai Testnet');
    });
  });

  describe('network processing', () => {
    it('processes popular networks correctly', () => {
      const { result } = renderHook(() =>
        useNetworksByNamespace({ networkType: NetworkType.Popular }),
      );

      const ethereumNetwork = result.current.networks.find(
        (n) => n.name === 'Ethereum Mainnet',
      );
      expect(ethereumNetwork).toEqual({
        id: 'eip155:1',
        name: 'Ethereum Mainnet',
        caipChainId: 'eip155:1',
        isSelected: true,
        imageSource: mockNetworkImageSource,
        networkTypeOrRpcUrl: 'https://mainnet.infura.io/v3/test',
      });
    });

    it('processes custom networks correctly', () => {
      mockUseSelector.mockReturnValue(mockCustomNetworks);

      const { result } = renderHook(() =>
        useNetworksByNamespace({ networkType: NetworkType.Custom }),
      );

      const mumbaiNetwork = result.current.networks[0];
      expect(mumbaiNetwork).toEqual({
        id: 'eip155:80001',
        name: 'Mumbai Testnet',
        caipChainId: 'eip155:80001',
        isSelected: true,
        imageSource: mockNetworkImageSource,
        networkTypeOrRpcUrl: 'https://rpc-mumbai.maticvigil.com',
      });
    });

    it('sets isSelected based on enabledNetworksForCurrentNamespace', () => {
      const { result } = renderHook(() =>
        useNetworksByNamespace({ networkType: NetworkType.Popular }),
      );

      const ethereumNetwork = result.current.networks.find(
        (n) => n.name === 'Ethereum Mainnet',
      );
      const polygonNetwork = result.current.networks.find(
        (n) => n.name === 'Polygon',
      );

      expect(ethereumNetwork?.isSelected).toBe(true);
      expect(polygonNetwork?.isSelected).toBe(false);
    });
  });

  describe('selection state', () => {
    it('calculates selectedNetworks correctly', () => {
      const { result } = renderHook(() =>
        useNetworksByNamespace({ networkType: NetworkType.Popular }),
      );

      expect(result.current.selectedNetworks).toHaveLength(1);
      expect(result.current.selectedNetworks[0].name).toBe('Ethereum Mainnet');
    });

    it('calculates areAllNetworksSelected correctly when all selected', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: 'eip155',
        enabledNetworksByNamespace: {
          eip155: {
            '0x1': true,
            '0x89': true,
          },
        },
        enabledNetworksForCurrentNamespace: {
          '0x1': true,
          '0x89': true,
        },
        networkEnablementController: {
          enableNetwork: jest.fn(),
          disableNetwork: jest.fn(),
        } as unknown as ReturnType<
          typeof useNetworkEnablement
        >['networkEnablementController'],
        enableNetwork: jest.fn(),
        disableNetwork: jest.fn(),
        enableAllPopularNetworks: jest.fn(),
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
        tryEnableEvmNetwork: jest.fn(),
      });

      const { result } = renderHook(() =>
        useNetworksByNamespace({ networkType: NetworkType.Popular }),
      );

      expect(result.current.areAllNetworksSelected).toBe(true);
    });

    it('calculates areAllNetworksSelected correctly when not all selected', () => {
      const { result } = renderHook(() =>
        useNetworksByNamespace({ networkType: NetworkType.Popular }),
      );

      expect(result.current.areAllNetworksSelected).toBe(false);
    });

    it('calculates areAnyNetworksSelected correctly when some selected', () => {
      const { result } = renderHook(() =>
        useNetworksByNamespace({ networkType: NetworkType.Popular }),
      );

      expect(result.current.areAnyNetworksSelected).toBe(true);
    });

    it('calculates areAnyNetworksSelected correctly when none selected', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: 'eip155',
        enabledNetworksByNamespace: {
          eip155: {
            '0x1': false,
            '0x89': false,
          },
        },
        enabledNetworksForCurrentNamespace: {
          '0x1': false,
          '0x89': false,
        },
        networkEnablementController: {
          enableNetwork: jest.fn(),
          disableNetwork: jest.fn(),
        } as unknown as ReturnType<
          typeof useNetworkEnablement
        >['networkEnablementController'],
        enableNetwork: jest.fn(),
        disableNetwork: jest.fn(),
        enableAllPopularNetworks: jest.fn(),
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
        tryEnableEvmNetwork: jest.fn(),
      });

      const { result } = renderHook(() =>
        useNetworksByNamespace({ networkType: NetworkType.Popular }),
      );

      expect(result.current.areAnyNetworksSelected).toBe(false);
    });
  });

  describe('counts', () => {
    it('calculates networkCount correctly', () => {
      const { result } = renderHook(() =>
        useNetworksByNamespace({ networkType: NetworkType.Popular }),
      );

      expect(result.current.networkCount).toBe(2);
    });

    it('calculates selectedCount correctly', () => {
      const { result } = renderHook(() =>
        useNetworksByNamespace({ networkType: NetworkType.Popular }),
      );

      expect(result.current.selectedCount).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty network configurations for popular networks', () => {
      mockUseSelector.mockReturnValue({});

      const { result } = renderHook(() =>
        useNetworksByNamespace({ networkType: NetworkType.Popular }),
      );

      expect(result.current.networks).toHaveLength(0);
      expect(result.current.selectedNetworks).toHaveLength(0);
      expect(result.current.networkCount).toBe(0);
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.areAllNetworksSelected).toBe(false);
      expect(result.current.areAnyNetworksSelected).toBe(false);
    });

    it('handles empty network configurations for custom networks', () => {
      mockUseSelector.mockReturnValue([]);

      const { result } = renderHook(() =>
        useNetworksByNamespace({ networkType: NetworkType.Custom }),
      );

      expect(result.current.networks).toHaveLength(0);
      expect(result.current.selectedNetworks).toHaveLength(0);
      expect(result.current.networkCount).toBe(0);
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.areAllNetworksSelected).toBe(false);
      expect(result.current.areAnyNetworksSelected).toBe(false);
    });

    it('handles networks without rpcEndpoints', () => {
      const networksWithoutRpc = {
        'eip155:1': {
          caipChainId: 'eip155:1' as CaipChainId,
          chainId: '0x1',
          name: 'Ethereum Mainnet',
        },
      };

      mockUseSelector.mockReturnValue(networksWithoutRpc);

      const { result } = renderHook(() =>
        useNetworksByNamespace({ networkType: NetworkType.Popular }),
      );

      expect(result.current.networks[0].networkTypeOrRpcUrl).toBeUndefined();
    });

    it('handles different namespace filtering', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: 'solana',
        enabledNetworksByNamespace: {
          solana: {
            '0x1': true,
          },
        },
        enabledNetworksForCurrentNamespace: {
          '0x1': true,
        },
        networkEnablementController: {
          enableNetwork: jest.fn(),
          disableNetwork: jest.fn(),
        } as unknown as ReturnType<
          typeof useNetworkEnablement
        >['networkEnablementController'],
        enableNetwork: jest.fn(),
        disableNetwork: jest.fn(),
        enableAllPopularNetworks: jest.fn(),
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
        tryEnableEvmNetwork: jest.fn(),
      });

      (parseCaipChainId as jest.Mock).mockReturnValue({
        namespace: 'solana',
        reference: '1',
      });

      const { result } = renderHook(() =>
        useNetworksByNamespace({ networkType: NetworkType.Popular }),
      );

      expect(result.current.networks).toHaveLength(2); // Both networks will be filtered to solana namespace
    });
  });

  describe('hook return values', () => {
    it('returns all expected properties for popular networks', () => {
      const { result } = renderHook(() =>
        useNetworksByNamespace({ networkType: NetworkType.Popular }),
      );

      expect(result.current).toEqual({
        networks: expect.arrayContaining([
          expect.objectContaining({
            id: 'eip155:1',
            name: 'Ethereum Mainnet',
            caipChainId: 'eip155:1',
            isSelected: true,
            imageSource: mockNetworkImageSource,
            networkTypeOrRpcUrl: 'https://mainnet.infura.io/v3/test',
          }),
          expect.objectContaining({
            id: 'eip155:137',
            name: 'Polygon',
            caipChainId: 'eip155:137',
            isSelected: false,
            imageSource: mockNetworkImageSource,
            networkTypeOrRpcUrl: 'https://polygon-rpc.com',
          }),
        ]),
        selectedNetworks: expect.arrayContaining([
          expect.objectContaining({
            id: 'eip155:1',
            name: 'Ethereum Mainnet',
            isSelected: true,
          }),
        ]),
        areAllNetworksSelected: false,
        areAnyNetworksSelected: true,
        networkCount: 2,
        selectedCount: 1,
      });
    });

    it('returns all expected properties for custom networks', () => {
      mockUseSelector.mockReturnValue(mockCustomNetworks);

      const { result } = renderHook(() =>
        useNetworksByNamespace({ networkType: NetworkType.Custom }),
      );

      expect(result.current).toEqual({
        networks: expect.arrayContaining([
          expect.objectContaining({
            id: 'eip155:80001',
            name: 'Mumbai Testnet',
            caipChainId: 'eip155:80001',
            isSelected: true,
            imageSource: mockNetworkImageSource,
            networkTypeOrRpcUrl: 'https://rpc-mumbai.maticvigil.com',
          }),
        ]),
        selectedNetworks: expect.arrayContaining([
          expect.objectContaining({
            id: 'eip155:80001',
            name: 'Mumbai Testnet',
            isSelected: true,
          }),
        ]),
        areAllNetworksSelected: true,
        areAnyNetworksSelected: true,
        networkCount: 1,
        selectedCount: 1,
      });
    });
  });
});
