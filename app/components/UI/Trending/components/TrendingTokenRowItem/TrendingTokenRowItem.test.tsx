import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import TrendingTokenRowItem from './TrendingTokenRowItem';
import type { TrendingAsset } from '@metamask/assets-controllers';

const mockNavigate = jest.fn();

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

jest.mock('../../../NetworkModal', () => {
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      isVisible,
      onClose,
      networkConfiguration,
    }: {
      isVisible: boolean;
      onClose: () => void;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      networkConfiguration: any;
    }) => {
      if (!isVisible) return null;
      return (
        <View testID="network-modal">
          <Text testID="network-modal-network-name">
            {networkConfiguration?.nickname || 'Network'}
          </Text>
          <TouchableOpacity
            testID="network-modal-close-button"
            onPress={onClose}
          />
        </View>
      );
    },
  };
});

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

    expect(getByText(/\$0\.00 cap • \$0\.00 vol/)).toBeTruthy();
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
      });
    });

    it('shows network modal when network is not added', () => {
      const token = createMockToken({
        assetId: 'eip155:8453/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
      });

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

      const { getByTestId, queryByTestId } = renderWithProvider(
        <TrendingTokenRowItem token={token} />,
        { state: networkNotAddedState },
        false,
      );

      // Modal should not be visible initially
      expect(queryByTestId('network-modal')).toBeNull();

      const tokenRow = getByTestId(
        'trending-token-row-item-eip155:8453/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      );
      fireEvent.press(tokenRow);

      // Modal should be visible after pressing
      const networkModal = getByTestId('network-modal');
      expect(networkModal).toBeDefined();

      // Verify modal shows the network name
      const networkName = getByTestId('network-modal-network-name');
      expect(networkName.props.children).toBe('Base');

      // Navigation should NOT be called since modal is shown instead
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('closes network modal when cancel button is pressed', () => {
      const token = createMockToken({
        assetId: 'eip155:8453/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
      });

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

      const { getByTestId, queryByTestId } = renderWithProvider(
        <TrendingTokenRowItem token={token} />,
        { state: networkNotAddedState },
        false,
      );

      const tokenRow = getByTestId(
        'trending-token-row-item-eip155:8453/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      );
      fireEvent.press(tokenRow);

      const closeButton = getByTestId('network-modal-close-button');
      fireEvent.press(closeButton);

      expect(queryByTestId('network-modal')).toBeNull();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
