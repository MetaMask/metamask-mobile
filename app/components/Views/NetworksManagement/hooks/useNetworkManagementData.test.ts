import { useSelector } from 'react-redux';
import { renderHook } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import {
  NetworkConfiguration,
  RpcEndpointType,
} from '@metamask/network-controller';
import { useNetworkManagementData } from './useNetworkManagementData';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { SECTION_KEYS } from '../NetworksManagementView.constants';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../util/networks', () => ({
  ...jest.requireActual('../../../../util/networks'),
  isTestNet: jest.fn((chainId: string) =>
    ['0xaa36a7', '0xe705', '0xe708'].includes(chainId),
  ),
  getNetworkImageSource: jest.fn(() => 'mock-image-source'),
}));

jest.mock('../../../../util/networks/customNetworks', () => ({
  PopularList: [
    {
      chainId: '0xa86a',
      nickname: 'Avalanche',
      rpcUrl: 'https://avalanche.example.com',
      ticker: 'AVAX',
      rpcPrefs: { blockExplorerUrl: 'https://snowtrace.io', imageSource: 1 },
    },
    {
      chainId: '0xa4b1',
      nickname: 'Arbitrum',
      rpcUrl: 'https://arbitrum.example.com',
      ticker: 'ETH',
      rpcPrefs: { blockExplorerUrl: 'https://arbiscan.io', imageSource: 2 },
    },
  ],
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const createMockNetworkConfig = (
  overrides: Partial<NetworkConfiguration> & { chainId: Hex },
): NetworkConfiguration =>
  ({
    chainId: overrides.chainId,
    name: overrides.name ?? 'Test Network',
    nativeCurrency: overrides.nativeCurrency ?? 'ETH',
    rpcEndpoints: overrides.rpcEndpoints ?? [
      {
        url: 'https://rpc.example.com',
        type: RpcEndpointType.Custom,
        networkClientId: 'client-1',
      },
    ],
    defaultRpcEndpointIndex: overrides.defaultRpcEndpointIndex ?? 0,
    blockExplorerUrls: overrides.blockExplorerUrls ?? [],
    defaultBlockExplorerUrlIndex: overrides.defaultBlockExplorerUrlIndex ?? 0,
  }) as NetworkConfiguration;

describe('useNetworkManagementData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupMockSelectors = ({
    networkConfigurations = {},
  }: {
    networkConfigurations?: Record<Hex, NetworkConfiguration>;
  } = {}) => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectEvmNetworkConfigurationsByChainId) {
        return networkConfigurations;
      }
      return undefined;
    });
  };

  it('returns only available networks section when no networks are configured', () => {
    setupMockSelectors();

    const { result } = renderHook(() =>
      useNetworkManagementData({ searchQuery: '' }),
    );

    // No added mainnets/testnets sections (empty sections are filtered out)
    const addedMainnets = result.current.sections.find(
      (s) => s.key === SECTION_KEYS.ADDED_MAINNETS,
    );
    expect(addedMainnets).toBeUndefined();

    // Available networks should show all popular networks
    const available = result.current.sections.find(
      (s) => s.key === SECTION_KEYS.AVAILABLE_NETWORKS,
    );
    expect(available?.data).toHaveLength(2);
  });

  it('categorizes added mainnet networks correctly', () => {
    const networkConfigurations: Record<Hex, NetworkConfiguration> = {
      '0x1': createMockNetworkConfig({
        chainId: '0x1',
        name: 'Ethereum Mainnet',
        nativeCurrency: 'ETH',
      }),
      '0x89': createMockNetworkConfig({
        chainId: '0x89',
        name: 'Polygon',
        nativeCurrency: 'MATIC',
      }),
    };

    setupMockSelectors({ networkConfigurations });

    const { result } = renderHook(() =>
      useNetworkManagementData({ searchQuery: '' }),
    );

    const addedMainnets = result.current.sections.find(
      (s) => s.key === SECTION_KEYS.ADDED_MAINNETS,
    );

    expect(addedMainnets?.data).toHaveLength(2);
    expect(addedMainnets?.data[0].name).toBe('Ethereum Mainnet');
    expect(addedMainnets?.data[0].isTestNet).toBe(false);
    expect(addedMainnets?.data[0].isAdded).toBe(true);
    expect(addedMainnets?.data[1].name).toBe('Polygon');
  });

  it('separates testnet networks into their own section', () => {
    const networkConfigurations: Record<Hex, NetworkConfiguration> = {
      '0x1': createMockNetworkConfig({
        chainId: '0x1',
        name: 'Ethereum Mainnet',
      }),
      '0xaa36a7': createMockNetworkConfig({
        chainId: '0xaa36a7',
        name: 'Sepolia',
      }),
    };

    setupMockSelectors({ networkConfigurations });

    const { result } = renderHook(() =>
      useNetworkManagementData({ searchQuery: '' }),
    );

    const addedMainnets = result.current.sections.find(
      (s) => s.key === SECTION_KEYS.ADDED_MAINNETS,
    );
    const addedTestnets = result.current.sections.find(
      (s) => s.key === SECTION_KEYS.ADDED_TESTNETS,
    );

    expect(addedMainnets?.data).toHaveLength(1);
    expect(addedMainnets?.data[0].name).toBe('Ethereum Mainnet');

    expect(addedTestnets?.data).toHaveLength(1);
    expect(addedTestnets?.data[0].name).toBe('Sepolia');
    expect(addedTestnets?.data[0].isTestNet).toBe(true);
  });

  it('always shows testnet section when testnets are configured', () => {
    const networkConfigurations: Record<Hex, NetworkConfiguration> = {
      '0x1': createMockNetworkConfig({
        chainId: '0x1',
        name: 'Ethereum Mainnet',
      }),
      '0xaa36a7': createMockNetworkConfig({
        chainId: '0xaa36a7',
        name: 'Sepolia',
      }),
    };

    setupMockSelectors({ networkConfigurations });

    const { result } = renderHook(() =>
      useNetworkManagementData({ searchQuery: '' }),
    );

    const addedTestnets = result.current.sections.find(
      (s) => s.key === SECTION_KEYS.ADDED_TESTNETS,
    );

    expect(addedTestnets?.data).toHaveLength(1);
    expect(addedTestnets?.data[0].name).toBe('Sepolia');
  });

  it('computes available networks from PopularList that are not added', () => {
    // Only Avalanche (0xa86a) is added; Arbitrum (0xa4b1) should be available
    const networkConfigurations: Record<Hex, NetworkConfiguration> = {
      '0xa86a': createMockNetworkConfig({
        chainId: '0xa86a',
        name: 'Avalanche',
      }),
    };

    setupMockSelectors({ networkConfigurations });

    const { result } = renderHook(() =>
      useNetworkManagementData({ searchQuery: '' }),
    );

    const available = result.current.sections.find(
      (s) => s.key === SECTION_KEYS.AVAILABLE_NETWORKS,
    );

    expect(available?.data).toHaveLength(1);
    expect(available?.data[0].name).toBe('Arbitrum');
    expect(available?.data[0].isAdded).toBe(false);
  });

  it('shows no available networks section when all popular networks are added', () => {
    const networkConfigurations: Record<Hex, NetworkConfiguration> = {
      '0xa86a': createMockNetworkConfig({
        chainId: '0xa86a',
        name: 'Avalanche',
      }),
      '0xa4b1': createMockNetworkConfig({
        chainId: '0xa4b1',
        name: 'Arbitrum',
      }),
    };

    setupMockSelectors({ networkConfigurations });

    const { result } = renderHook(() =>
      useNetworkManagementData({ searchQuery: '' }),
    );

    const available = result.current.sections.find(
      (s) => s.key === SECTION_KEYS.AVAILABLE_NETWORKS,
    );

    // Section should not exist or should have empty data
    expect(available).toBeUndefined();
  });

  it('filters networks by search query (case-insensitive)', () => {
    const networkConfigurations: Record<Hex, NetworkConfiguration> = {
      '0x1': createMockNetworkConfig({
        chainId: '0x1',
        name: 'Ethereum Mainnet',
      }),
      '0x89': createMockNetworkConfig({
        chainId: '0x89',
        name: 'Polygon',
      }),
    };

    setupMockSelectors({ networkConfigurations });

    const { result } = renderHook(() =>
      useNetworkManagementData({ searchQuery: 'poly' }),
    );

    const addedMainnets = result.current.sections.find(
      (s) => s.key === SECTION_KEYS.ADDED_MAINNETS,
    );

    expect(addedMainnets?.data).toHaveLength(1);
    expect(addedMainnets?.data[0].name).toBe('Polygon');
  });

  it('filters available networks by search query too', () => {
    setupMockSelectors({ networkConfigurations: {} });

    const { result } = renderHook(() =>
      useNetworkManagementData({ searchQuery: 'aval' }),
    );

    const available = result.current.sections.find(
      (s) => s.key === SECTION_KEYS.AVAILABLE_NETWORKS,
    );

    expect(available?.data).toHaveLength(1);
    expect(available?.data[0].name).toBe('Avalanche');
  });

  it('detects networks with multiple RPC endpoints', () => {
    const networkConfigurations: Record<Hex, NetworkConfiguration> = {
      '0x1': createMockNetworkConfig({
        chainId: '0x1',
        name: 'Ethereum Mainnet',
        rpcEndpoints: [
          {
            url: 'https://mainnet.infura.io/v3/key',
            type: RpcEndpointType.Infura,
            networkClientId: 'mainnet',
          } as NetworkConfiguration['rpcEndpoints'][number],
          {
            url: 'https://custom-rpc.example.com',
            type: RpcEndpointType.Custom,
            networkClientId: 'custom-1',
          } as NetworkConfiguration['rpcEndpoints'][number],
        ],
      }),
    };

    setupMockSelectors({ networkConfigurations });

    const { result } = renderHook(() =>
      useNetworkManagementData({ searchQuery: '' }),
    );

    const addedMainnets = result.current.sections.find(
      (s) => s.key === SECTION_KEYS.ADDED_MAINNETS,
    );

    expect(addedMainnets?.data[0].hasMultipleRpcs).toBe(true);
    expect(addedMainnets?.data[0].rpcUrl).toBe(
      'https://mainnet.infura.io/v3/key',
    );
  });

  it('removes empty sections from the result', () => {
    setupMockSelectors({ networkConfigurations: {} });

    const { result } = renderHook(() =>
      useNetworkManagementData({ searchQuery: 'zzz-nonexistent' }),
    );

    // All sections should be filtered out since no data matches
    expect(result.current.sections).toHaveLength(0);
  });
});
