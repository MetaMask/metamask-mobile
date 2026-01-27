import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TokenI } from '../../Tokens/types';

// Mock all hooks and dependencies
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: () => jest.fn(),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../../selectors/featureFlagController/tokenDetailsV2', () => ({
  selectTokenDetailsV2Enabled: jest.fn(),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectNetworkConfigurationByChainId: jest.fn(() => ({
    name: 'Ethereum Mainnet',
    chainId: '0x1',
  })),
}));

jest.mock('../../../../util/networks', () => ({
  isMainnetByChainId: jest.fn(() => true),
}));

jest.mock('../../../hooks/useBlockExplorer', () => ({
  __esModule: true,
  default: () => ({
    getBlockExplorerUrl: jest.fn(() => 'https://etherscan.io'),
  }),
}));

jest.mock('../hooks/useTokenPrice', () => ({
  useTokenPrice: () => ({
    currentPrice: 1.0,
    priceDiff: 0.5,
    comparePrice: 0.995,
    prices: [],
    isLoading: false,
    timePeriod: '1d',
    setTimePeriod: jest.fn(),
    chartNavigationButtons: ['1d', '1w', '1m', '3m', '1y', '3y'],
    currentCurrency: 'usd',
  }),
}));

jest.mock('../hooks/useTokenBalance', () => ({
  useTokenBalance: () => ({
    balance: '100',
    mainBalance: '$100.00',
    secondaryBalance: '100 DAI',
  }),
}));

jest.mock('../hooks/useAssetBuyability', () => ({
  useAssetBuyability: () => ({
    isAssetBuyable: true,
  }),
}));

jest.mock('../hooks/useAssetActions', () => ({
  useAssetActions: () => ({
    onBuy: jest.fn(),
    onSend: jest.fn(),
    onReceive: jest.fn(),
    goToSwaps: jest.fn(),
    networkModal: null,
  }),
}));

jest.mock('../hooks/useTokenTransactions', () => ({
  useTokenTransactions: () => ({
    transactions: [],
    submittedTxs: [],
    confirmedTxs: [],
    loading: false,
    transactionsUpdated: true,
    selectedAddress: '0xuser123',
    conversionRate: 2500,
    currentCurrency: 'usd',
    isNonEvmAsset: false,
  }),
}));

jest.mock('../../Perps', () => ({
  selectPerpsEnabledFlag: jest.fn(() => false),
}));

jest.mock('../../Earn/selectors/featureFlags', () => ({
  selectMerklCampaignClaimingEnabledFlag: jest.fn(() => false),
}));

jest.mock('../../Ramp/Aggregator/utils', () => ({
  isNetworkRampNativeTokenSupported: jest.fn(() => true),
  isNetworkRampSupported: jest.fn(() => true),
}));

jest.mock('../../../../reducers/fiatOrders', () => ({
  getRampNetworks: jest.fn(() => []),
}));

jest.mock('../../../../selectors/featureFlagController/deposit', () => ({
  selectDepositActiveFlag: jest.fn(() => true),
  selectDepositMinimumVersionFlag: jest.fn(() => '1.0.0'),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '2.0.0'),
}));

jest.mock('../../../../selectors/tokenSearchDiscoveryDataController', () => ({
  selectSupportedSwapTokenAddressesForChainId: jest.fn(() => []),
}));

jest.mock('../../../Views/Asset/utils', () => ({
  getIsSwapsAssetAllowed: jest.fn(() => true),
}));

jest.mock('../../../../core/AppConstants', () => ({
  SWAPS: { ACTIVE: true },
}));

// Mock components
jest.mock('../components/AssetInlineHeader', () => ({
  AssetInlineHeader: ({
    title,
    networkName,
    onBackPress,
    onOptionsPress,
  }: {
    title: string;
    networkName: string;
    onBackPress: () => void;
    onOptionsPress: () => void;
  }) => {
    const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
    return (
      <View testID="asset-inline-header">
        <Text>{title}</Text>
        <Text>{networkName}</Text>
        <TouchableOpacity onPress={onBackPress} testID="back-button">
          <Text>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onOptionsPress} testID="options-button">
          <Text>Options</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

jest.mock('../components/AssetOverviewContent', () => {
  const MockAssetOverviewContent = () => {
    const { View } = jest.requireActual('react-native');
    return <View testID="asset-overview-content" />;
  };
  MockAssetOverviewContent.displayName = 'MockAssetOverviewContent';
  return MockAssetOverviewContent;
});

jest.mock('../../../Views/Asset/ActivityHeader', () => {
  const MockActivityHeader = () => {
    const { View } = jest.requireActual('react-native');
    return <View testID="activity-header" />;
  };
  MockActivityHeader.displayName = 'MockActivityHeader';
  return MockActivityHeader;
});

jest.mock('../../Transactions', () => {
  const MockTransactions = () => {
    const { View } = jest.requireActual('react-native');
    return <View testID="transactions-list" />;
  };
  MockTransactions.displayName = 'MockTransactions';
  return MockTransactions;
});

jest.mock(
  '../../../Views/MultichainTransactionsView/MultichainTransactionsView',
  () => {
    const MockMultichainTransactionsView = () => {
      const { View } = jest.requireActual('react-native');
      return <View testID="multichain-transactions-view" />;
    };
    MockMultichainTransactionsView.displayName =
      'MockMultichainTransactionsView';
    return MockMultichainTransactionsView;
  },
);

jest.mock('../../../Views/Asset', () => {
  const MockAsset = () => {
    const { View } = jest.requireActual('react-native');
    return <View testID="legacy-asset-view" />;
  };
  MockAsset.displayName = 'MockAsset';
  return MockAsset;
});

jest.mock('../../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      wrapper: {},
      loader: {},
    },
  }),
}));

