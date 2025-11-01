import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { ImageSourcePropType } from 'react-native';
import { useNetworks } from './useNetworks';
import { getNetworkImageSource } from '../../../../../util/networks';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(),
}));

jest.mock('../../../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
}));

jest.mock('../../../../../selectors/multichainNetworkController', () => ({
  selectNonEvmNetworkConfigurationsByChainId: jest.fn(),
}));

describe('useNetworks', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockGetNetworkImageSource =
    getNetworkImageSource as jest.MockedFunction<typeof getNetworkImageSource>;

  const mockEthereumImage: ImageSourcePropType = { uri: 'ethereum.png' };
  const mockPolygonImage: ImageSourcePropType = { uri: 'polygon.png' };
  const mockSolanaImage: ImageSourcePropType = { uri: 'solana.png' };

  const mockEvmNetworks = {
    '0x1': {
      chainId: '0x1',
      name: 'Ethereum Mainnet',
      rpcEndpoints: [{ url: 'https://mainnet.infura.io' }],
    },
    '0x89': {
      chainId: '0x89',
      name: 'Polygon',
      rpcEndpoints: [{ url: 'https://polygon-rpc.com' }],
    },
  };

  const mockNonEvmNetworks = {
    'solana:mainnet': {
      chainId: 'solana:mainnet',
      name: 'Solana Mainnet',
      imageSource: mockSolanaImage,
      ticker: 'SOL',
      isTestnet: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockGetNetworkImageSource.mockImplementation(({ chainId }) => {
      if (chainId === '0x1') return mockEthereumImage;
      if (chainId === '0x89') return mockPolygonImage;
      return { uri: 'default.png' };
    });
  });

  it('returns an array of NetworkInfo objects', () => {
    mockUseSelector
      .mockReturnValueOnce(mockEvmNetworks)
      .mockReturnValueOnce(mockNonEvmNetworks);

    const { result } = renderHook(() => useNetworks());

    expect(result.current).toBeInstanceOf(Array);
    expect(result.current).toHaveLength(3);
    result.current.forEach((network) => {
      expect(network).toHaveProperty('chainId');
      expect(network).toHaveProperty('name');
      expect(network).toHaveProperty('image');
    });
  });

  it('maps EVM networks correctly', () => {
    mockUseSelector
      .mockReturnValueOnce(mockEvmNetworks)
      .mockReturnValueOnce({});

    const { result } = renderHook(() => useNetworks());

    expect(result.current).toHaveLength(2);

    const ethereumNetwork = result.current.find((n) => n.chainId === '0x1');
    expect(ethereumNetwork).toEqual({
      chainId: '0x1',
      name: 'Ethereum Mainnet',
      image: mockEthereumImage,
    });

    const polygonNetwork = result.current.find((n) => n.chainId === '0x89');
    expect(polygonNetwork).toEqual({
      chainId: '0x89',
      name: 'Polygon',
      image: mockPolygonImage,
    });
  });

  it('maps non-EVM networks correctly', () => {
    mockUseSelector
      .mockReturnValueOnce({})
      .mockReturnValueOnce(mockNonEvmNetworks);

    const { result } = renderHook(() => useNetworks());

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toEqual({
      chainId: 'solana:mainnet',
      name: 'Solana Mainnet',
      image: mockSolanaImage,
    });
  });

  it('combines EVM and non-EVM networks', () => {
    mockUseSelector
      .mockReturnValueOnce(mockEvmNetworks)
      .mockReturnValueOnce(mockNonEvmNetworks);

    const { result } = renderHook(() => useNetworks());

    expect(result.current).toHaveLength(3);

    const chainIds = result.current.map((n) => n.chainId);
    expect(chainIds).toContain('0x1');
    expect(chainIds).toContain('0x89');
    expect(chainIds).toContain('solana:mainnet');
  });

  describe('image source handling', () => {
    it('calls getNetworkImageSource for EVM networks', () => {
      mockUseSelector
        .mockReturnValueOnce(mockEvmNetworks)
        .mockReturnValueOnce({});

      renderHook(() => useNetworks());

      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: '0x1',
      });
      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: '0x89',
      });
      expect(mockGetNetworkImageSource).toHaveBeenCalledTimes(2);
    });

    it('uses imageSource property for non-EVM networks', () => {
      mockUseSelector
        .mockReturnValueOnce({})
        .mockReturnValueOnce(mockNonEvmNetworks);

      const { result } = renderHook(() => useNetworks());

      expect(result.current[0].image).toBe(mockSolanaImage);
      expect(mockGetNetworkImageSource).not.toHaveBeenCalled();
    });
  });
});
