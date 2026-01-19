import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import TrendingTokenRowItem from './TrendingTokenRowItem';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { TimeOption } from '../TrendingTokensBottomSheet';

// Mock the trendingNetworksList module to avoid getNetworkImageSource errors
jest.mock('../../utils/trendingNetworksList', () => ({
  TRENDING_NETWORKS_LIST: [],
}));

const mockNavigate = jest.fn();
const mockAddPopularNetwork = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
  createNavigatorFactory: () => ({}),
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => {
    const actualStyleSheet = jest.requireActual(
      './TrendingTokenRowItem.styles',
    ).default;
    const mockTheme = {
      colors: {
        background: { default: '#FFFFFF', muted: '#F2F4F6' },
        text: { default: '#24272A', alternative: '#6A737D', muted: '#8A8D90' },
        primary: { default: '#037DD6' },
        success: { default: '#00C853' },
        border: { muted: '#D0D5DA' },
      },
    };
    return { styles: actualStyleSheet({ theme: mockTheme }) };
  }),
}));

jest.mock('../TrendingTokenLogo', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockTrendingTokenLogo({
      symbol,
      size,
    }: {
      symbol: string;
      size: number;
      recyclingKey: string;
    }) {
      return (
        <View testID={`trending-token-logo-${symbol}`} data-size={size}>
          {symbol}
        </View>
      );
    },
  };
});

jest.mock(
  '../../../../../component-library/components/Badges/BadgeWrapper',
  () => {
    const { View: RNView } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: function MockBadgeWrapper({
        children,
        badgeElement,
        badgePosition,
      }: {
        children: unknown;
        badgeElement: unknown;
        badgePosition: string;
      }) {
        return (
          <RNView testID="badge-wrapper" data-position={badgePosition}>
            {children}
            {badgeElement}
          </RNView>
        );
      },
      BadgePosition: {
        BottomRight: 'BottomRight',
      },
    };
  },
);

jest.mock('../../../../../component-library/components/Badges/Badge', () => {
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockBadge({
      size,
      variant,
      imageSource,
      isScaled,
    }: {
      size: string;
      variant: string;
      imageSource?: string;
      isScaled?: boolean;
    }) {
      return (
        <RNView
          testID="network-badge"
          data-size={size}
          data-variant={variant}
          data-image-source={imageSource}
          data-scaled={isScaled}
        />
      );
    },
    BadgeVariant: {
      Network: 'Network',
    },
  };
});

jest.mock('../../../../../util/networks', () => ({
  getDefaultNetworkByChainId: jest.fn(),
  getTestNetImageByChainId: jest.fn(),
  isTestNet: jest.fn(() => false),
}));

jest.mock('../../../../../util/networks/customNetworks', () => {
  // Create mutable objects that can be modified in tests
  const mockCustomNetworkImgMapping: Record<string, string> = {};
  const mockUnpopularNetworkList: unknown[] = [];

  // Create a mutable array for PopularList that can be modified in tests
  const mockPopularList = [
    {
      chainId: '0x1' as const,
      nickname: 'Ethereum Mainnet',
      ticker: 'ETH',
      rpcUrl: 'https://mainnet.infura.io/v3/test',
      failoverRpcUrls: [],
      rpcPrefs: {
        blockExplorerUrl: 'https://etherscan.io',
        imageUrl: 'https://ethereum.png',
        imageSource: undefined,
      },
    },
    {
      chainId: '0x2105' as const, // Base Mainnet chainId
      nickname: 'Base',
      ticker: 'ETH',
      rpcUrl: 'https://mainnet.base.org',
      failoverRpcUrls: [],
      rpcPrefs: {
        blockExplorerUrl: 'https://basescan.org',
        imageUrl: 'https://base.png',
        imageSource: undefined,
      },
    },
  ];

  return {
    CustomNetworkImgMapping: mockCustomNetworkImgMapping,
    PopularList: mockPopularList,
    UnpopularNetworkList: mockUnpopularNetworkList,
    getNonEvmNetworkImageSourceByChainId: jest.fn(),
  };
});

