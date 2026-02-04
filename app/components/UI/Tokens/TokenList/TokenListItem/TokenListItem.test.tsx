import { BtcAccountType } from '@metamask/keyring-api';
import React from 'react';
import { useSelector } from 'react-redux';
import { ACCOUNT_TYPE_LABEL_TEST_ID, TokenListItem } from './TokenListItem';
import { FlashListAssetKey } from '../TokenList';
import { useTokenPricePercentageChange } from '../../hooks/useTokenPricePercentageChange';
import { isTestNet } from '../../../../../util/networks';
import { formatWithThreshold } from '../../../../../util/assets';
import { TokenI } from '../../types';
import {
  SECONDARY_BALANCE_BUTTON_TEST_ID,
  SECONDARY_BALANCE_TEST_ID,
} from '../../../AssetElement/index.constants';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { toHex } from '@metamask/controller-utils';
import { strings } from '../../../../../../locales/i18n';

import { useMusdConversionTokens } from '../../../Earn/hooks/useMusdConversionTokens';
import { useMusdConversionEligibility } from '../../../Earn/hooks/useMusdConversionEligibility';
import {
  selectIsMusdConversionFlowEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../../Earn/selectors/featureFlags';
import { MUSD_CONVERSION_APY } from '../../../Earn/constants/musd';
import { EARN_EXPERIENCES } from '../../../Earn/constants/experiences';

jest.mock('../../../Stake/components/StakeButton', () => ({
  __esModule: true,
  StakeButton: () => null,
  default: () => null,
}));

// Mock useRWAToken hook
const mockIsStockToken = jest.fn();
const mockIsTokenTradingOpen = jest.fn();
jest.mock('../../../Bridge/hooks/useRWAToken', () => ({
  useRWAToken: () => ({
    isStockToken: mockIsStockToken,
    isTokenTradingOpen: mockIsTokenTradingOpen,
  }),
}));

// Mock StockBadge component to simplify testing
jest.mock('../../../shared/StockBadge', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ token }: { token: unknown }) => (
      <Text testID="stock-badge">{`Stock Badge: ${(token as { symbol?: string })?.symbol}`}</Text>
    ),
  };
});

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

const FIXED_NOW_MS = 1730000000000;
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn();

jest.mock('../../../../hooks/useMetrics', () => {
  const actual = jest.requireActual('../../../../hooks/useMetrics');

  return {
    ...actual,
    useMetrics: () => ({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    }),
  };
});

jest.mock('../../hooks/useTokenPricePercentageChange', () => ({
  useTokenPricePercentageChange: jest.fn(),
}));

interface MockEarnToken {
  balanceFiatNumber?: number;
  experience?: {
    type?: EARN_EXPERIENCES;
  };
}

const mockGetEarnToken: jest.MockedFunction<
  (token: TokenI) => MockEarnToken | undefined
> = jest.fn();

jest.mock('../../../Earn/hooks/useEarnTokens', () => ({
  __esModule: true,
  default: () => ({ getEarnToken: mockGetEarnToken }),
}));

const mockHandleStablecoinLendingRedirect = jest.fn();
jest.mock('../../../Earn/hooks/useStablecoinLendingRedirect', () => ({
  useStablecoinLendingRedirect: () => mockHandleStablecoinLendingRedirect,
}));

const mockInitiateConversion = jest.fn();
let mockHasSeenConversionEducationScreen = true;
jest.mock('../../../Earn/hooks/useMusdConversion', () => ({
  useMusdConversion: () => ({
    initiateConversion: mockInitiateConversion,
    error: null,
    hasSeenConversionEducationScreen: mockHasSeenConversionEducationScreen,
  }),
}));

jest.mock('../../../Earn/hooks/useMusdConversionTokens', () => ({
  useMusdConversionTokens: jest.fn(() => ({
    isConversionToken: jest.fn().mockReturnValue(false),
    isTokenWithCta: jest.fn().mockReturnValue(false),
    filterAllowedTokens: jest.fn(),
    tokens: [],
    tokensWithCTAs: [],
  })),
}));

