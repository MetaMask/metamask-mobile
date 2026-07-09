import React from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  Share,
  type AppStateStatus,
} from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { TokenDetails } from './TokenDetails';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  selectNetworkConfigurationByChainId,
  selectNetworkConfigurations,
} from '../../../../selectors/networkController';
import { selectCurrencyRates } from '../../../../selectors/currencyRateController';
import { selectPerpsEnabledFlag } from '../../Perps';
import { selectMerklCampaignClaimingEnabledFlag } from '../../Earn/selectors/featureFlags';
import { getRampNetworks } from '../../../../reducers/fiatOrders';
import {
  selectDepositActiveFlag,
  selectDepositMinimumVersionFlag,
} from '../../../../selectors/featureFlagController/deposit';
import { selectPriceAlertsEnabled } from '../../../../selectors/featureFlagController/priceAlerts';
import { selectTokenWatchlistEnabled } from '../../Assets/selectors/featureFlags';
import Routes from '../../../../constants/navigation/Routes';
import {
  AMBIENT_NEGATIVE_COLOR,
  AMBIENT_PRICE_COLOR_AB_KEY,
} from '../components/abTestConfig';
import { SOCIAL_AI_QUICK_BUY_AB_KEY } from '../../../Views/SocialLeaderboard/TraderPositionView/components/QuickBuy/abTestConfig';
import { LIGHT_MODE_SUCCESS_GREEN } from '../../../../util/theme';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (state: unknown) => unknown) =>
    mockUseSelector(selector),
}));

jest.mock('../../AssetOverview/Price/hooks/useTokenChartPreferences', () => ({
  useTokenChartPreferences: () => ({
    chartType: 'line',
    chartInterval: '15m',
    indicators: [],
    setChartType: jest.fn(),
    setChartInterval: jest.fn(),
    setIndicators: jest.fn(),
  }),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockBeforeRemoveListener: (() => void) | undefined;
const mockAddListener = jest.fn(
  (event: string, cb: () => void): (() => void) => {
    if (event === 'beforeRemove') mockBeforeRemoveListener = cb;
    return jest.fn();
  },
);
const mockRouteParams = jest.fn().mockReturnValue({
  address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  chainId: '0x1',
  symbol: 'DAI',
  decimals: 18,
  name: 'Dai Stablecoin',
  image: 'https://example.com/dai.png',
  isETH: false,
  isNative: false,
  balance: '10.5',
});
const defaultRouteParams = {
  address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  chainId: '0x1',
  symbol: 'DAI',
  decimals: 18,
  name: 'Dai Stablecoin',
  image: 'https://example.com/dai.png',
  isETH: false,
  isNative: false,
  balance: '10.5',
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    addListener: mockAddListener,
  }),
  useRoute: () => ({ params: mockRouteParams() }),
  useFocusEffect: jest.fn((cb: () => () => void) => {
    cb();
  }),
}));

const defaultUseTokenPriceReturn = {
  currentPrice: 100,
  priceDiff: 5,
  comparePrice: 95,
  prices: [],
  isLoading: false,
  setTimePeriod: jest.fn(),
  chartNavigationButtons: ['1d', '1w', '1m'],
  currentCurrency: 'USD',
};
const mockUseTokenPrice = jest.fn(() => defaultUseTokenPriceReturn);
jest.mock('../hooks/useTokenPrice', () => ({
  useTokenPrice: (...args: unknown[]) => mockUseTokenPrice(...(args as [])),
}));

const mockUseTokenBalance = jest.fn();
jest.mock('../hooks/useTokenBalance', () => ({
  useTokenBalance: () => mockUseTokenBalance(),
}));

const mockToggleWatchlist = jest.fn();
const mockUseTokenWatchlist = jest.fn(() => ({
  isWatched: false,
  isLoading: false,
  toggle: mockToggleWatchlist,
}));
jest.mock('../../Assets/watchlist/hooks/useTokenWatchlist', () => ({
  useTokenWatchlist: (...args: unknown[]) => mockUseTokenWatchlist(...args),
}));

const mockUseTokenBuyability = jest.fn();
jest.mock('../../Ramp/hooks/useTokenBuyability', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseTokenBuyability(...args),
}));

const mockHandleStickySwapPress = jest.fn();
const mockOnBuy = jest.fn();
const mockOnSend = jest.fn();
const mockOnReceive = jest.fn();
const mockUseTokenActions = jest.fn();
jest.mock('../hooks/useTokenActions', () => ({
  useTokenActions: () => mockUseTokenActions(),
}));

const mockUseStickyTokenActions = jest.fn();
jest.mock('../hooks/useStickyTokenActions', () => ({
  useStickyTokenActions: () => mockUseStickyTokenActions(),
}));

const defaultUseTokenTransactionsReturn = {
  transactions: [],
  submittedTxs: [],
  confirmedTxs: [],
  loading: false,
  transactionsUpdated: true,
  selectedAddress: '0x1234',
  conversionRate: 1,
  currentCurrency: 'USD',
  isNonEvmAsset: false,
};

const mockUseTokenTransactions = jest.fn();
jest.mock('../hooks/useTokenTransactions', () => ({
  useTokenTransactions: (...args: unknown[]) =>
    mockUseTokenTransactions(...args),
}));

const mockTokenDetailsInlineHeader = jest.fn(
  (_props: Record<string, unknown>) => null,
);
jest.mock('../components/TokenDetailsInlineHeader', () => ({
  TokenDetailsInlineHeader: (props: Record<string, unknown>) =>
    mockTokenDetailsInlineHeader(props),
}));

let mockLastUseAmbientColorProp: boolean | undefined;
let mockLatestPriceDirectionChange: ((isPositive: boolean) => void) | undefined;
let mockLatestOnBuy: (() => void) | undefined;
let mockLatestOnSend: (() => Promise<void> | void) | undefined;
let mockLatestOnMarketInsightsDisclaimerPress: (() => void) | undefined;
let mockAutoResolveMarketInsights = true;
let mockLatestMarketInsightsResolver:
  | ((params: { isDisplayed: boolean; severity: string | undefined }) => void)
  | undefined;

const triggerMarketInsightsResolved = (params: {
  isDisplayed: boolean;
  severity: string | undefined;
}) => {
  act(() => {
    mockLatestMarketInsightsResolver?.(params);
  });
};

