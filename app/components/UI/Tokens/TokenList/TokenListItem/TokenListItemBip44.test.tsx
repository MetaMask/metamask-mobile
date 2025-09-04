import React from 'react';
import { useSelector } from 'react-redux';
import { TokenListItemBip44 } from './TokenListItemBip44';
import { FlashListAssetKey } from '..';
import { useTokenPricePercentageChange } from '../../hooks/useTokenPricePercentageChange';
import { isTestNet } from '../../../../../util/networks';
import { formatWithThreshold } from '../../../../../util/assets';
import { TokenI } from '../../types';
import { SECONDARY_BALANCE_TEST_ID } from '../../../AssetElement/index.constants';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({ colors: {} }),
}));

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      build: jest.fn(),
      addProperties: jest.fn(() => ({ build: jest.fn() })),
    })),
  }),
}));

jest.mock('../../hooks/useTokenPricePercentageChange', () => ({
  useTokenPricePercentageChange: jest.fn(),
}));

jest.mock('../../../Earn/hooks/useEarnTokens', () => ({
  __esModule: true,
  default: () => ({ getEarnToken: jest.fn() }),
}));

jest.mock('../../../Stake/hooks/useStakingChain', () => ({
  useStakingChainByChainId: () => ({ isStakingSupportedChain: false }),
}));

jest.mock('../../../Earn/selectors/featureFlags', () => ({
  selectPooledStakingEnabledFlag: () => false,
  selectStablecoinLendingEnabledFlag: () => false,
}));

jest.mock('../../util/deriveBalanceFromAssetMarketDetails', () => ({
  deriveBalanceFromAssetMarketDetails: jest.fn(() => ({
    balanceFiat: '$100.00',
    balanceValueFormatted: '1.23 ETH',
  })),
}));

jest.mock('../../../../../util/assets', () => ({
  formatWithThreshold: jest.fn((value) => `${value} TEST`),
}));

jest.mock('../../../../../util/networks', () => ({
  getDefaultNetworkByChainId: jest.fn(),
  getTestNetImageByChainId: jest.fn(() => 'testnet.png'),
  isTestNet: jest.fn(),
}));

jest.mock('../../../../../util/networks/customNetworks', () => ({
  CustomNetworkImgMapping: {},
  PopularList: [],
  UnpopularNetworkList: [],
  getNonEvmNetworkImageSourceByChainId: jest.fn(),
}));

jest.mock('../../../../../constants/network', () => ({
  NETWORKS_CHAIN_ID: {
    MAINNET: '0x1',
    OPTIMISM: '0xa',
    BSC: '0x38',
    POLYGON: '0x89',
    FANTOM: '0xfa',
    BASE: '0x2105',
    ARBITRUM: '0xa4b1',
    AVAXCCHAIN: '0xa86a',
    CELO: '0xa4ec',
    HARMONY: '0x63564c40',
    SEPOLIA: '0xaa36a7',
    LINEA_GOERLI: '0xe704',
    LINEA_SEPOLIA: '0xe705',
    GOERLI: '0x5',
    LINEA_MAINNET: '0xe708',
    ZKSYNC_ERA: '0x144',
    LOCALHOST: '0x539',
    ARBITRUM_GOERLI: '0x66eed',
    OPTIMISM_GOERLI: '0x1a4',
    MUMBAI: '0x13881',
    OPBNB: '0xcc',
    SCROLL: '0x82750',
    BERACHAIN: '0x138d6',
    METACHAIN_ONE: '0x1b6a6',
    MEGAETH_TESTNET: '0x18c6',
    SEI: '0x531',
    MONAD_TESTNET: '0x279f',
  },
  NETWORK_CHAIN_ID: {
    FLARE_MAINNET: '0x13',
    SONGBIRD_TESTNET: '0x14',
    APECHAIN_TESTNET: '0x15',
    APECHAIN_MAINNET: '0x16',
  },
}));

jest.mock('../../../../../constants/popular-networks', () => ({
  POPULAR_NETWORK_CHAIN_IDS: new Set(['0x1', '0xe708']),
}));

jest.mock('./CustomNetworkNativeImgMapping', () => ({
  CustomNetworkNativeImgMapping: {
    '0x89': { uri: 'polygon-native.png' },
  },
}));

// Mock useSelector to return controlled data
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