const mockUseMusdConversionTokens =
  useMusdConversionTokens as jest.MockedFunction<
    typeof useMusdConversionTokens
  >;

const mockShouldShowTokenListItemCta = jest.fn();
jest.mock('../../../Earn/hooks/useMusdCtaVisibility', () => ({
  useMusdCtaVisibility: () => ({
    shouldShowTokenListItemCta: mockShouldShowTokenListItemCta,
  }),
}));

jest.mock('../../../Earn/hooks/useMusdConversionEligibility', () => ({
  useMusdConversionEligibility: jest.fn(() => ({
    isEligible: true,
    isLoading: false,
    geolocation: 'US',
    blockedCountries: [],
  })),
}));

const mockUseMusdConversionEligibility =
  useMusdConversionEligibility as jest.MockedFunction<
    typeof useMusdConversionEligibility
  >;

jest.mock('../../../../Views/confirmations/hooks/useNetworkName', () => ({
  useNetworkName: () => 'Ethereum Mainnet',
}));

jest.mock('../../../../../selectors/earnController/earn', () => ({
  earnSelectors: {
    selectPrimaryEarnExperienceTypeForAsset: jest.fn(() => 'pooled-staking'),
  },
}));

jest.mock('../../../Stake/hooks/useStakingChain', () => ({
  __esModule: true,
  default: () => ({ isStakingSupportedChain: false }),
  useStakingChainByChainId: () => ({ isStakingSupportedChain: false }),
}));

jest.mock('../../../Earn/selectors/featureFlags', () => ({
  selectPooledStakingEnabledFlag: jest.fn(() => true),
  selectStablecoinLendingEnabledFlag: jest.fn(() => false),
  selectIsMusdConversionFlowEnabledFlag: jest.fn(() => false),
  selectMusdConversionPaymentTokensAllowlist: jest.fn(() => ({})),
}));

const mockSelectIsMusdConversionFlowEnabledFlag =
  selectIsMusdConversionFlowEnabledFlag as jest.MockedFunction<
    typeof selectIsMusdConversionFlowEnabledFlag
  >;

const mockSelectStablecoinLendingEnabledFlag =
  selectStablecoinLendingEnabledFlag as jest.MockedFunction<
    typeof selectStablecoinLendingEnabledFlag
  >;

jest.mock('../../util/deriveBalanceFromAssetMarketDetails', () => ({
  deriveBalanceFromAssetMarketDetails: jest.fn(() => ({
    balanceFiat: '$100.00',
    balanceValueFormatted: '1.23 ETH',
  })),
}));

jest.mock('../../../../../util/assets', () => ({
  formatWithThreshold: jest.fn((value) => `${value} TEST`),
}));

jest.mock('../../../../../util/networks', () => {
  const actual = jest.requireActual('../../../../../util/networks');

  return {
    ...actual,
    getDefaultNetworkByChainId: jest.fn(),
    getTestNetImageByChainId: jest.fn(() => 'testnet.png'),
    isTestNet: jest.fn(),
  };
});

