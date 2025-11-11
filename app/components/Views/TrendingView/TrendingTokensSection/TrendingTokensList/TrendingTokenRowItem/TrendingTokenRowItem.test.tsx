import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import TrendingTokenRowItem from './TrendingTokenRowItem';
import type { TrendingAsset } from '@metamask/assets-controllers';

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

jest.mock('../../../../../util/networks/customNetworks', () => ({
  CustomNetworkImgMapping: {},
  PopularList: [],
  UnpopularNetworkList: [],
  getNonEvmNetworkImageSourceByChainId: jest.fn(),
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
    isCaipChainId: jest.fn(() => false),
  };
});

const { getDefaultNetworkByChainId, isTestNet } = jest.requireMock(
  '../../../../../util/networks',
);
const { parseCaipChainId } = jest.requireMock('@metamask/utils');

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
  ...overrides,
});

describe('TrendingTokenRowItem', () => {
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

  it('matches snapshot', () => {
    const token = createMockToken();
    const mockOnPress = jest.fn();

    const { toJSON } = render(
      <TrendingTokenRowItem token={token} onPress={mockOnPress} />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('calls onPress when pressed', () => {
    const token = createMockToken();
    const mockOnPress = jest.fn();

    const { root } = render(
      <TrendingTokenRowItem token={token} onPress={mockOnPress} />,
    );

    const touchableOpacity = root.findByType(TouchableOpacity);
    fireEvent.press(touchableOpacity);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