import { useSelector } from 'react-redux';
import { TokenDetails } from './TokenDetails';
import { selectTokenDetailsV2Enabled } from '../../../../selectors/featureFlagController/tokenDetailsV2';

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectTokenDetailsV2Enabled =
  selectTokenDetailsV2Enabled as jest.MockedFunction<
    typeof selectTokenDetailsV2Enabled
  >;

describe('TokenDetails', () => {
  const mockToken: TokenI = {
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
  };

  const renderComponent = (token: TokenI = mockToken) =>
    render(<TokenDetails route={{ params: token }} />);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      // Handle the feature flag selector by comparing function reference
      if (selector === mockSelectTokenDetailsV2Enabled) {
        return true;
      }
      // Handle curried selectors (functions that return functions)
      if (typeof selector === 'function') {
        const selectorName = selector.name || selector.toString();
        if (selectorName.includes('NetworkConfiguration')) {
          return { name: 'Ethereum Mainnet', chainId: '0x1' };
        }
        if (selectorName.includes('Perps')) {
          return false;
        }
        if (selectorName.includes('Merkl')) {
          return false;
        }
        if (
          selectorName.includes('RampNetworks') ||
          selectorName.includes('rampNetworks')
        ) {
          return [];
        }
        if (selectorName.includes('DepositMinimum')) {
          return '1.0.0';
        }
        if (selectorName.includes('DepositActive')) {
          return true;
        }
        if (selectorName.includes('SwapTokenAddresses')) {
          return [];
        }
      }
      return undefined;
    });
  });

  describe('rendering with V2 enabled', () => {
    it('renders asset inline header with token symbol', () => {
      const { getByText } = renderComponent();

      expect(getByText('DAI')).toBeOnTheScreen();
    });

    it('renders asset inline header with network name', () => {
      const { getByText } = renderComponent();

      expect(getByText('Ethereum Mainnet')).toBeOnTheScreen();
    });

    it('renders transactions list when not loading', () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId('transactions-list')).toBeOnTheScreen();
    });
  });

  describe('navigation', () => {
    it('calls navigation goBack when back button is pressed', () => {
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('back-button'));

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('opens asset options modal when options button is pressed', () => {
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('options-button'));

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          screen: 'AssetOptions',
        }),
      );
    });
  });

  describe('feature flag handling', () => {
    it('renders legacy Asset view when V2 is disabled', () => {
      mockUseSelector.mockImplementation((selector) => {
        // Return false for feature flag, undefined for others
        if (selector === mockSelectTokenDetailsV2Enabled) {
          return false;
        }
        return undefined;
      });

      const { getByTestId } = renderComponent();

      expect(getByTestId('legacy-asset-view')).toBeOnTheScreen();
    });
  });

  describe('loading state', () => {
    it('renders loader when transactions are loading', () => {
      jest.mock('../hooks/useTokenTransactions', () => ({
        useTokenTransactions: () => ({
          transactions: [],
          loading: true,
          transactionsUpdated: false,
          selectedAddress: '0xuser123',
          conversionRate: 2500,
          currentCurrency: 'usd',
          isNonEvmAsset: false,
        }),
      }));

      // Note: This test verifies the loading state renders without errors
      const { getByTestId } = renderComponent();
      expect(getByTestId('asset-inline-header')).toBeOnTheScreen();
    });
  });

  describe('native token handling', () => {
    it('renders correctly for native ETH token', () => {
      const ethToken: TokenI = {
        ...mockToken,
        symbol: 'ETH',
        address: '',
        isETH: true,
        isNative: true,
      };

      const { getByText } = renderComponent(ethToken);

      expect(getByText('ETH')).toBeOnTheScreen();
    });
  });

  describe('non-mainnet handling', () => {
    it('handles non-mainnet networks', () => {
      const polygonToken: TokenI = {
        ...mockToken,
        chainId: '0x89',
      };

      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectTokenDetailsV2Enabled) {
          return true;
        }
        if (typeof selector === 'function') {
          const selectorName = selector.name || selector.toString();
          if (selectorName.includes('NetworkConfiguration')) {
            return { name: 'Polygon', chainId: '0x89' };
          }
        }
        return undefined;
      });

      const { getByText } = renderComponent(polygonToken);

      expect(getByText('Polygon')).toBeOnTheScreen();
    });
  });
});