describe('TokenListItem - Component Rendering Tests for Coverage', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseTokenPricePercentageChange =
    useTokenPricePercentageChange as jest.MockedFunction<
      typeof useTokenPricePercentageChange
    >;
  const mockIsTestNet = isTestNet as jest.MockedFunction<typeof isTestNet>;
  const mockFormatWithThreshold = formatWithThreshold as jest.MockedFunction<
    typeof formatWithThreshold
  >;

  const defaultAsset = {
    decimals: 18,
    address: '0x456',
    chainId: '0x1',
    symbol: 'TEST',
    name: 'Test Token',
    balance: '1.23',
    balanceFiat: '$123.00',
    isNative: false,
    isETH: false,
    image: 'https://example.com/image.png',
    logo: 'https://example.com/logo.png',
    aggregators: [],
  };

  function prepareMocks({
    asset,
    pricePercentChange1d = 5.67,
  }: { asset?: TokenI; pricePercentChange1d?: number } = {}) {
    jest.clearAllMocks();

    // Default mock setup
    mockUseSelector.mockImplementation(
      (selector: (state: unknown) => unknown) => {
        if (selector.toString().includes('selectAsset')) {
          return asset;
        }

        if (selector.toString().includes('selectShowFiatInTestnets')) {
          return false;
        }

        return {};
      },
    );

    mockUseTokenPricePercentageChange.mockReturnValue(pricePercentChange1d);
    mockIsTestNet.mockReturnValue(false);
    mockFormatWithThreshold.mockImplementation((value) => `${value} FORMATTED`);
  }

  describe('Render asset information', () => {
    it('renders asset name, balance, fiat amount and percentage change', () => {
      prepareMocks({
        asset: defaultAsset,
      });

      const assetKey: FlashListAssetKey = {
        address: '0x456',
        chainId: '0x1',
        isStaked: false,
      };

      const { getByText } = renderWithProvider(
        <TokenListItemBip44
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          privacyMode={false}
        />,
      );

      expect(getByText('Test Token')).toBeDefined();
      expect(getByText('$123.00')).toBeDefined();
      expect(getByText('1.23 TEST')).toBeDefined();
      expect(getByText('+5.67%')).toBeDefined();
    });
  });

  describe('Percentage Logic', () => {
    it('covers Number.isFinite check for valid finite number', () => {
      prepareMocks({
        asset: defaultAsset,
      });

      const assetKey: FlashListAssetKey = {
        address: '0x456',
        chainId: '0x1',
        isStaked: false,
      };

      const { getByTestId } = renderWithProvider(
        <TokenListItemBip44
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          privacyMode={false}
        />,
      );

      const percentageText = getByTestId(SECONDARY_BALANCE_TEST_ID);

      expect(percentageText.props.children).toBe('+5.67%');
      expect(percentageText.props.style.color).toBe('#457a39');
    });

    it('covers Number.isFinite check preventing Infinity', () => {
      prepareMocks({
        asset: defaultAsset,
        pricePercentChange1d: Infinity,
      });

      const assetKey: FlashListAssetKey = {
        address: '0x456',
        chainId: '0x1',
        isStaked: false,
      };

      const { queryByTestId } = renderWithProvider(
        <TokenListItemBip44
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          privacyMode={false}
        />,
      );

      expect(queryByTestId(SECONDARY_BALANCE_TEST_ID)).not.toBeOnTheScreen();
    });

    it('covers Number.isFinite check preventing NaN', () => {
      prepareMocks({
        asset: defaultAsset,
        pricePercentChange1d: NaN,
      });

      const assetKey: FlashListAssetKey = {
        address: '0x456',
        chainId: '0x1',
        isStaked: false,
      };

      const { queryByTestId } = renderWithProvider(
        <TokenListItemBip44
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          privacyMode={false}
        />,
      );

      expect(queryByTestId(SECONDARY_BALANCE_TEST_ID)).not.toBeOnTheScreen();
    });

    it('covers Number.isFinite check preventing negative Infinity', () => {
      prepareMocks({
        asset: defaultAsset,
        pricePercentChange1d: -Infinity,
      });

      const assetKey: FlashListAssetKey = {
        address: '0x456',
        chainId: '0x1',
        isStaked: false,
      };

      const { queryByTestId } = renderWithProvider(
        <TokenListItemBip44
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          privacyMode={false}
        />,
      );

      expect(queryByTestId(SECONDARY_BALANCE_TEST_ID)).not.toBeOnTheScreen();
    });
  });
});
