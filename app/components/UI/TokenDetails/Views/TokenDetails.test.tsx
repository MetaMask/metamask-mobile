import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { TokenDetails } from './TokenDetails';
import { selectNetworkConfigurationByChainId } from '../../../../selectors/networkController';
import { selectPerpsEnabledFlag } from '../../Perps';
import { selectMerklCampaignClaimingEnabledFlag } from '../../Earn/selectors/featureFlags';
import { getRampNetworks } from '../../../../reducers/fiatOrders';
import {
  selectDepositActiveFlag,
  selectDepositMinimumVersionFlag,
} from '../../../../selectors/featureFlagController/deposit';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';

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

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (state: unknown) => unknown) =>
    mockUseSelector(selector),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      chainId: '0x1',
      symbol: 'DAI',
      decimals: 18,
      name: 'Dai Stablecoin',
      image: 'https://example.com/dai.png',
      isETH: false,
      isNative: false,
      balance: '10.5',
    },
  }),
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

jest.mock('../../Ramp/hooks/useTokenBuyability', () => ({
  useTokenBuyability: () => ({ isBuyable: true, isLoading: false }),
}));

const mockHandleBuyPress = jest.fn();
const mockHandleSellPress = jest.fn();
jest.mock('../hooks/useTokenActions', () => ({
  useTokenActions: () => ({
    onBuy: jest.fn(),
    onSend: jest.fn(),
    onReceive: jest.fn(),
    goToSwaps: jest.fn(),
    handleBuyPress: mockHandleBuyPress,
    handleSellPress: mockHandleSellPress,
    networkModal: null,
  }),
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

jest.mock('../components/TokenDetailsInlineHeader', () => ({
  TokenDetailsInlineHeader: () => null,
}));

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

describe('TokenDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('Buy/Sell sticky buttons', () => {
    it('shows sticky buttons when useNewLayout is true (treatment variant)', () => {
      const { getByTestId, getByText } = render(<TokenDetails />);

      expect(getByTestId('bottomsheetfooter')).toBeOnTheScreen();
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

    it('shows both Buy and Sell buttons when token has balance > 0', () => {
      mockUseTokenBalance.mockReturnValue({
        balance: '10.5',
        fiatBalance: '$1050.00',
        tokenFormattedBalance: '10.5 DAI',
      });

      const { getByText } = render(<TokenDetails />);

      expect(getByText('Buy')).toBeOnTheScreen();
      expect(getByText('Sell')).toBeOnTheScreen();
    });

    it('shows only Buy button when token has no balance', () => {
      mockUseTokenBalance.mockReturnValue({
        balance: '0',
        fiatBalance: '$0.00',
        tokenFormattedBalance: '0 DAI',
      });

      const { getByText, queryByText } = render(<TokenDetails />);

      expect(getByText('Buy')).toBeOnTheScreen();
      expect(queryByText('Sell')).toBeNull();
    });

    it('shows only Buy button when token balance is undefined', () => {
      mockUseTokenBalance.mockReturnValue({
        balance: undefined,
        fiatBalance: undefined,
        tokenFormattedBalance: undefined,
      });

      const { getByText, queryByText } = render(<TokenDetails />);

      expect(getByText('Buy')).toBeOnTheScreen();
      expect(queryByText('Sell')).toBeNull();
    });
  });

  it('tracks token details opened with market insights hidden for legacy asset view', async () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectTokenDetailsV2Enabled) return false;
      if (selector === selectNetworkConfigurationByChainId)
        return { name: 'Ethereum' };
      if (selector === selectPerpsEnabledFlag) return false;
      if (selector === selectMerklCampaignClaimingEnabledFlag) return false;
      if (selector === getRampNetworks) return [];
      if (selector === selectDepositActiveFlag) return false;
      if (selector === selectDepositMinimumVersionFlag) return null;
      return undefined;
    });

    render(<TokenDetails {...defaultProps} />);

    await waitFor(() => {
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.TOKEN_DETAILS_OPENED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          market_insights_displayed: false,
        }),
      );
    });
  });

  it('tracks token details opened for each token when route params change', async () => {
    const { rerender } = render(<TokenDetails {...defaultProps} />);

    await waitFor(() => {
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          token_address: '0x6b175474e89094c44da98b954eedeac495271d0f',
          token_symbol: 'DAI',
          market_insights_displayed: true,
        }),
      );
    });

    const secondToken = {
      ...defaultToken,
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      symbol: 'USDC',
      name: 'USD Coin',
    } as TokenI;

    rerender(
      <TokenDetails
        route={{
          params: secondToken,
        }}
      />,
    );

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
    const { rerender } = render(<TokenDetails {...defaultProps} />);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    rerender(<TokenDetails {...defaultProps} />);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });
  });
});
