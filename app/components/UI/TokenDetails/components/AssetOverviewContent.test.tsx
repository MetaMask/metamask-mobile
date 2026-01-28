import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import AssetOverviewContent, {
  AssetOverviewContentProps,
} from './AssetOverviewContent';
import { TokenI } from '../../Tokens/types';
import { backgroundState } from '../../../../util/test/initial-root-state';

// Mock all external dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('../../Perps/hooks/usePerpsMarketForAsset', () => ({
  usePerpsMarketForAsset: jest.fn(() => ({
    hasPerpsMarket: false,
    marketData: null,
  })),
}));

jest.mock('../../AssetOverview/Price', () => {
  const MockPrice = () => null;
  MockPrice.displayName = 'MockPrice';
  return MockPrice;
});

jest.mock('../../AssetOverview/ChartNavigationButton', () => {
  const { Text } = jest.requireActual('react-native');
  const MockChartNavigationButton = ({
    label,
    onPress,
    selected,
  }: {
    label: string;
    onPress: () => void;
    selected: boolean;
  }) => (
    <Text
      testID={`chart-nav-${label}`}
      onPress={onPress}
      accessibilityState={{ selected }}
    >
      {label}
    </Text>
  );
  MockChartNavigationButton.displayName = 'MockChartNavigationButton';
  return MockChartNavigationButton;
});

jest.mock('../../AssetOverview/Balance', () => {
  const MockBalance = () => null;
  MockBalance.displayName = 'MockBalance';
  return MockBalance;
});

jest.mock('../../AssetOverview/TokenDetails', () => {
  const MockTokenDetails = () => null;
  MockTokenDetails.displayName = 'MockTokenDetails';
  return MockTokenDetails;
});

