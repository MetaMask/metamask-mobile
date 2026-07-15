import React from 'react';
import { Platform, Share } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type {
  MarketDataDetails,
  TokenSecurityData,
} from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import ShareTokenBottomSheet, {
  type ShareTokenBottomSheetProps,
} from './ShareTokenBottomSheet';
import type { ShareTokenCardProps } from './ShareTokenCard';
import type { TokenI } from '../../Tokens/types';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import {
  isAssetFromSearch,
  selectTokenDisplayData,
} from '../../../../selectors/tokenSearchDiscoveryDataController';
import { getTokenExchangeRate } from '../../Bridge/utils/exchange-rates';
import { formatMarketDetails } from '../../AssetOverview/utils/marketDetails';
import { NetworkBadgeSource } from '../../AssetOverview/Balance/Balance';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import { safeToChecksumAddress } from '../../../../util/address';

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

const mockShareTokenCard = jest.fn((props: ShareTokenCardProps) => {
  const {
    formattedPrice,
    priceChangePercent,
    marketCap,
    liquidity,
    holdersCount,
    volume24h,
    networkBadgeSource,
    networkName,
  } = props;
  const { View, Text } = jest.requireActual('react-native');
  return (
    <View testID="share-token-card-mock">
      <Text testID="share-token-card-price">{formattedPrice}</Text>
      <Text testID="share-token-card-change">{priceChangePercent}</Text>
      <Text testID="share-token-card-market-cap">{marketCap ?? 'null'}</Text>
      <Text testID="share-token-card-liquidity">{liquidity ?? 'null'}</Text>
      <Text testID="share-token-card-holders">{holdersCount ?? 'null'}</Text>
      <Text testID="share-token-card-volume">{volume24h ?? 'null'}</Text>
      <Text testID="share-token-card-network-name">
        {networkName ?? 'null'}
      </Text>
      <Text testID="share-token-card-network-badge">
        {typeof networkBadgeSource === 'object' &&
        networkBadgeSource !== null &&
        'uri' in networkBadgeSource
          ? networkBadgeSource.uri
          : 'null'}
      </Text>
    </View>
  );
});

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
      onClose,
    }: {
      children?: React.ReactNode;
      testID?: string;
      onClose?: () => void;
    }) =>
      ReactActual.createElement(
        View,
        { testID, onClose, accessibilityLabel: 'bottom-sheet' },
        children,
      ),
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

jest.mock('../../../../core/Multichain/utils', () => ({
  isNonEvmChainId: jest.fn(() => false),
}));

jest.mock('../../../../util/address', () => ({
  safeToChecksumAddress: jest.fn((address: string) => address),
}));

jest.mock('./ShareTokenCard', () => ({
  __esModule: true,
  default: (props: ShareTokenCardProps) => mockShareTokenCard(props),
}));

const mockSelectTokenMarketData = selectTokenMarketData as jest.MockedFunction<
  typeof selectTokenMarketData
>;
const mockSelectTokenDisplayData =
  selectTokenDisplayData as jest.MockedFunction<typeof selectTokenDisplayData>;

type TokenDisplayDataResult = ReturnType<typeof selectTokenDisplayData>;

const createMarketDataEntry = (
  overrides: Partial<MarketDataDetails> & Pick<MarketDataDetails, 'price'>,
): MarketDataDetails => overrides as MarketDataDetails;

const CHECKSUMMED_ADDRESS = '0x6b175474e89094c44da98b954eedeac495271d0f';
const CHAIN_ID_HEX = '0x1' as Hex;

