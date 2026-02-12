import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import AssetOverviewContent, {
  AssetOverviewContentProps,
} from './AssetOverviewContent';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { mockNetworkState } from '../../../../util/test/network';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import { TimePeriod } from '../../../hooks/useTokenHistoricalPrices';

const MOCK_CHAIN_ID = '0x1';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          chainId: MOCK_CHAIN_ID,
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
        }),
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      PerpsController: {
        isEligible: false,
      },
    },
  },
  settings: {
    primaryCurrency: 'ETH',
  },
};

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    addListener: jest.fn(() => jest.fn()),
  }),
}));

jest.mock('../../AssetOverview/hooks/useScrollToMerklRewards', () => ({
  useScrollToMerklRewards: jest.fn(),
}));

jest.mock('../hooks/usePerpsActions', () => ({
  usePerpsActions: jest.fn(() => ({
    hasPerpsMarket: false,
    marketData: null,
    isLoading: false,
    handlePerpsAction: null,
  })),
}));

jest.mock('../../Perps/hooks/usePerpsPositionForAsset', () => ({
  usePerpsPositionForAsset: jest.fn(() => ({
    position: null,
    isLoading: false,
  })),
}));

jest.mock('../../Perps/hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(() => ({
    track: jest.fn(),
  })),
}));

jest.mock('../hooks/useTokenBuyability', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isBuyable: true,
    isLoading: false,
  })),
}));

jest.mock('../../Perps/selectors/perpsController', () => ({
  selectPerpsEligibility: jest.fn(() => false),
}));

jest.mock('../../../../selectors/featureFlagController/tokenDetailsV2', () => ({
  selectTokenDetailsV2ButtonsEnabled: jest.fn(() => false),
}));

// Mock Balance component
jest.mock('../../AssetOverview/Balance', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({
      mainBalance,
      secondaryBalance,
    }: {
      mainBalance?: string;
      secondaryBalance?: string;
    }) => (
      <View testID="balance-component">
        <Text testID="main-balance">{mainBalance}</Text>
        <Text testID="secondary-balance">{secondaryBalance}</Text>
      </View>
    ),
  };
});

// Mock Price component
jest.mock('../../AssetOverview/Price', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ currentPrice }: { currentPrice: number }) => (
      <View testID="price-component">
        <Text testID="current-price">{currentPrice}</Text>
      </View>
    ),
  };
});

// Mock ChartNavigationButton
jest.mock('../../AssetOverview/ChartNavigationButton', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({
      label,
      onPress,
      selected,
    }: {
      label: string;
      onPress: () => void;
      selected: boolean;
    }) => (
      <TouchableOpacity onPress={onPress} testID={`chart-nav-${label}`}>
        <Text>{selected ? `[${label}]` : label}</Text>
      </TouchableOpacity>
    ),
  };
});

// Mock TokenDetails
jest.mock('../../AssetOverview/TokenDetails', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => <View testID="token-details" />,
  };
});

// Mock MerklRewards
jest.mock('../../Earn/components/MerklRewards', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => <View testID="merkl-rewards" />,
  };
});

// Mock AssetDetailsActions
jest.mock('../../../Views/AssetDetails/AssetDetailsActions', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View, TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({
      onBuy,
      onSend,
      onReceive,
      goToSwaps,
    }: {
      onBuy: () => void;
      onSend: () => void;
      onReceive: () => void;
      goToSwaps: () => void;
    }) => (
      <View testID="asset-details-actions">
        <TouchableOpacity onPress={onBuy} testID="buy-button">
          <Text>Buy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSend} testID="send-button">
          <Text>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onReceive} testID="receive-button">
          <Text>Receive</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToSwaps} testID="swap-button">
          <Text>Swap</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

// Mock PerpsDiscoveryBanner
jest.mock('../../Perps/components/PerpsDiscoveryBanner', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID: string }) => <View testID={testID} />,
  };
});

// Mock PerpsPositionCard
jest.mock('../../Perps/components/PerpsPositionCard', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID: string }) => <View testID={testID} />,
  };
});

// Mock PerpsBottomSheetTooltip
jest.mock('../../Perps/components/PerpsBottomSheetTooltip', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID: string }) => (
      <View testID={testID || 'perps-tooltip'} />
    ),
  };
});

