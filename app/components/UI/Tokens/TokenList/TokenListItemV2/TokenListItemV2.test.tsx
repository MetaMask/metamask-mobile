import { BtcAccountType } from '@metamask/keyring-api';
import React from 'react';
import { useSelector } from 'react-redux';
import { ACCOUNT_TYPE_LABEL_TEST_ID, TokenListItemV2 } from './TokenListItemV2';
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
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { selectMultichainAssetsRates } from '../../../../../selectors/multichain/multichain';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';

import { useMusdConversionTokens } from '../../../Earn/hooks/useMusdConversionTokens';
import { useMusdConversionEligibility } from '../../../Earn/hooks/useMusdConversionEligibility';
import {
  selectIsMusdConversionFlowEnabledFlag,
  selectMerklCampaignClaimingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../../Earn/selectors/featureFlags';
import { isEligibleForMerklRewards } from '../../../Earn/components/MerklRewards/hooks/useMerklRewards';
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

const mockGetEarnToken = jest.fn();

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

const mockshouldShowTokenListItemCta = jest.fn();
jest.mock('../../../Earn/hooks/useMusdCtaVisibility', () => ({
  useMusdCtaVisibility: () => ({
    shouldShowTokenListItemCta: mockshouldShowTokenListItemCta,
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

const mockClaimRewards = jest.fn();
const mockUseMerklClaim = jest.fn((_asset?: unknown) => ({
  claimRewards: mockClaimRewards,
  isClaiming: false,
  error: null,
}));
jest.mock('../../../Earn/components/MerklRewards/hooks/useMerklClaim', () => ({
  useMerklClaim: (...args: [unknown]) => mockUseMerklClaim(...args),
}));

const mockUsePendingMerklClaim = jest.fn(() => ({
  hasPendingClaim: false,
}));
jest.mock(
  '../../../Earn/components/MerklRewards/hooks/usePendingMerklClaim',
  () => ({
    usePendingMerklClaim: () => mockUsePendingMerklClaim(),
  }),
);

const mockUseMerklRewards = jest.fn((_opts?: unknown) => ({
  claimableReward: null as string | null,
  isLoading: false,
}));
jest.mock(
  '../../../Earn/components/MerklRewards/hooks/useMerklRewards',
  () => ({
    useMerklRewards: (...args: [unknown]) => mockUseMerklRewards(...args),
    isEligibleForMerklRewards: jest.fn(() => false),
  }),
);

jest.mock('../../../Earn/selectors/featureFlags', () => ({
  selectPooledStakingEnabledFlag: jest.fn(() => true),
  selectStablecoinLendingEnabledFlag: jest.fn(() => false),
  selectIsMusdConversionFlowEnabledFlag: jest.fn(() => false),
  selectMusdConversionPaymentTokensAllowlist: jest.fn(() => ({})),
  selectMerklCampaignClaimingEnabledFlag: jest.fn(() => false),
}));

const mockSelectIsMusdConversionFlowEnabledFlag =
  selectIsMusdConversionFlowEnabledFlag as jest.MockedFunction<
    typeof selectIsMusdConversionFlowEnabledFlag
  >;

const mockSelectStablecoinLendingEnabledFlag =
  selectStablecoinLendingEnabledFlag as jest.MockedFunction<
    typeof selectStablecoinLendingEnabledFlag
  >;

const mockSelectMerklCampaignClaimingEnabledFlag =
  selectMerklCampaignClaimingEnabledFlag as jest.MockedFunction<
    typeof selectMerklCampaignClaimingEnabledFlag
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

describe('TokenListItemV2 - Component Rendering Tests for Coverage', () => {
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
    earnToken?: Record<string, unknown> | null;
    isMerklClaimingEnabled?: boolean;
    claimableReward?: string | null;
    isMerklEligible?: boolean;
    tokenMarketData?: Record<string, Record<string, { price: number }>>;
    currencyRatesData?: Record<string, { conversionRate: number }>;
    nativeCurrency?: string;
    currentCurrency?: string;
    multichainRates?: Record<string, { rate: number }>;
    isTestNetwork?: boolean;
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
    isMerklClaimingEnabled = false,
    claimableReward = null,
    isMerklEligible = false,
    tokenMarketData,
    currencyRatesData,
    nativeCurrency,
    currentCurrency,
    multichainRates,
    isTestNetwork = false,
  }: PrepareMocksOptions = {}) {
    jest.clearAllMocks();

    mockGetEarnToken.mockReturnValue(earnToken ?? null);
    mockSelectStablecoinLendingEnabledFlag.mockReturnValue(
      isStablecoinLendingEnabled ?? false,
    );
    mockSelectMerklCampaignClaimingEnabledFlag.mockReturnValue(
      isMerklClaimingEnabled,
    );
    mockUseMerklRewards.mockReturnValue({
      claimableReward,
      isLoading: false,
    });
    (isEligibleForMerklRewards as jest.Mock).mockReturnValue(isMerklEligible);

    // Stock token mocks
    mockIsStockToken.mockReturnValue(isStockToken);
    mockIsTokenTradingOpen.mockResolvedValue(true);
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW_MS);
    mockBuild.mockReturnValue({ name: 'mock-built-event' });
    mockAddProperties.mockImplementation(() => ({ build: mockBuild }));
    mockCreateEventBuilder.mockImplementation(() => ({
      addProperties: mockAddProperties,
    }));

    mockshouldShowTokenListItemCta.mockReturnValue(
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

        if (selector === selectMerklCampaignClaimingEnabledFlag) {
          return isMerklClaimingEnabled;
        }

        if (selector === selectTokenMarketData) {
          return tokenMarketData ?? {};
        }

        if (selector === selectCurrencyRates) {
          return currencyRatesData ?? {};
        }

        if (selector === selectCurrentCurrency) {
          return currentCurrency ?? 'usd';
        }

        if (selector === selectMultichainAssetsRates) {
          return multichainRates ?? {};
        }

        const selectorString = selector.toString();

        // TokenListItemV2 selectors
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

        if (selectorString.includes('selectNativeCurrencyByChainId')) {
          return nativeCurrency ?? undefined;
        }

        return {};
      },
    );

    mockUseTokenPricePercentageChange.mockReturnValue(pricePercentChange1d);
    mockIsTestNet.mockReturnValue(isTestNetwork);
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
        <TokenListItemV2
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
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
    it('displays positive percentage change with success color', () => {
      prepareMocks({
        asset: defaultAsset,
      });

      const assetKey: FlashListAssetKey = {
        address: '0x456',
        chainId: '0x1',
        isStaked: false,
      };

      const { getByTestId } = renderWithProvider(
        <TokenListItemV2
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

    it('displays dash when percentage change is not finite', () => {
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
        <TokenListItemV2
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          privacyMode={false}
        />,
      );

      const percentageText = queryByTestId(SECONDARY_BALANCE_TEST_ID);
      expect(percentageText).toBeOnTheScreen();
      expect(percentageText?.props.children).toBe('-');
    });

    it('displays negative percentage change with error color', () => {
      prepareMocks({
        asset: defaultAsset,
        pricePercentChange1d: -3.45,
      });

      const assetKey: FlashListAssetKey = {
        address: '0x456',
        chainId: '0x1',
        isStaked: false,
      };

      const { getByTestId } = renderWithProvider(
        <TokenListItemV2
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          privacyMode={false}
        />,
      );

      const percentageText = getByTestId(SECONDARY_BALANCE_TEST_ID);
      expect(percentageText.props.children).toBe('-3.45%');
      // Negative percentage should NOT have success color
      expect(percentageText.props.style.color).not.toBe('#457a39');
    });

    it('hides percentage change on testnet', () => {
      prepareMocks({
        asset: defaultAsset,
        pricePercentChange1d: 5.0,
        isTestNetwork: true,
      });

      const assetKey: FlashListAssetKey = {
        address: '0x456',
        chainId: '0x1',
        isStaked: false,
      };

      const { getByTestId } = renderWithProvider(
        <TokenListItemV2
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          privacyMode={false}
        />,
      );

      const percentageText = getByTestId(SECONDARY_BALANCE_TEST_ID);
      expect(percentageText.props.children).toBe('-');
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
        <TokenListItemV2
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
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
        <TokenListItemV2
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
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
        <TokenListItemV2
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
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
        <TokenListItemV2
          assetKey={defaultAssetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
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
        <TokenListItemV2
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
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
        <TokenListItemV2
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
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
        <TokenListItemV2
          assetKey={convertAssetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
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
        <TokenListItemV2
          assetKey={convertAssetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
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
        <TokenListItemV2
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
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
        <TokenListItemV2
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          privacyMode={false}
        />,
      );

      expect(queryByTestId('stock-badge')).toBeNull();
      expect(mockIsStockToken).toHaveBeenCalled();
    });
  });

  describe('Stablecoin lending Earn CTA threshold', () => {
    const assetKey: FlashListAssetKey = {
      address: '0x456',
      chainId: '0x1',
      isStaked: false,
    };

    it('renders percentage change when stablecoin lending Earn CTA balance is below minimum', () => {
      // Arrange — earnToken is null because getEarnToken does not return
      // tokens whose fiat balance is below the minimum threshold.
      prepareMocks({
        asset: { ...defaultAsset, balance: '0.009' },
        pricePercentChange1d: 1.23,
        isStablecoinLendingEnabled: true,
        earnToken: null,
      });

      // Act
      const { getByText, queryByText } = renderWithProvider(
        <TokenListItemV2
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
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
        <TokenListItemV2
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          privacyMode={false}
        />,
      );

      // Assert
      expect(getByText(strings('stake.earn'))).toBeOnTheScreen();
      expect(queryByText('+1.23%')).toBeNull();
    });
  });

  describe('mUSD Token Long Press', () => {
    const musdAddress = '0xaca92e438df0b2401ff60da7e4337b687a2435da';
    const musdAsset = {
      ...defaultAsset,
      address: musdAddress,
      symbol: 'mUSD',
      name: 'MetaMask USD',
      isNative: false,
    };

    const musdAssetKey: FlashListAssetKey = {
      address: musdAddress,
      chainId: '0x1',
      isStaked: false,
    };

    it('does not call showRemoveMenu on long press for mUSD token', () => {
      prepareMocks({
        asset: musdAsset,
      });

      const mockShowRemoveMenu = jest.fn();
      const { getByText } = renderWithProvider(
        <TokenListItemV2
          assetKey={musdAssetKey}
          showRemoveMenu={mockShowRemoveMenu}
          setShowScamWarningModal={jest.fn()}
          privacyMode={false}
        />,
      );

      const tokenElement = getByText('MetaMask USD');
      fireEvent(tokenElement, 'longPress');

      expect(mockShowRemoveMenu).not.toHaveBeenCalled();
    });

    it('calls showRemoveMenu on long press for non-mUSD token', () => {
      prepareMocks({
        asset: defaultAsset,
      });

      const mockShowRemoveMenu = jest.fn();
      const assetKey: FlashListAssetKey = {
        address: '0x456',
        chainId: '0x1',
        isStaked: false,
      };

      const { getByText } = renderWithProvider(
        <TokenListItemV2
          assetKey={assetKey}
          showRemoveMenu={mockShowRemoveMenu}
          setShowScamWarningModal={jest.fn()}
          privacyMode={false}
        />,
      );

      const tokenElement = getByText('Test Token');
      fireEvent(tokenElement, 'longPress');

      expect(mockShowRemoveMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          address: '0x456',
          symbol: 'TEST',
        }),
      );
    });
  });

  describe('Merkl Claim Bonus', () => {
    const claimableAsset = {
      ...defaultAsset,
      address: '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898',
    };
    const assetKey: FlashListAssetKey = {
      address: claimableAsset.address,
      chainId: '0x1',
      isStaked: false,
    };

    it('shows "Claim bonus" replacing percentage when all conditions are met', () => {
      prepareMocks({
        asset: claimableAsset,
        pricePercentChange1d: 5.0,
        isMerklClaimingEnabled: true,
        claimableReward: '1000000000000000000',
        isMerklEligible: true,
      });

      const { getByText, queryByText } = renderWithProvider(
        <TokenListItemV2
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          privacyMode={false}
        />,
      );

      expect(getByText(strings('earn.claim_bonus'))).toBeOnTheScreen();
      expect(queryByText('+5.00%')).toBeNull();
    });

    it('falls back to percentage when merkl claiming is disabled', () => {
      prepareMocks({
        asset: claimableAsset,
        pricePercentChange1d: 1.5,
        isMerklClaimingEnabled: false,
        claimableReward: '1000000000000000000',
        isMerklEligible: true,
      });

      const { queryByText, getByText } = renderWithProvider(
        <TokenListItemV2
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          privacyMode={false}
        />,
      );

      expect(queryByText(strings('earn.claim_bonus'))).toBeNull();
      expect(getByText('+1.50%')).toBeOnTheScreen();
    });
  });

  describe('Token Price in Fiat', () => {
    it('displays token fiat price from multichain rates for non-EVM assets', () => {
      const solAddress = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501';
      const solAsset = {
        ...defaultAsset,
        address: solAddress,
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        symbol: 'SOL',
        name: 'Solana',
        balance: '10',
        balanceFiat: '$255.00',
      };

      prepareMocks({
        asset: solAsset,
        currentCurrency: 'usd',
        multichainRates: {
          [solAddress]: { rate: 25.5 },
        },
      });

      const assetKey: FlashListAssetKey = {
        address: solAddress,
        chainId: solAsset.chainId,
        isStaked: false,
      };

      const { getByText } = renderWithProvider(
        <TokenListItemV2
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          privacyMode={false}
        />,
      );

      expect(getByText(/\$25\.50/)).toBeOnTheScreen();
    });

    it('displays token fiat price calculated from EVM market data', () => {
      const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      const evmAsset = {
        ...defaultAsset,
        address: usdcAddress,
        symbol: 'USDC',
        name: 'USD Coin',
      };

      prepareMocks({
        asset: evmAsset,
        currentCurrency: 'usd',
        nativeCurrency: 'ETH',
        tokenMarketData: {
          '0x1': {
            [usdcAddress]: { price: 0.0005 },
          },
        },
        currencyRatesData: {
          ETH: { conversionRate: 2000 },
        },
      });

      const assetKey: FlashListAssetKey = {
        address: usdcAddress,
        chainId: '0x1',
        isStaked: false,
      };

      const { getByText } = renderWithProvider(
        <TokenListItemV2
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          privacyMode={false}
        />,
      );

      // 0.0005 ETH/token * 2000 USD/ETH = $1.00
      expect(getByText(/\$1\.00/)).toBeOnTheScreen();
    });
  });

  describe('Component Edge Cases', () => {
    it('returns null when asset is not found', () => {
      prepareMocks({
        asset: undefined,
      });

      const assetKey: FlashListAssetKey = {
        address: '0x999',
        chainId: '0x1',
        isStaked: false,
      };

      const { toJSON } = renderWithProvider(
        <TokenListItemV2
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          privacyMode={false}
        />,
      );

      expect(toJSON()).toBeNull();
    });

    it('falls back to symbol when name is not available', () => {
      prepareMocks({
        asset: {
          ...defaultAsset,
          name: '',
        },
      });

      const assetKey: FlashListAssetKey = {
        address: '0x456',
        chainId: '0x1',
        isStaked: false,
      };

      const { getByText } = renderWithProvider(
        <TokenListItemV2
          assetKey={assetKey}
          showRemoveMenu={jest.fn()}
          setShowScamWarningModal={jest.fn()}
          privacyMode={false}
        />,
      );

      expect(getByText('TEST')).toBeOnTheScreen();
    });
  });
});