// Mock the constants file that uses PopularList at module load time
jest.mock('../../../../../constants/popular-networks', () => ({
  POPULAR_NETWORK_CHAIN_IDS: new Set(['0x1']),
  POPULAR_NETWORK_CHAIN_IDS_CAIP: new Set(['eip155:1']),
}));

jest.mock('../../../../hooks/useAddPopularNetwork', () => ({
  useAddPopularNetwork: () => ({
    addPopularNetwork: mockAddPopularNetwork,
  }),
}));

jest.mock('@metamask/utils', () => {
  const actual = jest.requireActual('@metamask/utils');
  return {
    ...actual,
    parseCaipChainId: jest.fn((chainId: string) => {
      const parts = chainId.split(':');
      return {
        namespace: parts[0],
        reference: parts[1],
      };
    }),
    isCaipChainId: jest.fn(
      (chainId: string) =>
        chainId.includes(':') && chainId.split(':').length >= 2,
    ),
  };
});

const { getDefaultNetworkByChainId, isTestNet } = jest.requireMock(
  '../../../../../util/networks',
);
const { parseCaipChainId, isCaipChainId } = jest.requireMock('@metamask/utils');
const mockIsCaipChainId = isCaipChainId as jest.MockedFunction<
  typeof isCaipChainId
>;

const mockGetDefaultNetworkByChainId =
  getDefaultNetworkByChainId as jest.MockedFunction<
    typeof getDefaultNetworkByChainId
  >;
const mockIsTestNet = isTestNet as jest.MockedFunction<typeof isTestNet>;
const mockParseCaipChainId = parseCaipChainId as jest.MockedFunction<
  typeof parseCaipChainId
>;

const createMockToken = (
  overrides: Partial<TrendingAsset> = {},
): TrendingAsset => ({
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  price: '1.00135763432467',
  aggregatedUsdVolume: 974248822.2,
  marketCap: 75641301011.76,
  priceChangePct: {
    h24: '+3.44',
    h6: '+1.23',
    h1: '+0.56',
    m5: '+0.12',
  },
  ...overrides,
});

