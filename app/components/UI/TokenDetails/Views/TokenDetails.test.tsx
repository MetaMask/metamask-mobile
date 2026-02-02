import React from 'react';
import { render } from '@testing-library/react-native';
import { TokenDetails } from './TokenDetails';
import { TokenI } from '../../Tokens/types';
import { selectTokenDetailsV2Enabled } from '../../../../selectors/featureFlagController/tokenDetailsV2';
import { selectNetworkConfigurationByChainId } from '../../../../selectors/networkController';
import { selectPerpsEnabledFlag } from '../../Perps';
import { selectMerklCampaignClaimingEnabledFlag } from '../../Earn/selectors/featureFlags';
import { getRampNetworks } from '../../../../reducers/fiatOrders';
import {
  selectDepositActiveFlag,
  selectDepositMinimumVersionFlag,
} from '../../../../selectors/featureFlagController/deposit';

// Mock feature flags
const mockIsTokenDetailsRevampedEnabled = jest.fn(() => true);
jest.mock('../../../../selectors/featureFlagController/tokenDetailsV2', () => ({
  selectTokenDetailsV2Enabled: jest.fn(() => true),
  isTokenDetailsRevampedEnabled: () => mockIsTokenDetailsRevampedEnabled(),
}));

// Mock react-redux with proper selector handling
const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (state: unknown) => unknown) =>
    mockUseSelector(selector),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

// Mock safe area
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// Mock useStyles
jest.mock('../../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      wrapper: {},
      loader: {},
      bottomSheetFooterWrapper: {},
      bottomSheetFooter: {},
    },
  }),
}));

// Mock trace
jest.mock('../../../../util/trace', () => ({
  TraceName: { AssetDetails: 'AssetDetails' },
  endTrace: jest.fn(),
}));

// Mock network utils
jest.mock('../../../../util/networks', () => ({
  isMainnetByChainId: jest.fn(() => true),
}));

// Mock AppConstants
jest.mock('../../../../core/AppConstants', () => ({
  SWAPS: { ACTIVE: true },
}));

// Mock getIsSwapsAssetAllowed
jest.mock('../../../Views/Asset/utils', () => ({
  getIsSwapsAssetAllowed: jest.fn(() => true),
}));

// Mock useBlockExplorer
jest.mock('../../../hooks/useBlockExplorer', () => ({
  __esModule: true,
  default: () => ({
    getBlockExplorerUrl: jest.fn(() => 'https://etherscan.io'),
  }),
}));

// Mock all the hooks used by TokenDetails
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

jest.mock('../hooks/useTokenBalance', () => ({
  useTokenBalance: () => ({
    balance: '1.5',
    fiatBalance: '$150.00',
    tokenFormattedBalance: '1.5 ETH',
  }),
}));

jest.mock('../hooks/useTokenBuyability', () => ({
  useTokenBuyability: () => true,
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

jest.mock('../hooks/useTokenTransactions', () => ({
  useTokenTransactions: () => ({
    transactions: [],
    submittedTxs: [],
    confirmedTxs: [],
    loading: false,
    transactionsUpdated: true,
    selectedAddress: '0x1234',
    conversionRate: 1,
    currentCurrency: 'USD',
    isNonEvmAsset: false,
  }),
}));

// Mock child components
jest.mock('../components/TokenDetailsInlineHeader', () => ({
  TokenDetailsInlineHeader: () => null,
}));

jest.mock('../components/AssetOverviewContent', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../Views/Asset/ActivityHeader', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../Transactions', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock(
  '../../../Views/MultichainTransactionsView/MultichainTransactionsView',
  () => ({
    __esModule: true,
    default: () => null,
  }),
);

jest.mock('../../../Views/Asset', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock BottomSheetFooter to inspect button props
jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheetFooter',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { View, Text } = require('react-native');

    return {
      __esModule: true,
      default: ({
        buttonPropsArray,
      }: {
        buttonPropsArray: { label: string }[];
      }) => (
        <View testID="bottom-sheet-footer">
          {buttonPropsArray.map((btn: { label: string }, index: number) => (
            <Text key={index} testID={`button-${btn.label.toLowerCase()}`}>
              {btn.label}
            </Text>
          ))}
        </View>
      ),
      ButtonsAlignment: { Horizontal: 'horizontal', Vertical: 'vertical' },
    };
  },
);

// Mock selectors
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

describe('TokenDetails', () => {
  const defaultToken: TokenI = {
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    chainId: '0x1',
    symbol: 'DAI',
    decimals: 18,
    name: 'Dai Stablecoin',
    image: 'https://example.com/dai.png',
    isETH: false,
    isNative: false,
    balance: '10.5',
  } as TokenI;

  const defaultProps = {
    route: {
      params: defaultToken,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTokenDetailsRevampedEnabled.mockReturnValue(true);

    // Setup default selector returns
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectTokenDetailsV2Enabled) return true;
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

  describe('Buy/Sell sticky buttons', () => {
    it('shows sticky buttons when isTokenDetailsRevampedEnabled is true', () => {
      mockIsTokenDetailsRevampedEnabled.mockReturnValue(true);

      const { getByTestId } = render(<TokenDetails {...defaultProps} />);

      expect(getByTestId('bottom-sheet-footer')).toBeOnTheScreen();
      expect(getByTestId('button-buy')).toBeOnTheScreen();
    });

    it('does not show sticky buttons when isTokenDetailsRevampedEnabled is false', () => {
      mockIsTokenDetailsRevampedEnabled.mockReturnValue(false);

      const { queryByTestId } = render(<TokenDetails {...defaultProps} />);

      expect(queryByTestId('bottom-sheet-footer')).toBeNull();
    });

    it('shows both Buy and Sell buttons when token has balance > 0', () => {
      const tokenWithBalance = {
        ...defaultToken,
        balance: '10.5',
      };

      const { getByTestId } = render(
        <TokenDetails route={{ params: tokenWithBalance }} />,
      );

      expect(getByTestId('button-buy')).toBeOnTheScreen();
      expect(getByTestId('button-sell')).toBeOnTheScreen();
    });

    it('shows only Buy button when token has no balance', () => {
      const tokenWithNoBalance = {
        ...defaultToken,
        balance: '0',
      };

      const { getByTestId, queryByTestId } = render(
        <TokenDetails route={{ params: tokenWithNoBalance }} />,
      );

      expect(getByTestId('button-buy')).toBeOnTheScreen();
      expect(queryByTestId('button-sell')).toBeNull();
    });

    it('shows only Buy button when token balance is undefined', () => {
      const tokenWithUndefinedBalance = {
        ...defaultToken,
        balance: undefined,
      } as unknown as TokenI;

      const { getByTestId, queryByTestId } = render(
        <TokenDetails route={{ params: tokenWithUndefinedBalance }} />,
      );

      expect(getByTestId('button-buy')).toBeOnTheScreen();
      expect(queryByTestId('button-sell')).toBeNull();
    });
  });
});