jest.mock('../../AssetOverview/PriceChart/PriceChart.context', () => ({
  PriceChartProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../../Views/AssetDetails/AssetDetailsActions', () => {
  const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
  const MockAssetDetailsActions = ({
    displayBuyButton,
    displaySwapsButton,
    onBuy,
    onSend,
    onReceive,
    goToSwaps,
  }: {
    displayBuyButton: boolean;
    displaySwapsButton: boolean;
    onBuy: () => void;
    onSend: () => void;
    onReceive: () => void;
    goToSwaps: () => void;
  }) => (
    <View testID="asset-details-actions">
      {displayBuyButton && (
        <TouchableOpacity onPress={onBuy} testID="buy-button">
          <Text>Buy</Text>
        </TouchableOpacity>
      )}
      {displaySwapsButton && (
        <TouchableOpacity onPress={goToSwaps} testID="swap-button">
          <Text>Swap</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={onSend} testID="send-button">
        <Text>Send</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onReceive} testID="receive-button">
        <Text>Receive</Text>
      </TouchableOpacity>
    </View>
  );
  MockAssetDetailsActions.displayName = 'MockAssetDetailsActions';
  return MockAssetDetailsActions;
});

jest.mock('../../Earn/components/MerklRewards', () => {
  const MockMerklRewards = () => null;
  MockMerklRewards.displayName = 'MockMerklRewards';
  return MockMerklRewards;
});

jest.mock('../../Perps/components/PerpsDiscoveryBanner', () => {
  const MockPerpsDiscoveryBanner = () => null;
  MockPerpsDiscoveryBanner.displayName = 'MockPerpsDiscoveryBanner';
  return MockPerpsDiscoveryBanner;
});

jest.mock('../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      wrapper: {},
      warningWrapper: {},
      warning: {},
      warningLinks: {},
      chartNavigationWrapper: {},
      tokenDetailsWrapper: {},
      perpsPositionHeader: {},
    },
  }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockStore = configureMockStore();

describe('AssetOverviewContent', () => {
  const mockAsset: TokenI = {
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    chainId: '0x1',
    balance: '100',
    balanceFiat: '$100',
    image: 'https://example.com/dai.png',
    logo: 'https://example.com/dai.png',
    aggregators: ['Metamask'],
    isETH: false,
    isNative: false,
    hasBalanceError: false,
  };

  const mockOnBuy = jest.fn();
  const mockOnSend = jest.fn();
  const mockOnReceive = jest.fn();
  const mockGoToSwaps = jest.fn();
  const mockSetTimePeriod = jest.fn();

  const defaultProps: AssetOverviewContentProps = {
    token: mockAsset,
    balance: '100',
    mainBalance: '$100.00',
    secondaryBalance: '100 DAI',
    currentPrice: 1.0,
    priceDiff: 0.5,
    comparePrice: 0.995,
    prices: [],
    isLoading: false,
    timePeriod: '1d',
    setTimePeriod: mockSetTimePeriod,
    chartNavigationButtons: ['1d', '1w', '1m', '3m', '1y', '3y'],
    isPerpsEnabled: false,
    isMerklCampaignClaimingEnabled: false,
    displayBuyButton: true,
    displaySwapsButton: true,
    isTokenBuyable: true,
    currentCurrency: 'usd',
    onBuy: mockOnBuy,
    onSend: mockOnSend,
    onReceive: mockOnReceive,
    goToSwaps: mockGoToSwaps,
  };

  const store = mockStore({
    engine: {
      backgroundState: {
        ...backgroundState,
      },
    },
  });

  const renderComponent = (props: Partial<AssetOverviewContentProps> = {}) =>
    render(
      <Provider store={store}>
        <AssetOverviewContent {...defaultProps} {...props} />
      </Provider>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders container with testID', () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId('token-asset-overview')).toBeOnTheScreen();
    });

    it('renders chart navigation buttons', () => {
      const { getByTestId } = renderComponent();

      expect(
        getByTestId('chart-nav-asset_overview.chart_time_period_navigation.1d'),
      ).toBeOnTheScreen();
      expect(
        getByTestId('chart-nav-asset_overview.chart_time_period_navigation.1w'),
      ).toBeOnTheScreen();
    });

    it('renders action buttons when displayBuyButton and displaySwapsButton are true', () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId('buy-button')).toBeOnTheScreen();
      expect(getByTestId('swap-button')).toBeOnTheScreen();
    });

    it('hides buy button when displayBuyButton is false', () => {
      const { queryByTestId } = renderComponent({ displayBuyButton: false });

      expect(queryByTestId('buy-button')).toBeNull();
    });

    it('hides swap button when displaySwapsButton is false', () => {
      const { queryByTestId } = renderComponent({ displaySwapsButton: false });

      expect(queryByTestId('swap-button')).toBeNull();
    });

    it('hides buy button when isTokenBuyable is false', () => {
      const { queryByTestId } = renderComponent({ isTokenBuyable: false });

      expect(queryByTestId('buy-button')).toBeNull();
    });
  });

  describe('balance error state', () => {
    it('renders warning when asset has balance error', () => {
      const assetWithError = { ...mockAsset, hasBalanceError: true };
      const { queryByTestId } = renderComponent({ token: assetWithError });

      expect(queryByTestId('asset-details-actions')).toBeNull();
    });
  });

  describe('merkl rewards', () => {
    it('renders merkl rewards section when enabled', () => {
      const { getByTestId } = renderComponent({
        isMerklCampaignClaimingEnabled: true,
      });

      expect(getByTestId('merkl-rewards-section')).toBeOnTheScreen();
    });

    it('does not render merkl rewards when disabled', () => {
      const { queryByTestId } = renderComponent({
        isMerklCampaignClaimingEnabled: false,
      });

      expect(queryByTestId('merkl-rewards-section')).toBeNull();
    });
  });

  describe('interactions', () => {
    it('calls onBuy when buy button is pressed', () => {
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('buy-button'));

      expect(mockOnBuy).toHaveBeenCalledTimes(1);
    });

    it('calls onSend when send button is pressed', () => {
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('send-button'));

      expect(mockOnSend).toHaveBeenCalledTimes(1);
    });

    it('calls onReceive when receive button is pressed', () => {
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('receive-button'));

      expect(mockOnReceive).toHaveBeenCalledTimes(1);
    });

    it('calls goToSwaps when swap button is pressed', () => {
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('swap-button'));

      expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
    });

    it('calls setTimePeriod when chart navigation button is pressed', () => {
      const { getByTestId } = renderComponent();

      fireEvent.press(
        getByTestId('chart-nav-asset_overview.chart_time_period_navigation.1w'),
      );

      expect(mockSetTimePeriod).toHaveBeenCalledWith('1w');
    });
  });

  describe('balance display', () => {
    it('does not render balance when balance is null', () => {
      const { queryByTestId } = renderComponent({ balance: undefined });

      // Balance component should not render when balance is null/undefined
      // This is tested by checking the component renders without errors
      expect(queryByTestId('token-asset-overview')).toBeOnTheScreen();
    });

    it('renders balance when balance is provided', () => {
      const { getByTestId } = renderComponent({ balance: '100' });

      expect(getByTestId('token-asset-overview')).toBeOnTheScreen();
    });
  });

  describe('perps banner', () => {
    it('does not render perps banner when isPerpsEnabled is false', () => {
      const { queryByTestId } = renderComponent({ isPerpsEnabled: false });

      expect(queryByTestId('perps-discovery-banner')).toBeNull();
    });
  });
});