jest.mock('../components/AssetOverviewContent', () => {
  const ReactLib = jest.requireActual('react');
  const AssetOverviewContentMock = ({
    onMarketInsightsDisplayResolved,
    onPriceDirectionChange,
    onBuy,
    onSend,
    onMarketInsightsDisclaimerPress,
    token,
    useAmbientColor,
  }: {
    onMarketInsightsDisplayResolved?: (params: {
      isDisplayed: boolean;
      severity: string | undefined;
    }) => void;
    onPriceDirectionChange?: (isPositive: boolean) => void;
    onBuy?: () => void;
    onSend?: () => Promise<void> | void;
    onMarketInsightsDisclaimerPress?: () => void;
    token?: { address?: string; chainId?: string; symbol?: string };
    useAmbientColor?: boolean;
  }) => {
    const insightsTokenKey = `${token?.address ?? ''}:${token?.chainId ?? ''}:${token?.symbol ?? ''}`;
    // Capture the latest handlers in a deps-less effect (runs every render, no
    // state updates → no loop). This avoids depending on the unstable inline
    // `onMarketInsightsDisclaimerPress` arrow in the auto-resolve effect below.
    ReactLib.useEffect(() => {
      mockLatestOnBuy = onBuy;
      mockLatestOnSend = onSend;
      mockLatestOnMarketInsightsDisclaimerPress =
        onMarketInsightsDisclaimerPress;
    });
    ReactLib.useEffect(() => {
      mockLastUseAmbientColorProp = useAmbientColor;
      mockLatestPriceDirectionChange = onPriceDirectionChange;
      mockLatestMarketInsightsResolver = onMarketInsightsDisplayResolved;
      if (!mockAutoResolveMarketInsights) {
        return;
      }
      onMarketInsightsDisplayResolved?.({
        isDisplayed: true,
        severity: undefined,
      });
    }, [
      onMarketInsightsDisplayResolved,
      onPriceDirectionChange,
      useAmbientColor,
      insightsTokenKey,
    ]);

    return null;
  };

  return {
    __esModule: true,
    default: AssetOverviewContentMock,
  };
});

jest.mock('../../../Views/Asset/ActivityHeader', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../Transactions', () => ({
  __esModule: true,
  default: ({ header }: { header?: React.ReactNode }) => header ?? null,
}));

jest.mock(
  '../../../Views/MultichainTransactionsView/MultichainTransactionsView',
  () => ({
    __esModule: true,
    default: () => null,
  }),
);

jest.mock('../../../../selectors/networkController', () => ({
  selectNetworkConfigurationByChainId: jest.fn(() => ({ name: 'Ethereum' })),
  selectNetworkConfigurations: jest.fn(() => ({
    '0x1': { nativeCurrency: 'ETH' },
  })),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrencyRates: jest.fn(() => ({
    ETH: { conversionRate: 1, usdConversionRate: 1 },
  })),
}));

jest.mock('../../Perps', () => ({
  selectPerpsEnabledFlag: jest.fn(() => false),
}));

const mockUsePerpsMarketForAsset = jest.fn((_symbol: string | null) => ({
  hasPerpsMarket: false,
  marketData: null,
  isLoading: false,
  error: null,
}));
jest.mock('../../Perps/hooks/usePerpsMarketForAsset', () => ({
  usePerpsMarketForAsset: (symbol: string | null) =>
    mockUsePerpsMarketForAsset(symbol),
}));

jest.mock('../../Earn/selectors/featureFlags', () => ({
  selectMerklCampaignClaimingEnabledFlag: jest.fn(() => false),
}));

jest.mock('../../../../reducers/fiatOrders', () => ({
  getRampNetworks: jest.fn(() => []),
}));

jest.mock('../../../../selectors/featureFlagController/deposit', () => ({
  selectDepositActiveFlag: jest.fn(() => false),
  selectDepositMinimumVersionFlag: jest.fn(() => null),
}));

jest.mock('../../../../selectors/featureFlagController/priceAlerts', () => ({
  selectPriceAlertsEnabled: jest.fn(() => false),
}));

jest.mock('../../Assets/selectors/featureFlags', () => ({
  selectTokenWatchlistEnabled: jest.fn(() => false),
}));

const mockUseIsPriceAlertsChainSupported = jest.fn<
  boolean,
  [string | null | undefined, { enabled?: boolean }?]
>(() => true);
jest.mock(
  '../../Assets/PriceAlerts/hooks/useIsPriceAlertsChainSupported',
  () => ({
    useIsPriceAlertsChainSupported: (
      assetId: string | null | undefined,
      options?: { enabled?: boolean },
    ) => mockUseIsPriceAlertsChainSupported(assetId, options),
  }),
);

jest.mock('../../Ramp/Aggregator/utils', () => ({
  isNetworkRampNativeTokenSupported: jest.fn(() => true),
  isNetworkRampSupported: jest.fn(() => true),
}));

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn();
const mockCreateEventBuilder = jest.fn();
jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockShowToast = jest.fn();
jest.mock('../../../../core/ToastService/ToastService', () => ({
  __esModule: true,
  default: {
    showToast: (...args: unknown[]) => mockShowToast(...args),
  },
}));

const mockIsTokenTradingOpen = jest.fn().mockReturnValue(true);
jest.mock('../../Bridge/hooks/useRWAToken', () => ({
  useRWAToken: () => ({
    isTokenTradingOpen: mockIsTokenTradingOpen,
    isStockToken: jest.fn(() => false),
  }),
}));

const defaultUseABTestImpl = (key: string) => {
  if (key === AMBIENT_PRICE_COLOR_AB_KEY) {
    return {
      variant: { useAmbientPriceColor: false },
      variantName: 'control',
      isActive: false,
    };
  }
  if (key === SOCIAL_AI_QUICK_BUY_AB_KEY) {
    return {
      variant: { showQuickBuy: true },
      variantName: 'treatment',
      isActive: true,
    };
  }
  return {
    variant: { swapLabelKey: 'asset_overview.swap' },
    variantName: 'control',
    isActive: false,
  };
};
const mockUseABTest = jest.fn(defaultUseABTestImpl);
jest.mock('../../../../hooks/useABTest', () => ({
  useABTest: (...args: unknown[]) => mockUseABTest(...(args as [string])),
}));

