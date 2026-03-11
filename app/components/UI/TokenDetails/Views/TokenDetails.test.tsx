import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { TokenDetails } from './TokenDetails';
import { selectNetworkConfigurationByChainId } from '../../../../selectors/networkController';
import { selectPerpsEnabledFlag } from '../../Perps';
import { selectMerklCampaignClaimingEnabledFlag } from '../../Earn/selectors/featureFlags';
import { getRampNetworks } from '../../../../reducers/fiatOrders';
import {
  selectDepositActiveFlag,
  selectDepositMinimumVersionFlag,
} from '../../../../selectors/featureFlagController/deposit';

jest.mock('../../../../selectors/featureFlagController/tokenDetailsV2', () => ({
  selectTokenDetailsLayoutTestVariant: jest.fn(() => 'treatment'),
}));

const mockUseTokenDetailsABTest = jest.fn().mockReturnValue({
  useNewLayout: true,
  variantName: 'treatment',
  isTestActive: true,
});
jest.mock('../hooks/useTokenDetailsABTest', () => ({
  useTokenDetailsABTest: () => mockUseTokenDetailsABTest(),
}));

jest.mock('../../NetworkAssetLogo', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn(() => null),
}));

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (state: unknown) => unknown) =>
    mockUseSelector(selector),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRouteParams = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({ params: mockRouteParams() }),
}));

jest.mock('../hooks/useTokenPrice', () => ({
  useTokenPrice: () => ({
    currentPrice: 100,
    priceDiff: 5,
    comparePrice: 95,
    prices: [],
    isLoading: false,
    timePeriod: '1d',
    setTimePeriod: jest.fn(),
    chartNavigationButtons: ['1d', '1w', '1m'],
    currentCurrency: 'USD',
  }),
}));

const mockUseTokenBalance = jest.fn();
jest.mock('../hooks/useTokenBalance', () => ({
  useTokenBalance: () => mockUseTokenBalance(),
}));

const mockUseTokenBuyability = jest.fn();
jest.mock('../../Ramp/hooks/useTokenBuyability', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseTokenBuyability(...args),
}));

const mockGoToSwaps = jest.fn();
const mockOnBuy = jest.fn();
const mockUseTokenActions = jest.fn();
jest.mock('../hooks/useTokenActions', () => ({
  useTokenActions: () => mockUseTokenActions(),
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

const mockSetTitleSectionHeight = jest.fn();
const mockOnScroll = jest.fn();
jest.mock(
  '../../../../component-library/components-temp/HeaderStandardAnimated/useHeaderStandardAnimated',
  () => ({
    __esModule: true,
    default: () => ({
      scrollY: { value: 0 },
      onScroll: mockOnScroll,
      setTitleSectionHeight: mockSetTitleSectionHeight,
      titleSectionHeightSv: { value: 0 },
    }),
  }),
);

jest.mock(
  '../../../../component-library/components-temp/HeaderStandardAnimated/HeaderStandardAnimated',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, Text, Pressable } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: (props: {
        title?: string;
        subtitle?: string;
        onBack?: () => void;
        endButtonIconProps?: unknown[];
      }) =>
        ReactActual.createElement(
          View,
          { testID: 'header-standard-animated' },
          props.title != null &&
            ReactActual.createElement(
              Text,
              {
                testID: 'header-title',
              },
              props.title,
            ),
          props.subtitle != null &&
            ReactActual.createElement(
              Text,
              {
                testID: 'header-subtitle',
              },
              props.subtitle,
            ),
          props.onBack != null &&
            ReactActual.createElement(Pressable, {
              testID: 'header-back-button',
              onPress: () => props.onBack?.(),
            }),
          props.endButtonIconProps != null &&
            props.endButtonIconProps.length > 0 &&
            ReactActual.createElement(View, { testID: 'header-more-button' }),
        ),
    };
  },
);