// Mock TokenDetailsActions
jest.mock('./TokenDetailsActions', () => ({
  TokenDetailsActions: ({
    onBuy,
    onSend,
    onReceive,
  }: {
    onBuy: () => void;
    onSend: () => Promise<void>;
    onReceive: () => void;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow
    const React = require('react');
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { View, TouchableOpacity, Text } = require('react-native');
    return (
      <View testID="token-details-actions">
        <TouchableOpacity onPress={onBuy} testID="v2-buy-button">
          <Text>Buy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSend} testID="v2-send-button">
          <Text>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onReceive} testID="v2-receive-button">
          <Text>Receive</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

// Mock PriceChartProvider
jest.mock('../../AssetOverview/PriceChart/PriceChart.context', () => ({
  PriceChartProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockToken = {
  symbol: 'ETH',
  name: 'Ethereum',
  address: '0x123',
  chainId: MOCK_CHAIN_ID,
  decimals: 18,
  image: 'https://example.com/eth.png',
  logo: 'https://example.com/eth.png',
  isETH: true,
  isNative: true,
  hasBalanceError: false,
  aggregators: ['CoinGecko', 'CoinMarketCap'],
  balance: '100',
  balanceFiat: '$100.00',
};

const defaultProps: AssetOverviewContentProps = {
  token: mockToken,
  balance: '100',
  mainBalance: '$100.00',
  secondaryBalance: '100 ETH',
  currentPrice: 2000,
  priceDiff: 50,
  comparePrice: 1950,
  prices: [],
  isLoading: false,
  timePeriod: '1d',
  setTimePeriod: jest.fn(),
  chartNavigationButtons: ['1d', '1w', '1m', '3m', '1y', '3y'] as TimePeriod[],
  isPerpsEnabled: false,
  isMerklCampaignClaimingEnabled: false,
  displayBuyButton: true,
  displaySwapsButton: true,
  currentCurrency: 'USD',
  onBuy: jest.fn(),
  onSend: jest.fn().mockResolvedValue(undefined),
  onReceive: jest.fn(),
  goToSwaps: jest.fn(),
};

describe('AssetOverviewContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverviewContent {...defaultProps} />,
      { state: mockInitialState },
    );

    expect(getByTestId(TokenOverviewSelectorsIDs.CONTAINER)).toBeTruthy();
    expect(getByTestId('price-component')).toBeTruthy();
    expect(getByTestId('balance-component')).toBeTruthy();
    expect(getByTestId('token-details')).toBeTruthy();
  });

  it('renders warning when token has balance error', () => {
    const tokenWithError = { ...mockToken, hasBalanceError: true };
    const { getByText, queryByTestId } = renderWithProvider(
      <AssetOverviewContent {...defaultProps} token={tokenWithError} />,
      { state: mockInitialState },
    );

    // Warning should be displayed instead of regular content
    expect(getByText(/were_unable/)).toBeTruthy();
    expect(queryByTestId('price-component')).toBeNull();
  });

  it('renders chart navigation buttons', () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverviewContent {...defaultProps} />,
      { state: mockInitialState },
    );

    expect(getByTestId('chart-nav-1D')).toBeTruthy();
    expect(getByTestId('chart-nav-1W')).toBeTruthy();
    expect(getByTestId('chart-nav-1M')).toBeTruthy();
  });

  it('calls setTimePeriod when chart navigation button is pressed', () => {
    const mockSetTimePeriod = jest.fn();
    const { getByTestId } = renderWithProvider(
      <AssetOverviewContent
        {...defaultProps}
        setTimePeriod={mockSetTimePeriod}
      />,
      { state: mockInitialState },
    );

    fireEvent.press(getByTestId('chart-nav-1W'));
    expect(mockSetTimePeriod).toHaveBeenCalledWith('1w');
  });

  it('calls onBuy when buy button is pressed', () => {
    const mockOnBuy = jest.fn();
    const { getByTestId } = renderWithProvider(
      <AssetOverviewContent {...defaultProps} onBuy={mockOnBuy} />,
      { state: mockInitialState },
    );

    fireEvent.press(getByTestId('buy-button'));
    expect(mockOnBuy).toHaveBeenCalled();
  });

  it('calls onSend when send button is pressed', async () => {
    const mockOnSend = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = renderWithProvider(
      <AssetOverviewContent {...defaultProps} onSend={mockOnSend} />,
      { state: mockInitialState },
    );

    fireEvent.press(getByTestId('send-button'));
    expect(mockOnSend).toHaveBeenCalled();
  });

  it('calls onReceive when receive button is pressed', () => {
    const mockOnReceive = jest.fn();
    const { getByTestId } = renderWithProvider(
      <AssetOverviewContent {...defaultProps} onReceive={mockOnReceive} />,
      { state: mockInitialState },
    );

    fireEvent.press(getByTestId('receive-button'));
    expect(mockOnReceive).toHaveBeenCalled();
  });

  it('calls goToSwaps when swap button is pressed', () => {
    const mockGoToSwaps = jest.fn();
    const { getByTestId } = renderWithProvider(
      <AssetOverviewContent {...defaultProps} goToSwaps={mockGoToSwaps} />,
      { state: mockInitialState },
    );

    fireEvent.press(getByTestId('swap-button'));
    expect(mockGoToSwaps).toHaveBeenCalled();
  });

  it('displays balance information correctly', () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverviewContent {...defaultProps} />,
      { state: mockInitialState },
    );

    expect(getByTestId('main-balance').props.children).toBe('$100.00');
    expect(getByTestId('secondary-balance').props.children).toBe('100 ETH');
  });

  it('does not render balance when balance is null', () => {
    const { queryByTestId } = renderWithProvider(
      <AssetOverviewContent {...defaultProps} balance={undefined} />,
      { state: mockInitialState },
    );

    expect(queryByTestId('balance-component')).toBeNull();
  });

  it('renders MerklRewards when isMerklCampaignClaimingEnabled is true', () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverviewContent
        {...defaultProps}
        isMerklCampaignClaimingEnabled
      />,
      { state: mockInitialState },
    );

    expect(getByTestId('merkl-rewards-section')).toBeTruthy();
  });

  it('does not render MerklRewards when isMerklCampaignClaimingEnabled is false', () => {
    const { queryByTestId } = renderWithProvider(
      <AssetOverviewContent
        {...defaultProps}
        isMerklCampaignClaimingEnabled={false}
      />,
      { state: mockInitialState },
    );

    expect(queryByTestId('merkl-rewards-section')).toBeNull();
  });

  it('displays current price correctly', () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverviewContent {...defaultProps} currentPrice={2500} />,
      { state: mockInitialState },
    );

    expect(getByTestId('current-price').props.children).toBe(2500);
  });

  it('renders with all chart navigation button periods', () => {
    const allPeriods: TimePeriod[] = ['1d', '1w', '1m', '3m', '1y', '3y'];
    const { getByTestId } = renderWithProvider(
      <AssetOverviewContent
        {...defaultProps}
        chartNavigationButtons={allPeriods}
      />,
      { state: mockInitialState },
    );

    allPeriods.forEach((period) => {
      const expectedLabel = period.toUpperCase();
      expect(getByTestId(`chart-nav-${expectedLabel}`)).toBeTruthy();
    });
  });
});