jest.mock('../../../../../util/networks/customNetworks', () => {
  const actual = jest.requireActual(
    '../../../../../util/networks/customNetworks',
  );

  return {
    ...actual,
    CustomNetworkImgMapping: {},
    PopularList: [],
    UnpopularNetworkList: [],
    getNonEvmNetworkImageSourceByChainId: jest.fn(),
  };
});

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
    MEGAETH_TESTNET_V2: '0x18c7',
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

  afterEach(() => {
    mockHasSeenConversionEducationScreen = true;
  });

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

  interface PrepareMocksOptions {
    asset?: TokenI;
    pricePercentChange1d?: number;
    isMusdConversionEnabled?: boolean;
    isTokenWithCta?: boolean;
    isGeoEligible?: boolean;
    isStockToken?: boolean;
    isStablecoinLendingEnabled?: boolean;
    earnToken?: MockEarnToken;
  }

  function prepareMocks({
    asset,
    pricePercentChange1d = 5.67,
    isMusdConversionEnabled = false,
    isTokenWithCta = false,
    isGeoEligible = true,
    isStockToken = false,
    isStablecoinLendingEnabled = false,
    earnToken,
  }: PrepareMocksOptions = {}) {
    jest.clearAllMocks();

    mockGetEarnToken.mockReturnValue(earnToken);
    mockSelectStablecoinLendingEnabledFlag.mockReturnValue(
      isStablecoinLendingEnabled,
    );

    // Stock token mocks
    mockIsStockToken.mockReturnValue(isStockToken);
    mockIsTokenTradingOpen.mockResolvedValue(true);
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW_MS);
    mockBuild.mockReturnValue({ name: 'mock-built-event' });
    mockAddProperties.mockImplementation(() => ({ build: mockBuild }));
    mockCreateEventBuilder.mockImplementation(() => ({
      addProperties: mockAddProperties,
    }));

    mockShouldShowTokenListItemCta.mockReturnValue(
      isMusdConversionEnabled && isTokenWithCta && isGeoEligible,
    );

    // mUSD conversion mocks
    mockSelectIsMusdConversionFlowEnabledFlag.mockReturnValue(
      isMusdConversionEnabled,
    );
    mockUseMusdConversionTokens.mockReturnValue({
      isConversionToken: jest.fn().mockReturnValue(false),
      hasConvertibleTokensByChainId: jest.fn().mockReturnValue(false),
      filterAllowedTokens: jest.fn(),
      isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
      tokens: [],
    });
    mockUseMusdConversionEligibility.mockReturnValue({
      isEligible: isGeoEligible,
      isLoading: false,
      geolocation: isGeoEligible ? 'US' : 'GB',
      blockedCountries: isGeoEligible ? [] : ['GB'],
    });

    // Default mock setup
    mockUseSelector.mockImplementation(
      (selector: (state: unknown) => unknown) => {
        if (!selector || typeof selector !== 'function') {
          return {};
        }

        if (selector === selectIsMusdConversionFlowEnabledFlag) {
          return isMusdConversionEnabled;
        }

        if (selector === selectStablecoinLendingEnabledFlag) {
          return isStablecoinLendingEnabled;
        }

        const selectorString = selector.toString();

        // TokenListItem selectors
        if (selectorString.includes('selectAsset')) {
          return asset;
        }

        if (selectorString.includes('selectShowFiatInTestnets')) {
          return false;
        }

        // StakeButton selectors
        if (selectorString.includes('selectIsStakeableToken')) {
          return true; // Enable to show Earn button
        }

        if (selectorString.includes('state.browser.tabs')) {
          return [];
        }

        if (selectorString.includes('selectEvmChainId')) {
          return '0x1';
        }

        if (selectorString.includes('selectNetworkConfigurationByChainId')) {
          return { name: 'Ethereum Mainnet' };
        }

        if (
          selectorString.includes('selectPrimaryEarnExperienceTypeForAsset')
        ) {
          return 'pooled-staking';
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
        <TokenListItem
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
          privacyMode={false}
        />,
      );

      expect(getByText('Test Token')).toBeOnTheScreen();
      expect(getByText('$123.00')).toBeOnTheScreen();
      expect(getByText('1.23 TEST')).toBeOnTheScreen();
      expect(getByText('+5.67%')).toBeOnTheScreen();
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
        <TokenListItem
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
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
        <TokenListItem
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
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
        <TokenListItem
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
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
        <TokenListItem
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
          privacyMode={false}
        />,
      );

      expect(queryByTestId(SECONDARY_BALANCE_TEST_ID)).not.toBeOnTheScreen();
    });
  });

  describe('Account Type Label', () => {
    it('renders the correct account type label', () => {
      prepareMocks({
        asset: { ...defaultAsset, accountType: BtcAccountType.P2wpkh },
      });

      const assetKey: FlashListAssetKey = {
        address: '0x456',
        chainId: '0x1',
        isStaked: false,
      };

      const { queryByTestId } = renderWithProvider(
        <TokenListItem
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
          privacyMode={false}
        />,
      );

      expect(queryByTestId(ACCOUNT_TYPE_LABEL_TEST_ID)).toBeOnTheScreen();
      expect(queryByTestId(ACCOUNT_TYPE_LABEL_TEST_ID)).toHaveTextContent(
        'Native SegWit',
      );
    });
  });

  describe('mUSD Conversion', () => {
    const usdcAsset = {
      ...defaultAsset,
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      balance: '100',
      balanceFiat: '$100.00',
    };

    const assetKey: FlashListAssetKey = {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      chainId: '0x1',
      isStaked: false,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('displays "Get 3% mUSD bonus" CTA when asset is convertible stablecoin with positive balance', () => {
      prepareMocks({
        asset: usdcAsset,
        isMusdConversionEnabled: true,
        isTokenWithCta: true,
      });

      const { getByText } = renderWithProvider(
        <TokenListItem
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
          privacyMode={false}
        />,
      );

      expect(getByText('Get 3% mUSD bonus')).toBeOnTheScreen();
    });

    it('displays percentage change when mUSD conversion flag is disabled', () => {
      prepareMocks({
        asset: usdcAsset,
        pricePercentChange1d: 2.5,
        isMusdConversionEnabled: false,
        isTokenWithCta: true,
      });

      const { getByText, queryByText } = renderWithProvider(
        <TokenListItem
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
          privacyMode={false}
        />,
      );

      expect(getByText('+2.50%')).toBeOnTheScreen();
      expect(queryByText('Get 3% mUSD bonus')).toBeNull();
    });

    it('displays percentage change when asset is not a convertible stablecoin', () => {
      prepareMocks({
        asset: defaultAsset,
        pricePercentChange1d: 3.2,
        isMusdConversionEnabled: true,
        isTokenWithCta: false,
      });

      const defaultAssetKey: FlashListAssetKey = {
        address: '0x456',
        chainId: '0x1',
        isStaked: false,
      };

      const { getByText, queryByText } = renderWithProvider(
        <TokenListItem
          assetKey={defaultAssetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
          privacyMode={false}
        />,
      );

      expect(getByText('+3.20%')).toBeOnTheScreen();
      expect(queryByText('Get 3% mUSD bonus')).toBeNull();
    });

    it('hides mUSD conversion CTA when user is geo-blocked', () => {
      prepareMocks({
        asset: usdcAsset,
        pricePercentChange1d: 1.5,
        isMusdConversionEnabled: true,
        isTokenWithCta: true,
        isGeoEligible: false,
      });

      const { getByText, queryByText } = renderWithProvider(
        <TokenListItem
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
          privacyMode={false}
        />,
      );

      expect(getByText('+1.50%')).toBeOnTheScreen();
      expect(queryByText('Convert to mUSD')).toBeNull();
    });

    it('calls initiateConversion with correct parameters when secondary balance is pressed', async () => {
      prepareMocks({
        asset: usdcAsset,
        isMusdConversionEnabled: true,
        isTokenWithCta: true,
      });

      const { getByTestId } = renderWithProvider(
        <TokenListItem
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
          privacyMode={false}
        />,
      );

      await act(async () => {
        fireEvent.press(getByTestId(SECONDARY_BALANCE_BUTTON_TEST_ID));
      });

      await waitFor(() => {
        expect(mockInitiateConversion).toHaveBeenCalledWith({
          preferredPaymentToken: {
            address: toHex('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'),
            chainId: toHex('0x1'),
          },
          navigationStack: Routes.EARN.ROOT,
        });
      });
    });

    it('tracks mUSD conversion CTA clicked event when pressed and education screen has not been seen', async () => {
      // Arrange
      mockHasSeenConversionEducationScreen = false;
      prepareMocks({
        asset: usdcAsset,
        isMusdConversionEnabled: true,
        isTokenWithCta: true,
      });

      const convertAssetKey: FlashListAssetKey = {
        address: usdcAsset.address,
        chainId: usdcAsset.chainId,
        isStaked: false,
      };

      const { getByTestId } = renderWithProvider(
        <TokenListItem
          assetKey={convertAssetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
          privacyMode={false}
        />,
      );

      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();
      mockBuild.mockClear();

      // Act
      await act(async () => {
        fireEvent.press(getByTestId(SECONDARY_BALANCE_BUTTON_TEST_ID));
      });

      // Assert
      expect(mockCreateEventBuilder).toHaveBeenCalledTimes(1);
      const { MetaMetricsEvents } = jest.requireActual(
        '../../../../hooks/useMetrics',
      );
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MUSD_CONVERSION_CTA_CLICKED,
      );

      expect(mockAddProperties).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledWith({
        location: 'token_list_item',
        redirects_to: 'conversion_education_screen',
        cta_type: 'musd_conversion_secondary_cta',
        cta_text: strings('earn.musd_conversion.get_a_percentage_musd_bonus', {
          percentage: MUSD_CONVERSION_APY,
        }),
        network_chain_id: usdcAsset.chainId,
        network_name: 'Ethereum Mainnet',
        asset_symbol: usdcAsset.symbol,
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'mock-built-event' });
    });

    it('tracks mUSD conversion CTA clicked event pressed and education screen has been seen', async () => {
      // Arrange
      mockHasSeenConversionEducationScreen = true;
      prepareMocks({
        asset: usdcAsset,
        isMusdConversionEnabled: true,
        isTokenWithCta: true,
      });

      const convertAssetKey: FlashListAssetKey = {
        address: usdcAsset.address,
        chainId: usdcAsset.chainId,
        isStaked: false,
      };

      const { getByTestId } = renderWithProvider(
        <TokenListItem
          assetKey={convertAssetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
          privacyMode={false}
        />,
      );

      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();
      mockBuild.mockClear();

      // Act
      await act(async () => {
        fireEvent.press(getByTestId(SECONDARY_BALANCE_BUTTON_TEST_ID));
      });

      // Assert
      expect(mockCreateEventBuilder).toHaveBeenCalledTimes(1);
      const { MetaMetricsEvents } = jest.requireActual(
        '../../../../hooks/useMetrics',
      );
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MUSD_CONVERSION_CTA_CLICKED,
      );

      expect(mockAddProperties).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledWith({
        location: 'token_list_item',
        redirects_to: 'custom_amount_screen',
        cta_type: 'musd_conversion_secondary_cta',
        cta_text: strings('earn.musd_conversion.get_a_percentage_musd_bonus', {
          percentage: MUSD_CONVERSION_APY,
        }),
        network_chain_id: usdcAsset.chainId,
        network_name: 'Ethereum Mainnet',
        asset_symbol: usdcAsset.symbol,
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'mock-built-event' });
    });
  });

  describe('Stock Badge', () => {
    const stockAsset = {
      ...defaultAsset,
      symbol: 'AAPL',
      name: 'Apple Inc.',
      rwaData: {
        instrumentType: 'stock',
        market: { nextOpen: '2024-01-01', nextClose: '2024-01-02' },
      },
    };

    const assetKey: FlashListAssetKey = {
      address: '0x456',
      chainId: '0x1',
      isStaked: false,
    };

    it('renders StockBadge when asset is a stock token', () => {
      prepareMocks({
        asset: stockAsset,
        isStockToken: true,
      });

      const { getByTestId } = renderWithProvider(
        <TokenListItem
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
          privacyMode={false}
        />,
      );

      expect(getByTestId('stock-badge')).toBeOnTheScreen();
      expect(mockIsStockToken).toHaveBeenCalled();
    });

    it('does NOT render StockBadge when asset is NOT a stock token', () => {
      prepareMocks({
        asset: defaultAsset,
        isStockToken: false,
      });

      const { queryByTestId } = renderWithProvider(
        <TokenListItem
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
          privacyMode={false}
        />,
      );

      expect(queryByTestId('stock-badge')).toBeNull();
      expect(mockIsStockToken).toHaveBeenCalled();
    });

    it('passes the asset to isStockToken function', () => {
      prepareMocks({
        asset: stockAsset,
        isStockToken: true,
      });

      renderWithProvider(
        <TokenListItem
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
          privacyMode={false}
        />,
      );

      expect(mockIsStockToken).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'AAPL',
          name: 'Apple Inc.',
        }),
      );
    });

    it('renders StockBadge with correct token prop', () => {
      prepareMocks({
        asset: stockAsset,
        isStockToken: true,
      });

      const { getByText } = renderWithProvider(
        <TokenListItem
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
          privacyMode={false}
        />,
      );

      expect(getByText('Stock Badge: AAPL')).toBeOnTheScreen();
    });

    it('renders StockBadge alongside other token information', () => {
      prepareMocks({
        asset: stockAsset,
        isStockToken: true,
      });

      const { getByTestId, getByText } = renderWithProvider(
        <TokenListItem
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
          privacyMode={false}
        />,
      );

      expect(getByText('Apple Inc.')).toBeOnTheScreen();
      expect(getByText('1.23 AAPL')).toBeOnTheScreen();
      expect(getByTestId('stock-badge')).toBeOnTheScreen();
    });

    it('renders StockBadge with percentage change when both conditions are met', () => {
      prepareMocks({
        asset: stockAsset,
        isStockToken: true,
        pricePercentChange1d: 2.5,
      });

      const { getByTestId, getByText } = renderWithProvider(
        <TokenListItem
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
          privacyMode={false}
        />,
      );

      expect(getByTestId('stock-badge')).toBeOnTheScreen();
      expect(getByText('+2.50%')).toBeOnTheScreen();
    });

    it('does NOT render StockBadge when RWA feature flag is disabled (isStockToken returns false)', () => {
      prepareMocks({
        asset: {
          ...stockAsset,
          rwaData: {
            instrumentType: 'stock',
            market: { nextOpen: '2024-01-01', nextClose: '2024-01-02' },
          },
        },
        isStockToken: false, // RWA disabled, so isStockToken returns false
      });

      const { queryByTestId } = renderWithProvider(
        <TokenListItem
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
          privacyMode={false}
        />,
      );

      expect(queryByTestId('stock-badge')).toBeNull();
    });
  });

  describe('Stablecoin lending Earn CTA threshold', () => {
    const assetKey: FlashListAssetKey = {
      address: '0x456',
      chainId: '0x1',
      isStaked: false,
    };

    it('renders percentage change when stablecoin lending Earn CTA balance is below minimum', () => {
      // Arrange
      prepareMocks({
        asset: { ...defaultAsset, balance: '0.009' },
        pricePercentChange1d: 1.23,
        isStablecoinLendingEnabled: true,
        earnToken: {
          balanceFiatNumber: 0.009,
          experience: { type: EARN_EXPERIENCES.STABLECOIN_LENDING },
        },
      });

      // Act
      const { getByText, queryByText } = renderWithProvider(
        <TokenListItem
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
          privacyMode={false}
        />,
      );

      // Assert
      expect(getByText('+1.23%')).toBeOnTheScreen();
      expect(queryByText(strings('stake.earn'))).toBeNull();
    });

    it('renders Earn CTA when stablecoin lending is enabled and balance meets minimum', () => {
      // Arrange
      prepareMocks({
        asset: { ...defaultAsset, balance: '0.01' },
        pricePercentChange1d: 1.23,
        isStablecoinLendingEnabled: true,
        earnToken: {
          balanceFiatNumber: 0.01,
          experience: { type: EARN_EXPERIENCES.STABLECOIN_LENDING },
        },
      });

      // Act
      const { getByText, queryByText } = renderWithProvider(
        <TokenListItem
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          shouldShowTokenListItemCta={mockShouldShowTokenListItemCta}
          privacyMode={false}
        />,
      );

      // Assert
      expect(getByText(strings('stake.earn'))).toBeOnTheScreen();
      expect(queryByText('+1.23%')).toBeNull();
    });
  });
});