jest.mock('../../../../component-library/components-temp/TitleSubpage', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: { title?: string; bottomLabel?: string }) =>
      ReactActual.createElement(
        View,
        { testID: 'title-subpage' },
        props.title != null &&
          ReactActual.createElement(
            Text,
            {
              testID: 'title-subpage-title',
            },
            props.title,
          ),
        props.bottomLabel != null &&
          ReactActual.createElement(
            Text,
            {
              testID: 'title-subpage-bottom-label',
            },
            props.bottomLabel,
          ),
      ),
  };
});

jest.mock('../components/AssetOverviewContent', () => {
  const ReactLib = jest.requireActual('react');
  const AssetOverviewContentMock = ({
    onMarketInsightsDisplayResolved,
  }: {
    onMarketInsightsDisplayResolved?: (isDisplayed: boolean) => void;
  }) => {
    ReactLib.useEffect(() => {
      onMarketInsightsDisplayResolved?.(true);
    }, [onMarketInsightsDisplayResolved]);

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

jest.mock('../../Transactions', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      header,
      embeddedInScrollView,
    }: {
      header?: React.ReactNode;
      embeddedInScrollView?: boolean;
    }) => {
      if (embeddedInScrollView) {
        return ReactActual.createElement(View, {
          testID: 'transactions-embedded',
        });
      }
      return header ?? null;
    },
  };
});

jest.mock(
  '../../../Views/MultichainTransactionsView/MultichainTransactionsView',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: (props: { embeddedInScrollView?: boolean }) =>
        props.embeddedInScrollView
          ? ReactActual.createElement(View, {
              testID: 'multichain-transactions-embedded',
            })
          : null,
    };
  },
);

jest.mock('../../../../selectors/networkController', () => ({
  selectNetworkConfigurationByChainId: jest.fn(() => ({ name: 'Ethereum' })),
}));