describe('AssetOverviewContent with TokenDetailsV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Enable V2 buttons
    jest
      .requireMock('../../../../selectors/featureFlagController/tokenDetailsV2')
      .selectTokenDetailsV2ButtonsEnabled.mockReturnValue(true);
  });

  afterEach(() => {
    // Reset to default
    jest
      .requireMock('../../../../selectors/featureFlagController/tokenDetailsV2')
      .selectTokenDetailsV2ButtonsEnabled.mockReturnValue(false);
  });

  it('renders TokenDetailsActions when V2 flag is enabled', () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverviewContent {...defaultProps} />,
      { state: mockInitialState },
    );

    expect(getByTestId('token-details-actions')).toBeTruthy();
  });
});

describe('AssetOverviewContent with Perps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render perps section when isPerpsEnabled is false', () => {
    const { queryByTestId } = renderWithProvider(
      <AssetOverviewContent {...defaultProps} isPerpsEnabled={false} />,
      { state: mockInitialState },
    );

    expect(
      queryByTestId(TokenOverviewSelectorsIDs.PERPS_DISCOVERY_BANNER),
    ).toBeNull();
    expect(
      queryByTestId(TokenOverviewSelectorsIDs.PERPS_POSITION_CARD),
    ).toBeNull();
  });
});