jest.mock('../hooks/useStickyFooterTracking', () => ({
  useStickyFooterTracking: jest.fn(() => jest.fn()),
}));

const mockMarketInsightsDisclaimer = jest.fn(
  (_props: { onClose?: () => void }) => null,
);
jest.mock('../../MarketInsights', () => ({
  MarketInsightsDisclaimerBottomSheet: (props: { onClose?: () => void }) =>
    mockMarketInsightsDisclaimer(props),
}));

const mockAssetDetailsQuickBuy = jest.fn(
  (_props: Record<string, unknown>) => null,
);
jest.mock('../components/AssetDetailsQuickBuy', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockAssetDetailsQuickBuy(props),
}));

jest.mock('../../../../util/haptics', () => ({
  playImpact: jest.fn(),
  ImpactMoment: { PrimaryCTA: 'primaryCta' },
}));

describe('TokenDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBeforeRemoveListener = undefined;
    mockUseABTest.mockImplementation(defaultUseABTestImpl);
    mockRouteParams.mockReturnValue(defaultRouteParams);
    mockAutoResolveMarketInsights = true;
    mockLatestMarketInsightsResolver = undefined;
    mockLastUseAmbientColorProp = undefined;
    mockLatestPriceDirectionChange = undefined;
    mockLatestOnBuy = undefined;
    mockLatestOnSend = undefined;
    mockLatestOnMarketInsightsDisclaimerPress = undefined;
    mockUseTokenPrice.mockReturnValue(defaultUseTokenPriceReturn);
    mockBuild.mockReturnValue({ category: 'token-details-opened' });
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });
    mockIsTokenTradingOpen.mockReturnValue(true);
    mockUseTokenTransactions.mockReturnValue(defaultUseTokenTransactionsReturn);
    mockUseTokenBuyability.mockReturnValue({
      isBuyable: true,
      isLoading: false,
    });
    mockUseTokenActions.mockReturnValue({
      onBuy: mockOnBuy,
      onSend: mockOnSend,
      onReceive: mockOnReceive,
    });
    mockUseStickyTokenActions.mockReturnValue({
      onBuy: mockOnBuy,
      onSwap: mockHandleStickySwapPress,
      hasEligibleSwapTokens: true,
      networkModal: null,
    });
    mockUseIsPriceAlertsChainSupported.mockReturnValue(true);

    mockUseTokenBalance.mockReturnValue({
      balance: '1.5',
      fiatBalance: '$150.00',
      balanceFiatUsd: 150,
      tokenFormattedBalance: '1.5 ETH',
    });

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectNetworkConfigurationByChainId)
        return { name: 'Ethereum' };
      if (selector === selectNetworkConfigurations)
        return { '0x1': { nativeCurrency: 'ETH' } };
      if (selector === selectCurrencyRates)
        // conversionRate === usdConversionRate → 1:1 ratio, fiat value = USD value
        return { ETH: { conversionRate: 1, usdConversionRate: 1 } };
      if (selector === selectPerpsEnabledFlag) return false;
      if (selector === selectMerklCampaignClaimingEnabledFlag) return false;
      if (selector === getRampNetworks) return [];
      if (selector === selectDepositActiveFlag) return false;
      if (selector === selectDepositMinimumVersionFlag) return null;
      if (selector === selectPriceAlertsEnabled) return false;
      if (selector === selectTokenWatchlistEnabled) return false;
      return undefined;
    });
  });

  afterEach(() => {
    mockAutoResolveMarketInsights = true;
    mockLatestMarketInsightsResolver = undefined;
  });

  it('renders loader when txLoading is true', () => {
    mockUseTokenTransactions.mockReturnValue({
      ...defaultUseTokenTransactionsReturn,
      loading: true,
    });

    const { UNSAFE_getByType } = render(<TokenDetails />);

    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  describe('Swap/Buy sticky buttons', () => {
    it('shows sticky buttons when token is loaded', () => {
      const { getByTestId, getByText } = render(<TokenDetails />);

      expect(getByTestId('bottomsheetfooter')).toBeOnTheScreen();
      expect(getByText('Swap')).toBeOnTheScreen();
      expect(getByText('Buy')).toBeOnTheScreen();
    });

    it('does not show sticky buttons when RWA token trading is not open', () => {
      mockIsTokenTradingOpen.mockReturnValue(false);

      const { queryByTestId } = render(<TokenDetails />);

      expect(queryByTestId('bottomsheetfooter')).toBeNull();
    });

    it('shows both Swap and Buy when user has eligible tokens and token is buyable', () => {
      const { getByText } = render(<TokenDetails />);

      expect(getByText('Swap')).toBeOnTheScreen();
      expect(getByText('Buy')).toBeOnTheScreen();
    });

    it('passes scrollToTopOnNav when sticky Swap is pressed', () => {
      const { getByText } = render(<TokenDetails />);

      fireEvent.press(getByText('Swap'));

      expect(mockHandleStickySwapPress).toHaveBeenCalledTimes(1);
    });

    it('shows only Swap when user has eligible tokens but token is not buyable', () => {
      mockUseTokenBuyability.mockReturnValue({
        isBuyable: false,
        isLoading: false,
      });

      const { getByText, queryByText } = render(<TokenDetails />);

      expect(getByText('Swap')).toBeOnTheScreen();
      expect(queryByText('Buy')).toBeNull();
    });

    it('shows only Buy when user has no eligible swap tokens', () => {
      mockUseStickyTokenActions.mockReturnValue({
        onBuy: mockOnBuy,
        onSwap: mockHandleStickySwapPress,
        hasEligibleSwapTokens: false,
        networkModal: null,
      });

      const { getByText, queryByText } = render(<TokenDetails />);

      expect(getByText('Buy')).toBeOnTheScreen();
      expect(queryByText('Swap')).toBeNull();
    });
  });

  describe('Quick Buy', () => {
    const getLastQuickBuyProps = () =>
      mockAssetDetailsQuickBuy.mock.calls[
        mockAssetDetailsQuickBuy.mock.calls.length - 1
      ][0];

    it('mounts AssetDetailsQuickBuy hidden by default with the current token', () => {
      render(<TokenDetails />);

      expect(mockAssetDetailsQuickBuy).toHaveBeenCalledWith(
        expect.objectContaining({
          isVisible: false,
          token: expect.objectContaining({ symbol: 'DAI', chainId: '0x1' }),
        }),
      );
    });

    it('opens AssetDetailsQuickBuy when the sticky lightning button is pressed', () => {
      const { getByTestId } = render(<TokenDetails />);

      expect(getLastQuickBuyProps()).toEqual(
        expect.objectContaining({ isVisible: false }),
      );

      fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.QUICK_BUY_BUTTON));

      expect(getLastQuickBuyProps()).toEqual(
        expect.objectContaining({ isVisible: true }),
      );
    });

    it('hides the lightning button and does not mount AssetDetailsQuickBuy when the control variant is assigned', () => {
      mockUseABTest.mockImplementation((key: string) => {
        if (key === SOCIAL_AI_QUICK_BUY_AB_KEY) {
          return {
            variant: { showQuickBuy: false },
            variantName: 'control',
            isActive: true,
          };
        }
        return {
          variant: { useAmbientPriceColor: false },
          variantName: 'control',
          isActive: false,
        };
      });

      const { queryByTestId } = render(<TokenDetails />);

      expect(
        queryByTestId(TokenOverviewSelectorsIDs.QUICK_BUY_BUTTON),
      ).toBeNull();
      expect(mockAssetDetailsQuickBuy).not.toHaveBeenCalled();
    });
  });

  it('tracks token details opened for each token when route params change', async () => {
    const { rerender } = render(<TokenDetails />);

    await waitFor(() => {
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          token_address: '0x6b175474e89094c44da98b954eedeac495271d0f',
          token_symbol: 'DAI',
          market_insights_displayed: true,
          has_perps_market: false,
          sticky_buttons_shown: expect.stringMatching(/^(both|buy|swap)$/),
        }),
      );
    });

    mockRouteParams.mockReturnValue({
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      chainId: '0x1',
      symbol: 'USDC',
      decimals: 18,
      name: 'USD Coin',
      image: 'https://example.com/usdc.png',
      isETH: false,
      isNative: false,
    });

    rerender(<TokenDetails />);

    await waitFor(() => {
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          token_address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          token_symbol: 'USDC',
          market_insights_displayed: true,
          has_perps_market: false,
        }),
      );
    });
  });

  it('does not track token details opened more than once for the same token', async () => {
    const { rerender } = render(<TokenDetails />);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    rerender(<TokenDetails />);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });
  });

  it('does not flush stale pending insights after token navigation', async () => {
    mockAutoResolveMarketInsights = false;
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectNetworkConfigurationByChainId)
        return { name: 'Ethereum' };
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectMerklCampaignClaimingEnabledFlag) return false;
      if (selector === getRampNetworks) return [];
      if (selector === selectDepositActiveFlag) return false;
      if (selector === selectDepositMinimumVersionFlag) return null;
      return undefined;
    });
    mockUsePerpsMarketForAsset.mockImplementation((symbol: string | null) => ({
      hasPerpsMarket: symbol === 'USDC',
      marketData: null,
      isLoading: symbol === 'DAI',
      error: null,
    }));

    const { rerender } = render(<TokenDetails />);

    triggerMarketInsightsResolved({
      isDisplayed: false,
      severity: 'warning',
    });

    await waitFor(() => {
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    mockRouteParams.mockReturnValue({
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      chainId: '0x1',
      symbol: 'USDC',
      decimals: 18,
      name: 'USD Coin',
      image: 'https://example.com/usdc.png',
      isETH: false,
      isNative: false,
    });

    rerender(<TokenDetails />);

    await waitFor(() => {
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    triggerMarketInsightsResolved({
      isDisplayed: true,
      severity: undefined,
    });

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          token_symbol: 'USDC',
          market_insights_displayed: true,
          has_perps_market: true,
        }),
      );
    });
  });

  describe('Ambient price color A/B test', () => {
    const enableAmbientColor = () => {
      mockUseABTest.mockImplementation((key: string) => {
        if (key === AMBIENT_PRICE_COLOR_AB_KEY) {
          return {
            variant: { useAmbientPriceColor: true },
            variantName: 'treatment',
            isActive: true,
          };
        }
        return {
          variant: { swapLabelKey: 'asset_overview.swap' },
          variantName: 'control',
          isActive: false,
        };
      });
    };

    it('does not pass useAmbientColor in control variant', () => {
      render(<TokenDetails />);

      expect(mockLastUseAmbientColorProp).toBeFalsy();
      expect(mockTokenDetailsInlineHeader).toHaveBeenLastCalledWith(
        expect.objectContaining({ iconColor: undefined }),
      );
    });

    it('passes useAmbientColor=true in treatment variant', () => {
      enableAmbientColor();

      render(<TokenDetails />);

      expect(mockLastUseAmbientColorProp).toBe(true);
    });

    it('keeps iconColor undefined until chart reports direction', () => {
      enableAmbientColor();
      mockUseTokenPrice.mockReturnValue({
        ...defaultUseTokenPriceReturn,
        priceDiff: 10,
      });

      render(<TokenDetails />);

      expect(mockTokenDetailsInlineHeader).toHaveBeenLastCalledWith(
        expect.objectContaining({ iconColor: undefined }),
      );
    });

    it('applies success green when chart reports positive direction', () => {
      enableAmbientColor();

      render(<TokenDetails />);
      act(() => {
        mockLatestPriceDirectionChange?.(true);
      });

      expect(mockTokenDetailsInlineHeader).toHaveBeenLastCalledWith(
        expect.objectContaining({ iconColor: LIGHT_MODE_SUCCESS_GREEN }),
      );
    });

    it('applies negative color when chart reports negative direction', () => {
      enableAmbientColor();

      render(<TokenDetails />);
      act(() => {
        mockLatestPriceDirectionChange?.(false);
      });

      expect(mockTokenDetailsInlineHeader).toHaveBeenLastCalledWith(
        expect.objectContaining({
          iconColor: AMBIENT_NEGATIVE_COLOR,
        }),
      );
    });

    it('returns undefined iconColor when treatment + price is loading', () => {
      enableAmbientColor();
      mockUseTokenPrice.mockReturnValue({
        ...defaultUseTokenPriceReturn,
        isLoading: true,
        priceDiff: 0,
      });

      render(<TokenDetails />);

      expect(mockTokenDetailsInlineHeader).toHaveBeenLastCalledWith(
        expect.objectContaining({ iconColor: undefined }),
      );
    });

    it('hides sticky footer while chart direction is unresolved', () => {
      enableAmbientColor();

      const { queryByTestId } = render(<TokenDetails />);

      expect(queryByTestId('bottomsheetfooter')).toBeNull();
    });
  });

  describe('price alert button gating', () => {
    const enablePriceAlerts = () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectNetworkConfigurationByChainId)
          return { name: 'Ethereum' };
        if (selector === selectNetworkConfigurations)
          return { '0x1': { nativeCurrency: 'ETH' } };
        if (selector === selectCurrencyRates)
          // conversionRate === usdConversionRate → 1:1 ratio, fiat value = USD value
          return { ETH: { conversionRate: 1, usdConversionRate: 1 } };
        if (selector === selectPerpsEnabledFlag) return false;
        if (selector === selectMerklCampaignClaimingEnabledFlag) return false;
        if (selector === getRampNetworks) return [];
        if (selector === selectDepositActiveFlag) return false;
        if (selector === selectDepositMinimumVersionFlag) return null;
        if (selector === selectPriceAlertsEnabled) return true;
        return undefined;
      });
    };

    it('passes onPriceAlertPress to the header when the flag is enabled and currentPrice > 0', () => {
      enablePriceAlerts();
      mockUseTokenPrice.mockReturnValue({
        ...defaultUseTokenPriceReturn,
        currentPrice: 100,
      });

      render(<TokenDetails />);

      expect(mockTokenDetailsInlineHeader).toHaveBeenLastCalledWith(
        expect.objectContaining({
          onPriceAlertPress: expect.any(Function),
        }),
      );
    });

    it('passes undefined onPriceAlertPress when the flag is disabled', () => {
      // Flag disabled — default mockUseSelector returns false for selectPriceAlertsEnabled
      render(<TokenDetails />);

      expect(mockTokenDetailsInlineHeader).toHaveBeenLastCalledWith(
        expect.objectContaining({ onPriceAlertPress: undefined }),
      );
    });

    it('passes undefined onPriceAlertPress when currentPrice is 0, even if flag is enabled', () => {
      enablePriceAlerts();
      mockUseTokenPrice.mockReturnValue({
        ...defaultUseTokenPriceReturn,
        currentPrice: 0,
      });

      render(<TokenDetails />);

      expect(mockTokenDetailsInlineHeader).toHaveBeenLastCalledWith(
        expect.objectContaining({ onPriceAlertPress: undefined }),
      );
    });

    it('passes undefined onPriceAlertPress when CAIP-19 asset id cannot be resolved', () => {
      enablePriceAlerts();
      mockUseTokenPrice.mockReturnValue({
        ...defaultUseTokenPriceReturn,
        currentPrice: 100,
      });
      mockRouteParams.mockReturnValue({
        ...defaultRouteParams,
        chainId: undefined,
      });

      render(<TokenDetails />);

      expect(mockTokenDetailsInlineHeader).toHaveBeenLastCalledWith(
        expect.objectContaining({ onPriceAlertPress: undefined }),
      );
    });

    it('passes undefined onPriceAlertPress when the chain is not supported for price alerts', () => {
      enablePriceAlerts();
      mockUseIsPriceAlertsChainSupported.mockReturnValue(false);
      mockUseTokenPrice.mockReturnValue({
        ...defaultUseTokenPriceReturn,
        currentPrice: 100,
      });

      render(<TokenDetails />);

      expect(mockTokenDetailsInlineHeader).toHaveBeenLastCalledWith(
        expect.objectContaining({ onPriceAlertPress: undefined }),
      );
    });

    it('passes undefined onPriceAlertPress when USD conversion rates are unavailable', () => {
      // Override to return no currency rates — calcUsdAmountFromFiat returns undefined → null
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectNetworkConfigurationByChainId)
          return { name: 'Ethereum' };
        if (selector === selectNetworkConfigurations)
          return { '0x1': { nativeCurrency: 'ETH' } };
        if (selector === selectCurrencyRates) return {};
        if (selector === selectPerpsEnabledFlag) return false;
        if (selector === selectMerklCampaignClaimingEnabledFlag) return false;
        if (selector === getRampNetworks) return [];
        if (selector === selectDepositActiveFlag) return false;
        if (selector === selectDepositMinimumVersionFlag) return null;
        if (selector === selectPriceAlertsEnabled) return true;
        return undefined;
      });
      mockUseTokenPrice.mockReturnValue({
        ...defaultUseTokenPriceReturn,
        currentPrice: 100,
      });

      render(<TokenDetails />);

      expect(mockTokenDetailsInlineHeader).toHaveBeenLastCalledWith(
        expect.objectContaining({ onPriceAlertPress: undefined }),
      );
    });

    it('shows the price alert button for a Solana token when the chain is supported', () => {
      enablePriceAlerts();
      mockUseTokenPrice.mockReturnValue({
        ...defaultUseTokenPriceReturn,
        currentPrice: 150,
      });
      mockRouteParams.mockReturnValue({
        ...defaultRouteParams,
        address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        symbol: 'SOL',
      });

      render(<TokenDetails />);

      expect(mockTokenDetailsInlineHeader).toHaveBeenLastCalledWith(
        expect.objectContaining({
          onPriceAlertPress: expect.any(Function),
        }),
      );
    });

    it('shows the price alert button for a Bitcoin token using the native currency CAIP-19 fallback', () => {
      enablePriceAlerts();
      mockUseTokenPrice.mockReturnValue({
        ...defaultUseTokenPriceReturn,
        currentPrice: 60000,
      });
      // Bitcoin's address is "native" — formatAddressToAssetId cannot resolve it,
      // so caip19AssetId falls back to AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS
      // nativeCurrency = "bip122:000000000019d6689c085ae165831e93/slip44:0"
      mockRouteParams.mockReturnValue({
        ...defaultRouteParams,
        address: 'native',
        chainId: 'bip122:000000000019d6689c085ae165831e93',
        symbol: 'BTC',
      });

      render(<TokenDetails />);

      expect(mockTokenDetailsInlineHeader).toHaveBeenLastCalledWith(
        expect.objectContaining({
          onPriceAlertPress: expect.any(Function),
        }),
      );
    });

    it('navigates with the Bitcoin native CAIP-19 asset id when the price alert button is pressed', () => {
      enablePriceAlerts();
      mockUseTokenPrice.mockReturnValue({
        ...defaultUseTokenPriceReturn,
        currentPrice: 60000,
      });
      mockRouteParams.mockReturnValue({
        ...defaultRouteParams,
        address: 'native',
        chainId: 'bip122:000000000019d6689c085ae165831e93',
        symbol: 'BTC',
      });

      render(<TokenDetails />);

      const lastCall = mockTokenDetailsInlineHeader.mock.calls.at(-1)?.[0] as {
        onPriceAlertPress?: () => void;
      };
      act(() => {
        lastCall.onPriceAlertPress?.();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MANAGE_PRICE_ALERTS,
        expect.objectContaining({
          symbol: 'BTC',
          currentPrice: 60000,
          currentCurrency: 'usd',
          assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
        }),
      );
    });

    it('always navigates to MANAGE_PRICE_ALERTS with currentCurrency usd regardless of user fiat setting', () => {
      // 2800 EUR × (3000 USD/ETH ÷ 2800 EUR/ETH) = 3000 USD
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectNetworkConfigurationByChainId)
          return { name: 'Ethereum' };
        if (selector === selectNetworkConfigurations)
          return { '0x1': { nativeCurrency: 'ETH' } };
        if (selector === selectCurrencyRates)
          return { ETH: { conversionRate: 2800, usdConversionRate: 3000 } };
        if (selector === selectPerpsEnabledFlag) return false;
        if (selector === selectMerklCampaignClaimingEnabledFlag) return false;
        if (selector === getRampNetworks) return [];
        if (selector === selectDepositActiveFlag) return false;
        if (selector === selectDepositMinimumVersionFlag) return null;
        if (selector === selectPriceAlertsEnabled) return true;
        return undefined;
      });
      mockUseTokenPrice.mockReturnValue({
        ...defaultUseTokenPriceReturn,
        currentPrice: 2800,
        currentCurrency: 'eur',
      });
      mockRouteParams.mockReturnValue({
        ...defaultRouteParams,
        address: '0x6b175474e89094c44da98b954eedeac495271d0f',
        chainId: '0x1',
        symbol: 'DAI',
      });

      render(<TokenDetails />);

      const lastCall = mockTokenDetailsInlineHeader.mock.calls.at(-1)?.[0] as {
        onPriceAlertPress?: () => void;
      };
      act(() => {
        lastCall.onPriceAlertPress?.();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MANAGE_PRICE_ALERTS,
        expect.objectContaining({
          currentPrice: 3000,
          currentCurrency: 'usd',
        }),
      );
    });

    it('navigates to MANAGE_PRICE_ALERTS with the correct params when the price alert button is pressed', () => {
      enablePriceAlerts();
      mockUseTokenPrice.mockReturnValue({
        ...defaultUseTokenPriceReturn,
        currentPrice: 2500,
        currentCurrency: 'USD',
      });
      mockRouteParams.mockReturnValue({
        ...defaultRouteParams,
        address: '0x6b175474e89094c44da98b954eedeac495271d0f',
        chainId: '0x1',
        symbol: 'DAI',
      });

      render(<TokenDetails />);

      // Retrieve the handler passed to the mocked header component and invoke it
      const lastCall = mockTokenDetailsInlineHeader.mock.calls.at(-1)?.[0] as {
        onPriceAlertPress?: () => void;
      };
      act(() => {
        lastCall.onPriceAlertPress?.();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MANAGE_PRICE_ALERTS,
        expect.objectContaining({
          symbol: 'DAI',
          currentPrice: 2500,
          currentCurrency: 'usd',
          assetId: expect.stringMatching(/^eip155:1\//),
        }),
      );
    });
  });

  describe('share button', () => {
    beforeEach(() => {
      jest
        .spyOn(Share, 'share')
        .mockResolvedValue({ action: Share.dismissedAction });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    const invokeSharePress = async () => {
      const lastCall = mockTokenDetailsInlineHeader.mock.calls.at(-1);
      const { onSharePress } = (lastCall?.[0] ?? {}) as {
        onSharePress: () => void;
      };
      await act(async () => {
        onSharePress();
      });
    };

    it('always passes onSharePress to the header', () => {
      render(<TokenDetails />);

      expect(mockTokenDetailsInlineHeader).toHaveBeenLastCalledWith(
        expect.objectContaining({ onSharePress: expect.any(Function) }),
      );
    });

    it('calls Share.share with an encoded CAIP-19 URL when onSharePress is invoked', async () => {
      render(<TokenDetails />);
      await invokeSharePress();

      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringMatching(
            /^https:\/\/link\.metamask\.io\/asset\?assetId=eip155/,
          ),
        }),
      );
    });

    it('does not include unencoded colons or slashes in the query param', async () => {
      render(<TokenDetails />);
      await invokeSharePress();

      const [{ url }] = (Share.share as jest.Mock).mock.calls[0];
      const assetId = new URL(url as string).searchParams.get('assetId') ?? '';
      const queryString = (url as string).split('?')[1] ?? '';
      expect(decodeURIComponent(encodeURIComponent(assetId))).toBe(assetId);
      expect(queryString).not.toContain(':');
    });

    it('fires TOKEN_DETAILS_SHARED with chain_id, token_symbol and token_address', async () => {
      render(<TokenDetails />);
      await invokeSharePress();

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.TOKEN_DETAILS_SHARED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          chain_id: '0x1',
          token_symbol: 'DAI',
          token_address: '0x6b175474e89094c44da98b954eedeac495271d0f',
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('on Android passes message with URL and no separate url field', async () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        configurable: true,
      });
      try {
        render(<TokenDetails />);
        await invokeSharePress();

        const [args] = (Share.share as jest.Mock).mock.calls[0];
        expect(args.message).toMatch(/link\.metamask\.io/);
        expect(args.url).toBeUndefined();
      } finally {
        Object.defineProperty(Platform, 'OS', {
          value: 'ios',
          configurable: true,
        });
      }
    });

    it('does not share when caip19AssetId cannot be resolved', async () => {
      mockRouteParams.mockReturnValue({
        ...defaultRouteParams,
        chainId: undefined,
      });

      render(<TokenDetails />);
      await invokeSharePress();

      expect(Share.share).not.toHaveBeenCalled();
    });

    it('resolves caip19AssetId directly when address is already CAIP-19 format', async () => {
      const caipAddress =
        'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f';
      mockRouteParams.mockReturnValue({
        ...defaultRouteParams,
        address: caipAddress,
      });

      render(<TokenDetails />);
      await invokeSharePress();

      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining(encodeURIComponent(caipAddress)),
        }),
      );
    });
  });

  describe('header back button', () => {
    it('calls navigation.goBack when onBackPress is invoked', () => {
      render(<TokenDetails />);

      const { onBackPress } = (mockTokenDetailsInlineHeader.mock.calls.at(
        -1,
      )?.[0] ?? {}) as { onBackPress: () => void };
      act(() => {
        onBackPress();
      });

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('overview Buy/Send actions', () => {
    it('fires cta_clicked and triggers onBuy when overview Buy is pressed', () => {
      render(<TokenDetails />);

      act(() => {
        mockLatestOnBuy?.();
      });

      expect(mockOnBuy).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ exit_action: 'cta_clicked' }),
      );
    });

    it('fires cta_clicked and triggers onSend when overview Send is pressed', async () => {
      render(<TokenDetails />);

      await act(async () => {
        await mockLatestOnSend?.();
      });

      expect(mockOnSend).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ exit_action: 'cta_clicked' }),
      );
    });
  });

  describe('market insights disclaimer', () => {
    it('does not render the disclaimer bottom sheet before it is requested', () => {
      render(<TokenDetails />);

      expect(mockMarketInsightsDisclaimer).not.toHaveBeenCalled();
    });

    it('renders the disclaimer bottom sheet when the disclaimer is pressed and hides it on close', () => {
      render(<TokenDetails />);

      act(() => {
        mockLatestOnMarketInsightsDisclaimerPress?.();
      });
      expect(mockMarketInsightsDisclaimer).toHaveBeenCalled();

      const { onClose } = (mockMarketInsightsDisclaimer.mock.calls.at(
        -1,
      )?.[0] ?? {}) as { onClose?: () => void };
      act(() => {
        onClose?.();
      });

      expect(onClose).toBeDefined();
    });
  });

  describe('non-EVM asset', () => {
    it('renders without crashing and shows sticky footer for non-EVM assets', () => {
      mockUseTokenTransactions.mockReturnValue({
        ...defaultUseTokenTransactionsReturn,
        isNonEvmAsset: true,
      });

      const { queryByTestId } = render(<TokenDetails />);

      // Sticky footer is still rendered for non-EVM assets (not inside the EVM/non-EVM branch)
      expect(queryByTestId('bottomsheetfooter')).toBeOnTheScreen();
    });

    it('does not render loader for non-EVM assets when not loading', () => {
      mockUseTokenTransactions.mockReturnValue({
        ...defaultUseTokenTransactionsReturn,
        isNonEvmAsset: true,
        loading: false,
      });

      const { UNSAFE_queryAllByType } = render(<TokenDetails />);

      expect(UNSAFE_queryAllByType(ActivityIndicator)).toHaveLength(0);
    });
  });

  describe('TOKEN_DETAILS_OPENED tracking details', () => {
    it('tracks has_balance: false when balance is "0"', async () => {
      mockRouteParams.mockReturnValue({ ...defaultRouteParams, balance: '0' });

      render(<TokenDetails />);

      await waitFor(() => {
        expect(mockAddProperties).toHaveBeenCalledWith(
          expect.objectContaining({ has_balance: false }),
        );
      });
    });

    it('tracks has_balance: false when balance is undefined', async () => {
      mockRouteParams.mockReturnValue({
        ...defaultRouteParams,
        balance: undefined,
      });

      render(<TokenDetails />);

      await waitFor(() => {
        expect(mockAddProperties).toHaveBeenCalledWith(
          expect.objectContaining({ has_balance: false }),
        );
      });
    });

    it('tracks has_balance: true when balance is a non-zero string', async () => {
      mockRouteParams.mockReturnValue({
        ...defaultRouteParams,
        balance: '10.5',
      });

      render(<TokenDetails />);

      await waitFor(() => {
        expect(mockAddProperties).toHaveBeenCalledWith(
          expect.objectContaining({ has_balance: true }),
        );
      });
    });

    it('tracks source from route params', async () => {
      mockRouteParams.mockReturnValue({
        ...defaultRouteParams,
        source: 'trending',
      });

      render(<TokenDetails />);

      await waitFor(() => {
        expect(mockAddProperties).toHaveBeenCalledWith(
          expect.objectContaining({ source: 'trending' }),
        );
      });
    });

    it('defaults source to "unknown" when not provided in route params', async () => {
      mockRouteParams.mockReturnValue({
        ...defaultRouteParams,
        source: undefined,
      });

      render(<TokenDetails />);

      await waitFor(() => {
        expect(mockAddProperties).toHaveBeenCalledWith(
          expect.objectContaining({ source: 'unknown' }),
        );
      });
    });
  });

  describe('TOKEN_DETAILS_CLOSED via back navigation', () => {
    it('fires TOKEN_DETAILS_CLOSED with back_navigation when screen is removed', () => {
      render(<TokenDetails />);

      act(() => {
        mockBeforeRemoveListener?.();
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.TOKEN_DETAILS_CLOSED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ exit_action: 'back_navigation' }),
      );
    });

    it('does not fire TOKEN_DETAILS_CLOSED twice on double back navigation', () => {
      render(<TokenDetails />);

      act(() => {
        mockBeforeRemoveListener?.();
        mockBeforeRemoveListener?.();
      });

      const closedCount = mockCreateEventBuilder.mock.calls.filter(
        ([event]) => event === MetaMetricsEvents.TOKEN_DETAILS_CLOSED,
      ).length;
      expect(closedCount).toBe(1);
    });
  });

  describe('TOKEN_DETAILS_CLOSED via CTA', () => {
    it('fires TOKEN_DETAILS_CLOSED with cta_clicked when Buy is pressed', () => {
      const { getByText } = render(<TokenDetails />);

      fireEvent.press(getByText('Buy'));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.TOKEN_DETAILS_CLOSED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ exit_action: 'cta_clicked' }),
      );
    });

    it('fires TOKEN_DETAILS_CLOSED with cta_clicked when Swap is pressed', () => {
      const { getByText } = render(<TokenDetails />);

      fireEvent.press(getByText('Swap'));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.TOKEN_DETAILS_CLOSED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ exit_action: 'cta_clicked' }),
      );
    });
  });

  describe('TOKEN_DETAILS_CLOSED app state tracking', () => {
    let handleAppStateChange: (nextState: AppStateStatus) => void;

    const getTokenDetailsClosedCallCount = () =>
      mockCreateEventBuilder.mock.calls.filter(
        ([event]) => event === MetaMetricsEvents.TOKEN_DETAILS_CLOSED,
      ).length;

    beforeEach(() => {
      jest
        .spyOn(AppState, 'addEventListener')
        .mockImplementation((_, listener) => {
          handleAppStateChange = listener;
          return { remove: jest.fn() };
        });
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        value: 'active',
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('does not fire TOKEN_DETAILS_CLOSED on transient inactive (e.g. Control Center)', () => {
      render(<TokenDetails />);

      act(() => {
        handleAppStateChange('inactive');
        handleAppStateChange('active');
      });

      expect(getTokenDetailsClosedCallCount()).toBe(0);
    });

    it('fires TOKEN_DETAILS_CLOSED with app_backgrounded only when app is backgrounded', () => {
      render(<TokenDetails />);

      act(() => {
        handleAppStateChange('background');
      });

      expect(getTokenDetailsClosedCallCount()).toBe(1);
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ exit_action: 'app_backgrounded' }),
      );
    });

    it('resets session after iOS background → inactive → active sequence', () => {
      render(<TokenDetails />);

      act(() => {
        handleAppStateChange('background');
      });
      expect(getTokenDetailsClosedCallCount()).toBe(1);

      act(() => {
        handleAppStateChange('inactive');
        handleAppStateChange('active');
      });

      act(() => {
        handleAppStateChange('background');
      });

      expect(getTokenDetailsClosedCallCount()).toBe(2);
    });
  });

  describe('watchlist star toggle', () => {
    const enableWatchlist = () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectNetworkConfigurationByChainId)
          return { name: 'Ethereum' };
        if (selector === selectNetworkConfigurations)
          return { '0x1': { nativeCurrency: 'ETH' } };
        if (selector === selectCurrencyRates)
          return { ETH: { conversionRate: 1, usdConversionRate: 1 } };
        if (selector === selectPerpsEnabledFlag) return false;
        if (selector === selectMerklCampaignClaimingEnabledFlag) return false;
        if (selector === getRampNetworks) return [];
        if (selector === selectDepositActiveFlag) return false;
        if (selector === selectDepositMinimumVersionFlag) return null;
        if (selector === selectPriceAlertsEnabled) return false;
        if (selector === selectTokenWatchlistEnabled) return true;
        return undefined;
      });
    };

    afterEach(() => {
      mockToggleWatchlist.mockClear();
      mockShowToast.mockClear();
    });

    it('passes onStarPress to header when watchlist is enabled and caip19AssetId is resolved', () => {
      enableWatchlist();

      render(<TokenDetails />);

      expect(mockTokenDetailsInlineHeader).toHaveBeenLastCalledWith(
        expect.objectContaining({
          onStarPress: expect.any(Function),
          isWatched: false,
        }),
      );
    });

    it('passes undefined onStarPress when watchlist flag is disabled', () => {
      render(<TokenDetails />);

      expect(mockTokenDetailsInlineHeader).toHaveBeenLastCalledWith(
        expect.objectContaining({ onStarPress: undefined }),
      );
    });

    it('passes undefined onStarPress when caip19AssetId cannot be resolved', () => {
      enableWatchlist();
      mockRouteParams.mockReturnValue({
        ...defaultRouteParams,
        address: '',
        chainId: undefined,
      });

      render(<TokenDetails />);

      expect(mockTokenDetailsInlineHeader).toHaveBeenLastCalledWith(
        expect.objectContaining({ onStarPress: undefined }),
      );
    });

    it('passes isWatched=true to header when token is on watchlist', () => {
      enableWatchlist();
      mockUseTokenWatchlist.mockReturnValue({
        isWatched: true,
        isLoading: false,
        toggle: mockToggleWatchlist,
      });

      render(<TokenDetails />);

      expect(mockTokenDetailsInlineHeader).toHaveBeenLastCalledWith(
        expect.objectContaining({ isWatched: true }),
      );
    });

    it('calls toggleWatchlist and shows toast when star is pressed', () => {
      enableWatchlist();

      render(<TokenDetails />);

      const lastCall = mockTokenDetailsInlineHeader.mock.calls.at(-1);
      const { onStarPress } = lastCall?.[0] as { onStarPress: () => void };

      act(() => {
        onStarPress();
      });

      expect(mockToggleWatchlist).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it('fires WATCHLIST_TOKEN_ADDED analytics when adding to watchlist', () => {
      enableWatchlist();
      mockUseTokenWatchlist.mockReturnValue({
        isWatched: false,
        isLoading: false,
        toggle: mockToggleWatchlist,
      });

      render(<TokenDetails />);

      const lastCall = mockTokenDetailsInlineHeader.mock.calls.at(-1);
      const { onStarPress } = lastCall?.[0] as { onStarPress: () => void };

      act(() => {
        onStarPress();
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.WATCHLIST_TOKEN_ADDED,
      );
    });

    it('fires WATCHLIST_TOKEN_REMOVED analytics when removing from watchlist', () => {
      enableWatchlist();
      mockUseTokenWatchlist.mockReturnValue({
        isWatched: true,
        isLoading: false,
        toggle: mockToggleWatchlist,
      });

      render(<TokenDetails />);

      const lastCall = mockTokenDetailsInlineHeader.mock.calls.at(-1);
      const { onStarPress } = lastCall?.[0] as { onStarPress: () => void };

      act(() => {
        onStarPress();
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.WATCHLIST_TOKEN_REMOVED,
      );
    });
  });
});