jest.mock('../../Perps', () => ({
  selectPerpsEnabledFlag: jest.fn(() => false),
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

const mockIsTokenTradingOpen = jest.fn().mockReturnValue(true);
jest.mock('../../Bridge/hooks/useRWAToken', () => ({
  useRWAToken: () => ({
    isTokenTradingOpen: mockIsTokenTradingOpen,
    isStockToken: jest.fn(() => false),
  }),
}));

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

describe('TokenDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams.mockReturnValue(defaultRouteParams);
    mockBuild.mockReturnValue({ category: 'token-details-opened' });
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });
    mockUseTokenDetailsABTest.mockReturnValue({
      useNewLayout: true,
      variantName: 'treatment',
      isTestActive: true,
    });
    mockIsTokenTradingOpen.mockReturnValue(true);
    mockUseTokenTransactions.mockReturnValue(defaultUseTokenTransactionsReturn);
    mockUseTokenBuyability.mockReturnValue({
      isBuyable: true,
      isLoading: false,
    });
    mockUseTokenActions.mockReturnValue({
      onBuy: mockOnBuy,
      onSend: jest.fn(),
      onReceive: jest.fn(),
      goToSwaps: mockGoToSwaps,
      handleBuyPress: jest.fn(),
      handleSellPress: jest.fn(),
      hasEligibleSwapTokens: true,
      networkModal: null,
    });

    mockUseTokenBalance.mockReturnValue({
      balance: '1.5',
      fiatBalance: '$150.00',
      tokenFormattedBalance: '1.5 ETH',
    });

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectNetworkConfigurationByChainId)
        return { name: 'Ethereum' };
      if (selector === selectPerpsEnabledFlag) return false;
      if (selector === selectMerklCampaignClaimingEnabledFlag) return false;
      if (selector === getRampNetworks) return [];
      if (selector === selectDepositActiveFlag) return false;
      if (selector === selectDepositMinimumVersionFlag) return null;
      return undefined;
    });
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
    it('shows sticky buttons when useNewLayout is true (treatment variant)', () => {
      const { getByTestId, getByText } = render(<TokenDetails />);

      expect(getByTestId('bottomsheetfooter')).toBeOnTheScreen();
      expect(getByText('Swap')).toBeOnTheScreen();
      expect(getByText('Buy')).toBeOnTheScreen();
    });

    it('does not show sticky buttons when useNewLayout is false (control variant)', () => {
      mockUseTokenDetailsABTest.mockReturnValue({
        useNewLayout: false,
        variantName: 'control',
        isTestActive: true,
      });

      const { queryByTestId } = render(<TokenDetails />);

      expect(queryByTestId('bottomsheetfooter')).toBeNull();
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
      mockUseTokenActions.mockReturnValue({
        onBuy: mockOnBuy,
        onSend: jest.fn(),
        onReceive: jest.fn(),
        goToSwaps: mockGoToSwaps,
        handleBuyPress: jest.fn(),
        handleSellPress: jest.fn(),
        hasEligibleSwapTokens: false,
        networkModal: null,
      });

      const { getByText, queryByText } = render(<TokenDetails />);

      expect(getByText('Buy')).toBeOnTheScreen();
      expect(queryByText('Swap')).toBeNull();
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

  describe('Header and scroll structure', () => {
    it('wraps content in SafeAreaView', () => {
      const { getByTestId } = render(<TokenDetails />);

      expect(getByTestId('token-details-safe-area')).toBeOnTheScreen();
    });

    it('renders HeaderStandardAnimated with token name as title and symbol as subtitle', () => {
      const { getByTestId } = render(<TokenDetails />);

      expect(getByTestId('header-title')).toHaveTextContent('Dai Stablecoin');
      expect(getByTestId('header-subtitle')).toHaveTextContent('DAI');
    });

    it('wires HeaderStandardAnimated onBack to navigation.goBack', () => {
      const { getByTestId } = render(<TokenDetails />);

      fireEvent.press(getByTestId('header-back-button'));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('renders TitleSubpage with token name and symbol', () => {
      const { getByTestId } = render(<TokenDetails />);

      expect(getByTestId('title-subpage-title')).toHaveTextContent(
        'Dai Stablecoin',
      );
      expect(getByTestId('title-subpage-bottom-label')).toHaveTextContent(
        'DAI',
      );
    });

    it('renders embedded transactions list when not loading', () => {
      const { getByTestId } = render(<TokenDetails />);

      expect(getByTestId('transactions-embedded')).toBeOnTheScreen();
    });

    it('does not show More button in header when useNewLayout is true', () => {
      mockUseTokenDetailsABTest.mockReturnValue({
        useNewLayout: true,
        variantName: 'treatment',
        isTestActive: true,
      });

      const { queryByTestId } = render(<TokenDetails />);

      expect(queryByTestId('header-more-button')).toBeNull();
    });

    it('shows More button in header when useNewLayout is false and options available', () => {
      mockUseTokenDetailsABTest.mockReturnValue({
        useNewLayout: false,
        variantName: 'control',
        isTestActive: true,
      });

      const { getByTestId } = render(<TokenDetails />);

      expect(getByTestId('header-more-button')).toBeOnTheScreen();
    });

    it('renders MultichainTransactionsView with embeddedInScrollView when isNonEvmAsset is true', () => {
      mockUseTokenTransactions.mockReturnValue({
        ...defaultUseTokenTransactionsReturn,
        isNonEvmAsset: true,
      });

      const { getByTestId } = render(<TokenDetails />);

      expect(getByTestId('multichain-transactions-embedded')).toBeOnTheScreen();
    });

    it('calls setTitleSectionHeight when title section Box fires onLayout', () => {
      const { getByTestId } = render(<TokenDetails />);

      fireEvent(getByTestId('token-details-title-section'), 'layout', {
        nativeEvent: { layout: { height: 120 } },
      });

      expect(mockSetTitleSectionHeight).toHaveBeenCalledWith(120);
    });
  });
});