describe('TrendingTokenRowItem', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockState: any = {
    engine: {
      backgroundState: {
        NetworkController: {
          networkConfigurations: {},
          networkConfigurationsByChainId: {},
        },
        MultichainNetworkController: {
          selectedMultichainNetworkChainId: undefined,
          multichainNetworkConfigurationsByChainId: {},
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTestNet.mockReturnValue(false);
    mockGetDefaultNetworkByChainId.mockReturnValue({
      imageSource: 'https://example.com/ethereum.png',
      type: 'mainnet',
    } as { imageSource: string; type: string });
    mockParseCaipChainId.mockImplementation((chainId: string) => {
      const parts = chainId.split(':');
      return {
        namespace: parts[0],
        reference: parts[1],
      };
    });

    // Ensure PopularList is properly reset between tests
    const { PopularList } = jest.requireMock(
      '../../../../../util/networks/customNetworks',
    );
    PopularList.length = 0;
    PopularList.push(
      {
        chainId: '0x1' as const,
        nickname: 'Ethereum Mainnet',
        ticker: 'ETH',
        rpcUrl: 'https://mainnet.infura.io/v3/test',
        failoverRpcUrls: [],
        rpcPrefs: {
          blockExplorerUrl: 'https://etherscan.io',
          imageUrl: 'https://ethereum.png',
          imageSource: undefined,
        },
      },
      {
        chainId: '0x2105' as const,
        nickname: 'Base',
        ticker: 'ETH',
        rpcUrl: 'https://mainnet.base.org',
        failoverRpcUrls: [],
        rpcPrefs: {
          blockExplorerUrl: 'https://basescan.org',
          imageUrl: 'https://base.png',
          imageSource: undefined,
        },
      },
    );
  });

  it('renders token name', () => {
    const token = createMockToken({ name: 'Ethereum' });

    const { getByText } = renderWithProvider(
      <TrendingTokenRowItem token={token} />,
      { state: mockState },
      false,
    );

    expect(getByText('Ethereum')).toBeTruthy();
  });

  it('renders token symbol when name is undefined', () => {
    const token = createMockToken({ name: undefined, symbol: 'ETH' });

    const { getByText } = renderWithProvider(
      <TrendingTokenRowItem token={token} />,
      { state: mockState },
      false,
    );

    expect(getByText('ETH')).toBeTruthy();
  });

  it('renders token symbol when name is null', () => {
    const token = createMockToken({
      name: null as unknown as string,
      symbol: 'BTC',
    });

    const { getByText } = renderWithProvider(
      <TrendingTokenRowItem token={token} />,
      { state: mockState },
      false,
    );

    expect(getByText('BTC')).toBeTruthy();
  });

  it('renders market stats with formatted values', () => {
    const token = createMockToken({
      marketCap: 75641301011.76,
      aggregatedUsdVolume: 974248822.2,
    });

    const { getByText } = renderWithProvider(
      <TrendingTokenRowItem token={token} />,
      { state: mockState },
      false,
    );

    expect(getByText(/\$76B cap • \$974\.2M vol/)).toBeTruthy();
  });

  it('renders formatted price', () => {
    const token = createMockToken({ price: '1.50' });

    const { getByText } = renderWithProvider(
      <TrendingTokenRowItem token={token} />,
      { state: mockState },
      false,
    );

    expect(getByText('$1.50')).toBeTruthy();
  });

  it('renders percentage change with positive indicator', () => {
    const token = createMockToken();

    const { getByText } = renderWithProvider(
      <TrendingTokenRowItem token={token} />,
      { state: mockState },
      false,
    );

    expect(getByText('+3.44%')).toBeTruthy();
  });

  it('renders percentage change with negative indicator', () => {
    const token = createMockToken({
      priceChangePct: {
        h24: '-2.50',
        h6: '-1.00',
        h1: '-0.50',
        m5: '-0.10',
      },
    });

    const { getByText } = renderWithProvider(
      <TrendingTokenRowItem token={token} />,
      { state: mockState },
      false,
    );

    expect(getByText('-2.50%')).toBeTruthy();
  });

  it('renders zero percentage change without indicator', () => {
    const token = createMockToken({
      priceChangePct: {
        h24: '0.00',
        h6: '0.00',
        h1: '0.00',
        m5: '0.00',
      },
    });

    const { getByText } = renderWithProvider(
      <TrendingTokenRowItem token={token} />,
      { state: mockState },
      false,
    );

    expect(getByText('0.00%')).toBeTruthy();
  });

  it('renders dash when price is zero', () => {
    const token = createMockToken({
      price: '0',
      priceChangePct: {
        h24: '0.00',
        h6: '0.00',
        h1: '0.00',
        m5: '0.00',
      },
    });

    const { getAllByText } = renderWithProvider(
      <TrendingTokenRowItem token={token} />,
      { state: mockState },
      false,
    );

    const dashes = getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('does not render percentage change when priceChangePct is undefined', () => {
    const token = createMockToken({
      priceChangePct: undefined,
    });

    const { queryByText } = renderWithProvider(
      <TrendingTokenRowItem token={token} />,
      { state: mockState },
      false,
    );

    expect(queryByText(/\+\d+\.\d+%/)).toBeNull();
    expect(queryByText(/-\d+\.\d+%/)).toBeNull();
  });

  it('does not render percentage change when field is missing', () => {
    const token = createMockToken({
      priceChangePct: {
        h6: '+1.23',
        h1: '+0.56',
        m5: '+0.12',
      } as TrendingAsset['priceChangePct'],
    });

    const { queryByText } = renderWithProvider(
      <TrendingTokenRowItem token={token} />,
      { state: mockState },
      false,
    );

    expect(queryByText(/\+\d+\.\d+%/)).toBeNull();
  });

  it('renders token logo with correct props', () => {
    const token = createMockToken({
      assetId: 'eip155:1/erc20:0x123',
      symbol: 'ETH',
    });

    const { getByTestId } = renderWithProvider(
      <TrendingTokenRowItem token={token} />,
      { state: mockState },
      false,
    );

    const logo = getByTestId('trending-token-logo-ETH');
    expect(logo).toBeTruthy();
    expect(logo.props['data-size']).toBe(40);
  });

  it('renders network badge with default network image source', () => {
    const token = createMockToken();

    const { getByTestId } = renderWithProvider(
      <TrendingTokenRowItem token={token} />,
      { state: mockState },
      false,
    );

    const badge = getByTestId('network-badge');
    expect(badge).toBeTruthy();
    expect(badge.props['data-image-source']).toBe(
      'https://example.com/ethereum.png',
    );
  });

  it('renders network badge with testnet image source when chain is testnet', () => {
    const { getTestNetImageByChainId } = jest.requireMock(
      '../../../../../util/networks',
    );
    const mockGetTestNetImageByChainId =
      getTestNetImageByChainId as jest.MockedFunction<
        typeof getTestNetImageByChainId
      >;
    mockGetTestNetImageByChainId.mockReturnValue('https://testnet.png');
    mockIsTestNet.mockReturnValue(true);

    const token = createMockToken();

    const { getByTestId } = renderWithProvider(
      <TrendingTokenRowItem token={token} />,
      { state: mockState },
      false,
    );

    const badge = getByTestId('network-badge');
    expect(badge.props['data-image-source']).toBe('https://testnet.png');
  });

  it('renders network badge with popular network image source', () => {
    const { PopularList } = jest.requireMock(
      '../../../../../util/networks/customNetworks',
    );
    // Update the existing network's imageSource
    const existingNetwork = PopularList.find(
      (network: { chainId: string }) => network.chainId === '0x1',
    );
    if (existingNetwork) {
      existingNetwork.rpcPrefs.imageSource = 'https://popular-network.png';
    }
    mockGetDefaultNetworkByChainId.mockReturnValue(undefined);

    const token = createMockToken();

    const { getByTestId } = renderWithProvider(
      <TrendingTokenRowItem token={token} />,
      { state: mockState },
      false,
    );

    const badge = getByTestId('network-badge');
    expect(badge.props['data-image-source']).toBe(
      'https://popular-network.png',
    );
  });

  it('renders network badge with unpopular network image source', () => {
    const { UnpopularNetworkList } = jest.requireMock(
      '../../../../../util/networks/customNetworks',
    );
    UnpopularNetworkList.push({
      chainId: '0x1' as const,
      rpcPrefs: {
        imageSource: 'https://unpopular-network.png',
      },
    });
    mockGetDefaultNetworkByChainId.mockReturnValue(undefined);

    const token = createMockToken();

    const { getByTestId } = renderWithProvider(
      <TrendingTokenRowItem token={token} />,
      { state: mockState },
      false,
    );

    const badge = getByTestId('network-badge');
    expect(badge.props['data-image-source']).toBe(
      'https://unpopular-network.png',
    );

    UnpopularNetworkList.pop();
  });

  it('renders network badge with non-EVM network image source', () => {
    const { getNonEvmNetworkImageSourceByChainId } = jest.requireMock(
      '../../../../../util/networks/customNetworks',
    );
    const mockGetNonEvmNetworkImageSourceByChainId =
      getNonEvmNetworkImageSourceByChainId as jest.MockedFunction<
        typeof getNonEvmNetworkImageSourceByChainId
      >;
    mockGetNonEvmNetworkImageSourceByChainId.mockReturnValue(
      'https://non-evm.png',
    );
    mockGetDefaultNetworkByChainId.mockReturnValue(undefined);
    mockIsCaipChainId.mockReturnValue(true);

    const token = createMockToken({
      assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
    });

    const { getByTestId } = renderWithProvider(
      <TrendingTokenRowItem token={token} />,
      { state: mockState },
      false,
    );

    const badge = getByTestId('network-badge');
    expect(badge.props['data-image-source']).toBe('https://non-evm.png');
  });

  it('renders network badge with undefined image source when no match found', () => {
    mockGetDefaultNetworkByChainId.mockReturnValue(undefined);
    mockIsCaipChainId.mockReturnValue(false);

    const token = createMockToken({
      assetId: 'unknown:999/erc20:0x123',
    });

    const { getByTestId } = renderWithProvider(
      <TrendingTokenRowItem token={token} />,
      { state: mockState },
      false,
    );

    const badge = getByTestId('network-badge');
    expect(badge.props['data-image-source']).toBeUndefined();
  });

  it('uses correct testID format with assetId', () => {
    const token = createMockToken({
      assetId: 'eip155:1/erc20:0xabc123',
    });

    const { getByTestId } = renderWithProvider(
      <TrendingTokenRowItem token={token} />,
      { state: mockState },
      false,
    );

    expect(
      getByTestId('trending-token-row-item-eip155:1/erc20:0xabc123'),
    ).toBeTruthy();
  });

  it('renders with zero market cap and volume', () => {
    const token = createMockToken({
      marketCap: 0,
      aggregatedUsdVolume: 0,
    });

    const { getByText } = renderWithProvider(
      <TrendingTokenRowItem token={token} />,
      { state: mockState },
      false,
    );

    expect(getByText(/- cap • - vol/)).toBeTruthy();
  });

  it('renders with very large market cap and volume', () => {
    const token = createMockToken({
      marketCap: 1500000000000,
      aggregatedUsdVolume: 5000000000,
    });

    const { getByText } = renderWithProvider(
      <TrendingTokenRowItem token={token} />,
      { state: mockState },
      false,
    );

    expect(getByText(/\$1500B cap • \$5B vol/)).toBeTruthy();
  });

  describe('time options', () => {
    it('uses h6 price change when SixHours option is selected', () => {
      const token = createMockToken();

      const { getByText } = renderWithProvider(
        <TrendingTokenRowItem
          token={token}
          selectedTimeOption={TimeOption.SixHours}
        />,
        { state: mockState },
        false,
      );

      expect(getByText('+1.23%')).toBeTruthy();
    });

    it('uses h1 price change when OneHour option is selected', () => {
      const token = createMockToken();

      const { getByText } = renderWithProvider(
        <TrendingTokenRowItem
          token={token}
          selectedTimeOption={TimeOption.OneHour}
        />,
        { state: mockState },
        false,
      );

      expect(getByText('+0.56%')).toBeTruthy();
    });

    it('uses m5 price change when FiveMinutes option is selected', () => {
      const token = createMockToken();

      const { getByText } = renderWithProvider(
        <TrendingTokenRowItem
          token={token}
          selectedTimeOption={TimeOption.FiveMinutes}
        />,
        { state: mockState },
        false,
      );

      expect(getByText('+0.12%')).toBeTruthy();
    });

    it('defaults to h24 when no time option is provided', () => {
      const token = createMockToken();

      const { getByText } = renderWithProvider(
        <TrendingTokenRowItem token={token} />,
        { state: mockState },
        false,
      );

      expect(getByText('+3.44%')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockIsCaipChainId.mockReturnValue(true);
    });

    it('navigates to Asset page with token data when network is already added', () => {
      const token = createMockToken({
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
      });

      // Mock networkConfigurations to include the network (already added)
      // The selector returns by CAIP chain ID, so we need to structure the state correctly
      const networkAddedState = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            NetworkController: {
              networkConfigurations: {},
              networkConfigurationsByChainId: {
                '0x1': {
                  chainId: '0x1',
                  caipChainId: 'eip155:1',
                  name: 'Ethereum Mainnet',
                },
              },
            },
            MultichainNetworkController: {
              ...mockState.engine.backgroundState.MultichainNetworkController,
              multichainNetworkConfigurationsByChainId: {},
            },
          },
        },
      };

      const { getByTestId } = renderWithProvider(
        <TrendingTokenRowItem token={token} />,
        { state: networkAddedState },
        false,
      );

      const tokenRow = getByTestId(
        'trending-token-row-item-eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      );
      fireEvent.press(tokenRow);

      expect(mockNavigate).toHaveBeenCalledWith('Asset', {
        chainId: '0x1',
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        image:
          'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
        pricePercentChange1d: 3.44,
        isNative: false,
        isETH: false,
        isFromTrending: true,
      });
    });

    it('navigates to Asset page with isETH true for native ETH on Ethereum mainnet', () => {
      const token = createMockToken({
        assetId: 'eip155:1/slip44:60',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
      });

      const networkAddedState = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            NetworkController: {
              networkConfigurations: {},
              networkConfigurationsByChainId: {
                '0x1': {
                  chainId: '0x1',
                  caipChainId: 'eip155:1',
                  name: 'Ethereum Mainnet',
                },
              },
            },
            MultichainNetworkController: {
              ...mockState.engine.backgroundState.MultichainNetworkController,
              multichainNetworkConfigurationsByChainId: {},
            },
          },
        },
      };

      const { getByTestId } = renderWithProvider(
        <TrendingTokenRowItem token={token} />,
        { state: networkAddedState },
        false,
      );

      const tokenRow = getByTestId(
        'trending-token-row-item-eip155:1/slip44:60',
      );
      fireEvent.press(tokenRow);

      expect(mockNavigate).toHaveBeenCalledWith('Asset', {
        chainId: '0x1',
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        image:
          'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
        pricePercentChange1d: 3.44,
        isNative: true,
        isETH: true,
        isFromTrending: true,
      });
    });

    it('navigates to Asset page with isNative true and isETH false for native token on non-Ethereum chain', () => {
      const token = createMockToken({
        assetId: 'eip155:137/slip44:966',
        symbol: 'MATIC',
        name: 'Polygon',
        decimals: 18,
      });

      const networkAddedState = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            NetworkController: {
              networkConfigurations: {},
              networkConfigurationsByChainId: {
                '0x89': {
                  chainId: '0x89',
                  caipChainId: 'eip155:137',
                  name: 'Polygon Mainnet',
                },
              },
            },
            MultichainNetworkController: {
              ...mockState.engine.backgroundState.MultichainNetworkController,
              multichainNetworkConfigurationsByChainId: {},
            },
          },
        },
      };

      const { getByTestId } = renderWithProvider(
        <TrendingTokenRowItem token={token} />,
        { state: networkAddedState },
        false,
      );

      const tokenRow = getByTestId(
        'trending-token-row-item-eip155:137/slip44:966',
      );
      fireEvent.press(tokenRow);

      expect(mockNavigate).toHaveBeenCalledWith('Asset', {
        chainId: '0x89',
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'MATIC',
        name: 'Polygon',
        decimals: 18,
        image:
          'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/137/slip44/966.png',
        pricePercentChange1d: 3.44,
        isNative: true,
        isETH: false,
        isFromTrending: true,
      });
    });

    it('adds network directly when network is not added and navigates to asset', async () => {
      const token = createMockToken({
        assetId: 'eip155:8453/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
      });

      mockAddPopularNetwork.mockResolvedValue(undefined);

      // Mock networkConfigurations to include Linea and Ethereum, but NOT Base
      const networkNotAddedState = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            NetworkController: {
              networkConfigurations: {},
              networkConfigurationsByChainId: {
                '0x1': {
                  chainId: '0x1',
                  caipChainId: 'eip155:1',
                  name: 'Ethereum Mainnet',
                },
                '0xE708': {
                  chainId: '0xE708',
                  caipChainId: 'eip155:59144',
                  name: 'Linea Mainnet',
                },
                // Base (0x2105) is NOT in this object, so it's not added
              },
            },
          },
        },
      };

      const { getByTestId } = renderWithProvider(
        <TrendingTokenRowItem token={token} />,
        { state: networkNotAddedState },
        false,
      );

      const tokenRow = getByTestId(
        'trending-token-row-item-eip155:8453/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      );
      await fireEvent.press(tokenRow);

      // Wait for async operation to complete
      await waitFor(() => {
        expect(mockAddPopularNetwork).toHaveBeenCalledWith(
          expect.objectContaining({
            chainId: '0x2105',
            nickname: 'Base',
          }),
        );
      });

      // Navigation should be called after network is added
      expect(mockNavigate).toHaveBeenCalledWith('Asset', expect.any(Object));
    });

    it('does not navigate when network addition fails', async () => {
      const token = createMockToken({
        assetId: 'eip155:8453/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
      });

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {
          // Suppress error output in test
        });

      mockAddPopularNetwork.mockRejectedValue(
        new Error('Failed to add network'),
      );

      const networkNotAddedState = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            NetworkController: {
              networkConfigurations: {},
              networkConfigurationsByChainId: {
                '0x1': {
                  chainId: '0x1',
                  caipChainId: 'eip155:1',
                  name: 'Ethereum Mainnet',
                },
              },
            },
          },
        },
      };

      const { getByTestId } = renderWithProvider(
        <TrendingTokenRowItem token={token} />,
        { state: networkNotAddedState },
        false,
      );

      const tokenRow = getByTestId(
        'trending-token-row-item-eip155:8453/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      );
      await fireEvent.press(tokenRow);

      // Wait for async operation to complete
      await waitFor(() => {
        expect(mockAddPopularNetwork).toHaveBeenCalled();
      });

      // Navigation should NOT be called when network addition fails
      expect(mockNavigate).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('does not navigate when assetParams is null', () => {
      mockIsCaipChainId.mockReturnValue(false);

      const token = createMockToken({
        assetId: 'invalid-chain-id/erc20:0x123',
      });

      const { getByTestId } = renderWithProvider(
        <TrendingTokenRowItem token={token} />,
        { state: mockState },
        false,
      );

      const tokenRow = getByTestId(
        'trending-token-row-item-invalid-chain-id/erc20:0x123',
      );
      fireEvent.press(tokenRow);

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('navigates with assetId as address for non-EVM chains', () => {
      const token = createMockToken({
        assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
        symbol: 'BTC',
        name: 'Bitcoin',
        decimals: 8,
      });

      mockParseCaipChainId.mockReturnValue({
        namespace: 'bip122',
        reference: '000000000019d6689c085ae165831e93',
      });

      const networkAddedState = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            NetworkController: {
              networkConfigurations: {},
              networkConfigurationsByChainId: {
                'bip122:000000000019d6689c085ae165831e93': {
                  chainId: 'bip122:000000000019d6689c085ae165831e93',
                  caipChainId: 'bip122:000000000019d6689c085ae165831e93',
                  name: 'Bitcoin',
                },
              },
            },
            MultichainNetworkController: {
              ...mockState.engine.backgroundState.MultichainNetworkController,
              multichainNetworkConfigurationsByChainId: {},
            },
          },
        },
      };

      const { getByTestId } = renderWithProvider(
        <TrendingTokenRowItem token={token} />,
        { state: networkAddedState },
        false,
      );

      const tokenRow = getByTestId(
        'trending-token-row-item-bip122:000000000019d6689c085ae165831e93/slip44:0',
      );
      fireEvent.press(tokenRow);

      expect(mockNavigate).toHaveBeenCalledWith('Asset', {
        chainId: 'bip122:000000000019d6689c085ae165831e93',
        address: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
        symbol: 'BTC',
        name: 'Bitcoin',
        decimals: 8,
        image:
          'https://static.cx.metamask.io/api/v2/tokenIcons/assets/bip122/000000000019d6689c085ae165831e93/slip44/0.png',
        pricePercentChange1d: 3.44,
        isNative: true,
        isETH: false,
        isFromTrending: true,
      });
    });

    it('navigates directly when network is not popular but is added', () => {
      const token = createMockToken({
        assetId: 'eip155:999/erc20:0x123',
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 18,
      });

      const networkAddedState = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            NetworkController: {
              networkConfigurations: {},
              networkConfigurationsByChainId: {
                '0x1': {
                  chainId: '0x1',
                  caipChainId: 'eip155:1',
                  name: 'Ethereum Mainnet',
                },
                '0x3e7': {
                  chainId: '0x3e7',
                  caipChainId: 'eip155:999',
                  name: 'Test Network',
                },
              },
            },
            MultichainNetworkController: {
              ...mockState.engine.backgroundState.MultichainNetworkController,
              multichainNetworkConfigurationsByChainId: {},
            },
          },
        },
      };

      const { getByTestId, queryByTestId } = renderWithProvider(
        <TrendingTokenRowItem token={token} />,
        { state: networkAddedState },
        false,
      );

      const tokenRow = getByTestId(
        'trending-token-row-item-eip155:999/erc20:0x123',
      );
      fireEvent.press(tokenRow);

      expect(queryByTestId('network-modal')).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('Asset', {
        chainId: '0x3e7',
        address: '0x123',
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 18,
        image:
          'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/999/erc20/0x123.png',
        pricePercentChange1d: 3.44,
        isNative: false,
        isETH: false,
        isFromTrending: true,
      });
    });
  });
});
