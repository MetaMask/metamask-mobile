import React from 'react';
import { render } from '@testing-library/react-native';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import { strings } from '../../../../../locales/i18n';
import ShareTokenBottomSheet from './ShareTokenBottomSheet';
import type { TokenI } from '../../Tokens/types';

const mockBottomSheetHeader = jest.fn(
  ({
    children,
    onClose,
    textProps,
  }: {
    children?: React.ReactNode;
    onClose?: () => void;
    textProps?: { variant?: string };
  }) => {
    const { Text, View } = jest.requireActual('react-native');
    return (
      <View testID="share-token-sheet-header">
        {onClose ? <View testID="share-token-close-button" /> : null}
        <Text testID="share-token-sheet-title-variant">
          {textProps?.variant}
        </Text>
        <Text testID="share-token-sheet-title">{children}</Text>
      </View>
    );
  },
);

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const {
    Text: RNText,
    View,
    TouchableOpacity,
  } = jest.requireActual('react-native');

  return {
    BottomSheet: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, { testID }, children),
    BottomSheetHeader: (props: {
      children?: React.ReactNode;
      onClose?: () => void;
      textProps?: { variant?: string };
    }) => mockBottomSheetHeader(props),
    BottomSheetFooter: ({
      primaryButtonProps,
    }: {
      primaryButtonProps?: {
        children?: React.ReactNode;
        onPress?: () => void;
        testID?: string;
      };
    }) =>
      ReactActual.createElement(
        TouchableOpacity,
        {
          onPress: primaryButtonProps?.onPress,
          testID: primaryButtonProps?.testID,
        },
        ReactActual.createElement(RNText, {}, primaryButtonProps?.children),
      ),
    Box: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, { testID }, children),
    Text: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(RNText, { testID }, children),
    Button: () => null,
    ButtonSize: { Lg: 'Lg' },
    ButtonVariant: { Primary: 'Primary' },
    IconName: { Share: 'Share' },
    TextColor: { TextAlternative: 'TextAlternative' },
    TextVariant: { BodySm: 'BodySm', HeadingLg: 'HeadingLg' },
  };
});

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector: (state: unknown) => unknown) => selector({})),
}));

jest.mock('../../../../util/theme/themeUtils', () => ({
  useElevatedSurface: () => 'bg-default',
}));

jest.mock('../../../../selectors/tokenRatesController', () => ({
  selectTokenMarketData: jest.fn(() => ({})),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectConversionRateBySymbol: jest.fn(() => 1),
  selectCurrentCurrency: jest.fn(() => 'usd'),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectNativeCurrencyByChainId: jest.fn(() => 'ETH'),
}));

jest.mock('../../../../selectors/tokenSearchDiscoveryDataController', () => ({
  isAssetFromSearch: jest.fn(() => false),
  selectTokenDisplayData: jest.fn(() => ({ found: false })),
}));

jest.mock('../../Bridge/utils/exchange-rates', () => ({
  getTokenExchangeRate: jest.fn(() => Promise.resolve(undefined)),
}));

jest.mock('../../AssetOverview/utils/marketDetails', () => ({
  formatMarketDetails: jest.fn(() => ({
    marketCap: '$126.57M',
    totalVolume: '$75.57M',
  })),
}));

jest.mock('../../AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn(() => ({ uri: 'network-badge' })),
}));

jest.mock('./ShareTokenCard', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      formattedPrice,
      priceChangePercent,
    }: {
      formattedPrice: string;
      priceChangePercent: number;
    }) => (
      <View testID="share-token-card-mock">
        <Text testID="share-token-card-price">{formattedPrice}</Text>
        <Text testID="share-token-card-change">{priceChangePercent}</Text>
      </View>
    ),
  };
});

const mockToken: TokenI = {
  address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  chainId: '0x1',
  symbol: 'DAI',
  name: 'Dai Stablecoin',
  decimals: 18,
  image: '',
  balance: '0',
  logo: undefined,
  isETH: false,
  pricePercentChange1d: -2.5,
};

const mockSecurityData: TokenSecurityData = {
  resultType: 'Benign',
  maliciousScore: '0',
  fees: {
    transfer: 0,
    transferFeeMaxAmount: null,
    buy: 0,
    sell: 0,
  },
  features: [],
  financialStats: {
    supply: 1000000,
    topHolders: [],
    holdersCount: 28780,
    tradeVolume24h: 75570000,
    lockedLiquidityPct: null,
    markets: [
      {
        marketType: 'dex',
        marketName: 'Uniswap',
        pairName: 'DAI/USDC',
        reserveUSD: 11630000,
      },
    ],
  },
  metadata: {
    externalLinks: {
      homepage: null,
      twitterPage: null,
      telegramChannelId: null,
    },
  },
  created: '2023-01-01T00:00:00Z',
};

const defaultProps = {
  shareUrl:
    'https://link.metamask.io/asset?assetId=eip155%3A1%2Ferc20%3A0x6b175474e89094c44da98b954eedeac495271d0f',
  token: mockToken,
  currentPrice: 1,
  priceDiff: -0.02,
  comparePrice: 1.02,
  currentCurrency: 'usd',
  securityData: mockSecurityData,
  networkName: 'Ethereum Mainnet',
  onClose: jest.fn(),
};

describe('ShareTokenBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders share token info title with large heading variant and no close button', () => {
    const { getByTestId, queryByTestId } = render(
      <ShareTokenBottomSheet {...defaultProps} />,
    );

    expect(getByTestId('share-token-sheet-title').props.children).toBe(
      strings('share_token.title'),
    );
    expect(getByTestId('share-token-sheet-title-variant').props.children).toBe(
      'HeadingLg',
    );
    expect(queryByTestId('share-token-close-button')).toBeNull();
  });

  it('renders the share URL and passes formatted card data', () => {
    const { getByTestId } = render(<ShareTokenBottomSheet {...defaultProps} />);

    expect(getByTestId('share-token-url').props.children).toBe(
      defaultProps.shareUrl,
    );
    expect(getByTestId('share-token-card-price').props.children).toBe('$1.00');
    expect(getByTestId('share-token-card-change').props.children).toBe(-2.5);
  });

  it('renders the share token info action button label', () => {
    const { getByTestId } = render(<ShareTokenBottomSheet {...defaultProps} />);

    expect(getByTestId('share-token-native-share-button')).toBeTruthy();
  });
});
