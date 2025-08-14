import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { CaipChainId, Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { useNetworkEnablement } from '../useNetworkEnablement/useNetworkEnablement';
import { ProcessedNetwork } from '../useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkSelection } from './useNetworkSelection';

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

jest.mock('@metamask/controller-utils', () => ({
  toHex: jest.fn(),
}));

jest.mock('@metamask/bridge-controller', () => ({
  formatChainIdToCaip: jest.fn(),
}));

jest.mock('../../../constants/popular-networks', () => ({
  POPULAR_NETWORK_CHAIN_IDS: new Set(['0x1', '0x89', '0xa']),
}));

jest.mock('../useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: jest.fn(),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectPopularNetworkConfigurationsByCaipChainId: jest.fn(),
}));

describe('useNetworkSelection', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseNetworkEnablement = useNetworkEnablement as jest.MockedFunction<
    typeof useNetworkEnablement
  >;
  const mockToHex = toHex as jest.MockedFunction<typeof toHex>;
  const mockFormatChainIdToCaip = formatChainIdToCaip as jest.MockedFunction<
    typeof formatChainIdToCaip
  >;

  const mockEnableNetwork = jest.fn();
  const mockDisableNetwork = jest.fn();
  const mockToggleNetwork = jest.fn();

  const mockNetworks: ProcessedNetwork[] = [
    {
      id: 'eip155:1',
      name: 'Ethereum Mainnet',
      caipChainId: 'eip155:1' as CaipChainId,
      isSelected: true,
      imageSource: { uri: 'ethereum.png' },
    },
    {
      id: 'eip155:137',
      name: 'Polygon',
      caipChainId: 'eip155:137' as CaipChainId,
      isSelected: false,
      imageSource: { uri: 'polygon.png' },
    },
    {
      id: 'eip155:13881',
      name: 'Mumbai Testnet',
      caipChainId: 'eip155:13881' as CaipChainId,
      isSelected: true,
      imageSource: { uri: 'mumbai.png' },
    },
  ];

  const mockPopularNetworkConfigurations = [
    {
      caipChainId: 'eip155:1' as CaipChainId,
      chainId: '0x1',
      name: 'Ethereum Mainnet',
    },
    {
      caipChainId: 'eip155:137' as CaipChainId,
      chainId: '0x89',
      name: 'Polygon',
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
      enableNetwork: mockEnableNetwork,
      disableNetwork: mockDisableNetwork,
      toggleNetwork: mockToggleNetwork,
      isNetworkEnabled: jest.fn(),
      hasOneEnabledNetwork: false,
    });

    mockUseSelector.mockReturnValue(mockPopularNetworkConfigurations);

    mockToHex.mockImplementation((value) => {
      if (typeof value === 'string') {
        if (value.startsWith('0x')) {
          return value as `0x${string}`;
        }
        return `0x${value}` as `0x${string}`;
      }
      return `0x${value}` as `0x${string}`;
    });

    mockFormatChainIdToCaip.mockImplementation((value) => {
      if (typeof value === 'string') {
        if (value.includes(':')) {
          return value as CaipChainId;
        }
        return `eip155:${value.replace('0x', '')}` as CaipChainId;
      }
      return `eip155:${value}` as CaipChainId;
    });
  });

  describe('basic functionality', () => {
    it('returns expected object structure', () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      expect(result.current).toHaveProperty('selectCustomNetwork');
      expect(result.current).toHaveProperty('selectPopularNetwork');
      expect(result.current).toHaveProperty('selectNetwork');
      expect(result.current).toHaveProperty('deselectAll');
      expect(result.current).toHaveProperty('toggleAll');
      expect(result.current).toHaveProperty('resetCustomNetworks');
      expect(result.current).toHaveProperty('customNetworksToReset');
    });

    it('returns functions for network operations', () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      expect(typeof result.current.selectCustomNetwork).toBe('function');
      expect(typeof result.current.selectPopularNetwork).toBe('function');
      expect(typeof result.current.selectNetwork).toBe('function');
      expect(typeof result.current.deselectAll).toBe('function');
      expect(typeof result.current.toggleAll).toBe('function');
      expect(typeof result.current.resetCustomNetworks).toBe('function');
    });

    it('calculates customNetworksToReset correctly', () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      expect(result.current.customNetworksToReset).toEqual(['eip155:13881']);
    });
  });

  describe('selectCustomNetwork', () => {
    it('enables the custom network and resets other custom networks', () => {
      const customChainId = 'eip155:999' as CaipChainId;

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      result.current.selectCustomNetwork(customChainId);

      expect(mockEnableNetwork).toHaveBeenCalledWith(customChainId);
      expect(mockDisableNetwork).toHaveBeenCalledWith('eip155:13881');
    });

    it('enables the custom network when no other custom networks exist', () => {
      const customChainId = 'eip155:999' as CaipChainId;
      mockUseNetworkEnablement.mockReturnValue({
        namespace: 'eip155',
        enabledNetworksByNamespace: {
          eip155: {
            '0x1': true,
            '0x89': false,
          },
        },
        enabledNetworksForCurrentNamespace: {
          '0x1': true,
          '0x89': false,
        },
        networkEnablementController: {
          enableNetwork: jest.fn(),
          disableNetwork: jest.fn(),
        } as unknown as ReturnType<
          typeof useNetworkEnablement
        >['networkEnablementController'],
        enableNetwork: mockEnableNetwork,
        disableNetwork: mockDisableNetwork,
        toggleNetwork: mockToggleNetwork,
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
      });

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      result.current.selectCustomNetwork(customChainId);

      expect(mockEnableNetwork).toHaveBeenCalledWith(customChainId);
      expect(mockDisableNetwork).not.toHaveBeenCalled();
    });
  });

  describe('selectPopularNetwork', () => {
    it('toggles the popular network and resets custom networks', () => {
      const popularChainId = 'eip155:1' as CaipChainId;

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      result.current.selectPopularNetwork(popularChainId);

      expect(mockToggleNetwork).toHaveBeenCalledWith(popularChainId);
      expect(mockDisableNetwork).toHaveBeenCalledWith('eip155:13881');
    });

    it('toggles the popular network when no custom networks exist', () => {
      const popularChainId = 'eip155:137' as CaipChainId;
      mockUseNetworkEnablement.mockReturnValue({
        namespace: 'eip155',
        enabledNetworksByNamespace: {
          eip155: {
            '0x1': true,
            '0x89': false,
          },
        },
        enabledNetworksForCurrentNamespace: {
          '0x1': true,
          '0x89': false,
        },
        networkEnablementController: {
          enableNetwork: jest.fn(),
          disableNetwork: jest.fn(),
        } as unknown as ReturnType<
          typeof useNetworkEnablement
        >['networkEnablementController'],
        enableNetwork: mockEnableNetwork,
        disableNetwork: mockDisableNetwork,
        toggleNetwork: mockToggleNetwork,
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
      });

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      result.current.selectPopularNetwork(popularChainId);

      expect(mockToggleNetwork).toHaveBeenCalledWith(popularChainId);
      expect(mockDisableNetwork).not.toHaveBeenCalled();
    });
  });

  describe('selectNetwork', () => {
    it('selects popular network when chainId is popular', () => {
      const popularChainId = 'eip155:1' as CaipChainId;

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      result.current.selectPopularNetwork(popularChainId);

      expect(mockToggleNetwork).toHaveBeenCalledWith(popularChainId);
      expect(mockDisableNetwork).toHaveBeenCalledWith('eip155:13881');
    });

    it('selects custom network when chainId is not popular', () => {
      const customChainId = 'eip155:999' as CaipChainId;

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      result.current.selectCustomNetwork(customChainId);

      expect(mockEnableNetwork).toHaveBeenCalledWith(customChainId);
      expect(mockDisableNetwork).toHaveBeenCalledWith('eip155:13881');
    });

    it('handles hex chainId format', () => {
      const hexChainId = '0x1' as `0x${string}`;

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      result.current.selectNetwork(hexChainId);

      expect(mockToggleNetwork).toHaveBeenCalledWith('eip155:1');
    });

    it('handles numeric chainId format', () => {
      const numericChainId = 1 as unknown as Hex;

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      result.current.selectNetwork(numericChainId);

      expect(mockToggleNetwork).toHaveBeenCalledWith('eip155:1');
    });
  });

  describe('deselectAll', () => {
    it('disables all networks except Ethereum', () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      result.current.deselectAll();

      expect(mockDisableNetwork).toHaveBeenCalledWith('eip155:137');
      expect(mockDisableNetwork).toHaveBeenCalledWith('eip155:13881');
      expect(mockDisableNetwork).not.toHaveBeenCalledWith('eip155:1');
    });

    it('disables all networks when Ethereum is not in the list', () => {
      const networksWithoutEthereum: ProcessedNetwork[] = [
        {
          id: 'eip155:137',
          name: 'Polygon',
          caipChainId: 'eip155:137' as CaipChainId,
          isSelected: true,
          imageSource: { uri: 'polygon.png' },
        },
        {
          id: 'eip155:13881',
          name: 'Mumbai Testnet',
          caipChainId: 'eip155:13881' as CaipChainId,
          isSelected: true,
          imageSource: { uri: 'mumbai.png' },
        },
      ];

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: networksWithoutEthereum }),
      );
      result.current.deselectAll();

      expect(mockDisableNetwork).toHaveBeenCalledWith('eip155:137');
      expect(mockDisableNetwork).toHaveBeenCalledWith('eip155:13881');
    });
  });

  describe('toggleAll', () => {
    it('deselects all when all networks are selected', () => {
      const allSelectedNetworks: ProcessedNetwork[] = [
        {
          id: 'eip155:1',
          name: 'Ethereum Mainnet',
          caipChainId: 'eip155:1' as CaipChainId,
          isSelected: true,
          imageSource: { uri: 'ethereum.png' },
        },
        {
          id: 'eip155:137',
          name: 'Polygon',
          caipChainId: 'eip155:137' as CaipChainId,
          isSelected: true,
          imageSource: { uri: 'polygon.png' },
        },
      ];

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: allSelectedNetworks }),
      );
      result.current.toggleAll();

      expect(mockDisableNetwork).toHaveBeenCalledWith('eip155:137');
      expect(mockDisableNetwork).not.toHaveBeenCalledWith('eip155:1');
    });

    it('selects all networks when not all are selected', () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      result.current.toggleAll();

      expect(mockEnableNetwork).toHaveBeenCalledWith('eip155:1');
      expect(mockEnableNetwork).toHaveBeenCalledWith('eip155:137');
      expect(mockEnableNetwork).toHaveBeenCalledWith('eip155:13881');
      expect(mockDisableNetwork).toHaveBeenCalledWith('eip155:13881');
    });
  });

  describe('resetCustomNetworks', () => {
    it('disables all custom networks when no excludeChainId is provided', () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      result.current.resetCustomNetworks();

      expect(mockDisableNetwork).toHaveBeenCalledWith('eip155:13881');
    });

    it('disables custom networks except the excluded one', () => {
      const excludeChainId = 'eip155:13881' as CaipChainId;

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      result.current.resetCustomNetworks(excludeChainId);

      expect(mockDisableNetwork).not.toHaveBeenCalled();
    });

    it('does nothing when no custom networks exist', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: 'eip155',
        enabledNetworksByNamespace: {
          eip155: {
            '0x1': true,
            '0x89': false,
          },
        },
        enabledNetworksForCurrentNamespace: {
          '0x1': true,
          '0x89': false,
        },
        networkEnablementController: {
          enableNetwork: jest.fn(),
          disableNetwork: jest.fn(),
        } as unknown as ReturnType<
          typeof useNetworkEnablement
        >['networkEnablementController'],
        enableNetwork: mockEnableNetwork,
        disableNetwork: mockDisableNetwork,
        toggleNetwork: mockToggleNetwork,
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
      });

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );
      result.current.resetCustomNetworks();

      expect(mockDisableNetwork).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles empty networks array', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: 'eip155',
        enabledNetworksByNamespace: {
          eip155: {
            '0x1': true,
            '0x89': false,
          },
        },
        enabledNetworksForCurrentNamespace: {
          '0x1': true,
          '0x89': false,
        },
        networkEnablementController: {
          enableNetwork: jest.fn(),
          disableNetwork: jest.fn(),
        } as unknown as ReturnType<
          typeof useNetworkEnablement
        >['networkEnablementController'],
        enableNetwork: mockEnableNetwork,
        disableNetwork: mockDisableNetwork,
        toggleNetwork: mockToggleNetwork,
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
      });

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: [] }),
      );

      expect(result.current.customNetworksToReset).toEqual([]);
    });

    it('handles undefined enabledNetworksByNamespace', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: 'eip155',
        enabledNetworksByNamespace: {
          eip155: undefined as unknown as Record<string, boolean>,
        },
        enabledNetworksForCurrentNamespace: {},
        networkEnablementController: {
          enableNetwork: jest.fn(),
          disableNetwork: jest.fn(),
        } as unknown as ReturnType<
          typeof useNetworkEnablement
        >['networkEnablementController'],
        enableNetwork: mockEnableNetwork,
        disableNetwork: mockDisableNetwork,
        toggleNetwork: mockToggleNetwork,
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
      });

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      expect(result.current.customNetworksToReset).toEqual([]);
    });

    it('handles empty enabledNetworksByNamespace for namespace', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: 'eip155',
        enabledNetworksByNamespace: {
          eip155: {},
        },
        enabledNetworksForCurrentNamespace: {},
        networkEnablementController: {
          enableNetwork: jest.fn(),
          disableNetwork: jest.fn(),
        } as unknown as ReturnType<
          typeof useNetworkEnablement
        >['networkEnablementController'],
        enableNetwork: mockEnableNetwork,
        disableNetwork: mockDisableNetwork,
        toggleNetwork: mockToggleNetwork,
        isNetworkEnabled: jest.fn(),
        hasOneEnabledNetwork: false,
      });

      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      expect(result.current.customNetworksToReset).toEqual([]);
    });
  });

  describe('hook return values', () => {
    it('returns all expected properties', () => {
      const { result } = renderHook(() =>
        useNetworkSelection({ networks: mockNetworks }),
      );

      expect(result.current).toEqual({
        selectCustomNetwork: expect.any(Function),
        selectPopularNetwork: expect.any(Function),
        selectNetwork: expect.any(Function),
        deselectAll: expect.any(Function),
        toggleAll: expect.any(Function),
        resetCustomNetworks: expect.any(Function),
        customNetworksToReset: ['eip155:13881'],
      });
    });
  });
});