const mockToken: TokenI = {
  address: CHECKSUMMED_ADDRESS,
  chainId: CHAIN_ID_HEX,
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

const defaultProps: ShareTokenBottomSheetProps = {
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

const renderSheet = (overrides: Partial<ShareTokenBottomSheetProps> = {}) =>
  render(<ShareTokenBottomSheet {...defaultProps} {...overrides} />);

describe('ShareTokenBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectTokenMarketData.mockReturnValue({});
    (isAssetFromSearch as jest.Mock).mockReturnValue(false);
    mockSelectTokenDisplayData.mockReturnValue(undefined);
    (getTokenExchangeRate as jest.Mock).mockResolvedValue(undefined);
    (isNonEvmChainId as jest.Mock).mockReturnValue(false);
    (safeToChecksumAddress as jest.Mock).mockImplementation(
      (address: string) => address,
    );
    (formatMarketDetails as jest.Mock).mockReturnValue({
      marketCap: '$126.57M',
      totalVolume: '$75.57M',
    });
    (NetworkBadgeSource as jest.Mock).mockReturnValue({ uri: 'network-badge' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('layout', () => {
    it('renders share token info title with large heading variant and no close button', () => {
      const { getByTestId, queryByTestId } = renderSheet();

      expect(getByTestId('share-token-sheet-title').props.children).toBe(
        strings('share_token.title'),
      );
      expect(
        getByTestId('share-token-sheet-title-variant').props.children,
      ).toBe('HeadingLg');
      expect(queryByTestId('share-token-close-button')).toBeNull();
    });

    it('renders the share URL and passes formatted card data', () => {
      const { getByTestId } = renderSheet();

      expect(getByTestId('share-token-url').props.children).toBe(
        defaultProps.shareUrl,
      );
      expect(getByTestId('share-token-card-price').props.children).toBe(
        '$1.00',
      );
      expect(getByTestId('share-token-card-change').props.children).toBe(-2.5);
    });

    it('renders the share token info action button label', () => {
      const { getByTestId } = renderSheet();

      expect(getByTestId('share-token-native-share-button')).toBeTruthy();
    });

    it('passes network badge and network name to ShareTokenCard', () => {
      renderSheet();

      expect(NetworkBadgeSource).toHaveBeenCalledWith(CHAIN_ID_HEX);
      expect(mockShareTokenCard).toHaveBeenCalledWith(
        expect.objectContaining({
          networkName: 'Ethereum Mainnet',
          networkBadgeSource: { uri: 'network-badge' },
        }),
      );
    });

    it('omits network badge when token chainId is missing', () => {
      renderSheet({
        token: { ...mockToken, chainId: undefined },
      });

      expect(NetworkBadgeSource).not.toHaveBeenCalled();
      expect(mockShareTokenCard).toHaveBeenCalledWith(
        expect.objectContaining({
          networkBadgeSource: undefined,
        }),
      );
    });
  });

  describe('price formatting', () => {
    it('renders em dash formatted price when currentPrice is zero', () => {
      const { getByTestId } = renderSheet({ currentPrice: 0 });

      expect(getByTestId('share-token-card-price').props.children).toBe('—');
    });

    it('renders em dash formatted price when currentPrice is not finite', () => {
      const { getByTestId } = renderSheet({ currentPrice: Number.NaN });

      expect(getByTestId('share-token-card-price').props.children).toBe('—');
    });

    it('formats sub-dollar prices with up to six decimal places', () => {
      const { getByTestId } = renderSheet({ currentPrice: 0.123456 });

      expect(getByTestId('share-token-card-price').props.children).toBe(
        '$0.123456',
      );
    });

    it('falls back to fixed decimal formatting when Intl throws', () => {
      const originalNumberFormat = Intl.NumberFormat;
      Intl.NumberFormat = jest.fn(() => {
        throw new Error('invalid currency');
      }) as unknown as typeof Intl.NumberFormat;

      const { getByTestId } = renderSheet({
        currentPrice: 1.23,
        currentCurrency: 'INVALID',
      });

      expect(getByTestId('share-token-card-price').props.children).toBe(
        '1.23 INVALID',
      );

      Intl.NumberFormat = originalNumberFormat;
    });
  });

  describe('price change percent', () => {
    it('prefers token.pricePercentChange1d over computed fallback', () => {
      renderSheet({
        token: { ...mockToken, pricePercentChange1d: 4.2 },
        priceDiff: 10,
        comparePrice: 100,
      });

      expect(mockShareTokenCard).toHaveBeenCalledWith(
        expect.objectContaining({ priceChangePercent: 4.2 }),
      );
    });

    it('computes priceChangePercent from priceDiff when token lacks API percent', () => {
      renderSheet({
        token: { ...mockToken, pricePercentChange1d: undefined },
        priceDiff: -0.02,
        comparePrice: 1.02,
      });

      expect(mockShareTokenCard).toHaveBeenCalledWith(
        expect.objectContaining({
          priceChangePercent: expect.closeTo(-1.96, 2),
        }),
      );
    });

    it('uses tokenMarketEntry pricePercentChange1d when token lacks API percent', () => {
      mockSelectTokenMarketData.mockReturnValue({
        [CHAIN_ID_HEX]: {
          [CHECKSUMMED_ADDRESS]: createMarketDataEntry({
            price: 1,
            pricePercentChange1d: 7.5,
            marketCap: 1_000_000,
            totalVolume: 500_000,
          }),
        },
      });

      renderSheet({
        token: { ...mockToken, pricePercentChange1d: undefined },
      });

      expect(mockShareTokenCard).toHaveBeenCalledWith(
        expect.objectContaining({ priceChangePercent: 7.5 }),
      );
    });

    it('returns zero priceChangePercent when comparePrice is zero and no API percent exists', () => {
      renderSheet({
        token: { ...mockToken, pricePercentChange1d: undefined },
        comparePrice: 0,
        priceDiff: 1,
      });

      expect(mockShareTokenCard).toHaveBeenCalledWith(
        expect.objectContaining({ priceChangePercent: 0 }),
      );
    });
  });

  describe('security and market stats', () => {
    it('passes holdersCount liquidity and volume24h derived from security data', () => {
      const { getByTestId } = renderSheet();

      expect(getByTestId('share-token-card-holders').props.children).toBe(
        '28.78K',
      );
      expect(getByTestId('share-token-card-liquidity').props.children).toBe(
        '$126.57M',
      );
      expect(getByTestId('share-token-card-volume').props.children).toBe(
        '$75.57M',
      );
    });

    it('formats holdersCount below one thousand as a plain integer string', () => {
      const { getByTestId } = renderSheet({
        securityData: {
          ...mockSecurityData,
          financialStats: {
            ...mockSecurityData.financialStats,
            holdersCount: 842,
          },
        },
      });

      expect(getByTestId('share-token-card-holders').props.children).toBe(
        '842',
      );
    });

    it('passes null holdersCount when security data is absent', () => {
      const { getByTestId } = renderSheet({ securityData: null });

      expect(getByTestId('share-token-card-holders').props.children).toBe(
        'null',
      );
    });

    it('passes null holdersCount when holders count is zero', () => {
      const { getByTestId } = renderSheet({
        securityData: {
          ...mockSecurityData,
          financialStats: {
            ...mockSecurityData.financialStats,
            holdersCount: 0,
          },
        },
      });

      expect(getByTestId('share-token-card-holders').props.children).toBe(
        'null',
      );
    });

    it('passes null liquidity when security markets are empty', () => {
      const { getByTestId } = renderSheet({
        securityData: {
          ...mockSecurityData,
          financialStats: {
            ...mockSecurityData.financialStats,
            markets: [],
          },
        },
      });

      expect(getByTestId('share-token-card-liquidity').props.children).toBe(
        'null',
      );
    });

    it('passes null liquidity when market reserves sum to zero', () => {
      const { getByTestId } = renderSheet({
        securityData: {
          ...mockSecurityData,
          financialStats: {
            ...mockSecurityData.financialStats,
            markets: [
              {
                marketType: 'dex',
                marketName: 'Uniswap',
                pairName: 'DAI/USDC',
                reserveUSD: 0,
              },
            ],
          },
        },
      });

      expect(getByTestId('share-token-card-liquidity').props.children).toBe(
        'null',
      );
    });

    it('passes null volume24h when trade volume is zero and market details lack volume', () => {
      (formatMarketDetails as jest.Mock).mockReturnValue({
        marketCap: '$126.57M',
        totalVolume: undefined,
      });

      const { getByTestId } = renderSheet({
        securityData: {
          ...mockSecurityData,
          financialStats: {
            ...mockSecurityData.financialStats,
            tradeVolume24h: 0,
          },
        },
      });

      expect(getByTestId('share-token-card-volume').props.children).toBe(
        'null',
      );
    });
  });

  describe('market data sources', () => {
    it('passes marketCap from redux token market data when available', () => {
      mockSelectTokenMarketData.mockReturnValue({
        [CHAIN_ID_HEX]: {
          [CHECKSUMMED_ADDRESS]: createMarketDataEntry({
            price: 1,
            marketCap: 5_000_000,
            totalVolume: 1_000_000,
          }),
        },
      });
      (formatMarketDetails as jest.Mock).mockReturnValue({
        marketCap: '$5.00M',
        totalVolume: '$1.00M',
      });

      const { getByTestId } = renderSheet();

      expect(getByTestId('share-token-card-market-cap').props.children).toBe(
        '$5.00M',
      );
    });

    it('uses search market data when token is from search discovery', () => {
      (isAssetFromSearch as jest.Mock).mockReturnValue(true);
      mockSelectTokenDisplayData.mockReturnValue({
        found: true,
        price: createMarketDataEntry({
          price: 2,
          pricePercentChange1d: 1.1,
          marketCap: 9_000_000,
          totalVolume: 800_000,
        }),
      } as TokenDisplayDataResult);
      (formatMarketDetails as jest.Mock).mockReturnValue({
        marketCap: '$9.00M',
        totalVolume: '$800.00K',
      });

      renderSheet({
        token: { ...mockToken, pricePercentChange1d: undefined },
      });

      expect(getTokenExchangeRate).not.toHaveBeenCalled();
      expect(mockShareTokenCard).toHaveBeenCalledWith(
        expect.objectContaining({
          priceChangePercent: 1.1,
          marketCap: '$9.00M',
        }),
      );
    });

    it('fetches exchange rate when redux and search market data are absent', async () => {
      (getTokenExchangeRate as jest.Mock).mockResolvedValue(
        createMarketDataEntry({
          price: 1,
          pricePercentChange1d: 2.2,
          marketCap: 3_000_000,
          totalVolume: 400_000,
        }),
      );
      (formatMarketDetails as jest.Mock).mockReturnValue({
        marketCap: '$3.00M',
        totalVolume: '$400.00K',
      });

      renderSheet({
        token: { ...mockToken, pricePercentChange1d: undefined },
      });

      await waitFor(() => {
        expect(getTokenExchangeRate).toHaveBeenCalledWith({
          chainId: CHAIN_ID_HEX,
          tokenAddress: CHECKSUMMED_ADDRESS,
          currency: 'usd',
          includeMarketData: true,
        });
      });

      await waitFor(() => {
        expect(mockShareTokenCard).toHaveBeenCalledWith(
          expect.objectContaining({
            priceChangePercent: 2.2,
            marketCap: '$3.00M',
          }),
        );
      });
    });

    it('does not fetch exchange rate when redux market entry already has price', () => {
      mockSelectTokenMarketData.mockReturnValue({
        [CHAIN_ID_HEX]: {
          [CHECKSUMMED_ADDRESS]: createMarketDataEntry({ price: 1.5 }),
        },
      });

      renderSheet();

      expect(getTokenExchangeRate).not.toHaveBeenCalled();
    });

    it('ignores exchange rate fetch errors without crashing', async () => {
      (getTokenExchangeRate as jest.Mock).mockRejectedValue(
        new Error('network error'),
      );

      const { getByTestId } = renderSheet();

      await waitFor(() => {
        expect(getTokenExchangeRate).toHaveBeenCalled();
      });

      expect(getByTestId('share-token-sheet')).toBeTruthy();
    });

    it('does not update market data when exchange rate fetch resolves empty', async () => {
      (getTokenExchangeRate as jest.Mock).mockResolvedValue(undefined);

      renderSheet({
        token: { ...mockToken, pricePercentChange1d: undefined },
      });

      await waitFor(() => {
        expect(getTokenExchangeRate).toHaveBeenCalled();
      });

      expect(mockShareTokenCard).toHaveBeenCalledWith(
        expect.objectContaining({ marketCap: null }),
      );
    });

    it('does not fetch exchange rate when checksum address is unavailable', () => {
      (safeToChecksumAddress as jest.Mock).mockReturnValue('');

      renderSheet();

      expect(getTokenExchangeRate).not.toHaveBeenCalled();
    });
  });

  describe('non-EVM tokens', () => {
    it('uses raw token address without checksum for non-EVM chains', async () => {
      (isNonEvmChainId as jest.Mock).mockReturnValue(true);
      (safeToChecksumAddress as jest.Mock).mockReturnValue(
        'should-not-be-used',
      );

      renderSheet({
        token: {
          ...mockToken,
          chainId: 'solana:mainnet',
          address: 'So11111111111111111111111111111111111111112',
        },
      });

      await waitFor(() => {
        expect(getTokenExchangeRate).toHaveBeenCalledWith(
          expect.objectContaining({
            tokenAddress: 'So11111111111111111111111111111111111111112',
          }),
        );
      });

      expect(safeToChecksumAddress).not.toHaveBeenCalled();
    });
  });

  describe('native share', () => {
    it('invokes Share.share with url on iOS when share button is pressed', async () => {
      jest.spyOn(Share, 'share').mockResolvedValue({
        action: Share.dismissedAction,
      });
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        configurable: true,
      });

      const { getByTestId } = renderSheet();

      await act(async () => {
        fireEvent.press(getByTestId('share-token-native-share-button'));
      });

      expect(Share.share).toHaveBeenCalledWith({
        url: defaultProps.shareUrl,
      });
    });

    it('invokes Share.share with message on Android when share button is pressed', async () => {
      jest.spyOn(Share, 'share').mockResolvedValue({
        action: Share.dismissedAction,
      });
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        configurable: true,
      });

      const { getByTestId } = renderSheet();

      await act(async () => {
        fireEvent.press(getByTestId('share-token-native-share-button'));
      });

      expect(Share.share).toHaveBeenCalledWith({
        message: defaultProps.shareUrl,
      });

      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        configurable: true,
      });
    });
  });
});
