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

const mockUseTokenBalance = jest.fn();
jest.mock('../hooks/useTokenBalance', () => ({
  useTokenBalance: () => mockUseTokenBalance(),
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

    // Setup default useTokenBalance mock
    mockUseTokenBalance.mockReturnValue({
      balance: '1.5',
      fiatBalance: '$150.00',
      tokenFormattedBalance: '1.5 ETH',
    });

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

      const { getByTestId, getByText } = render(
        <TokenDetails {...defaultProps} />,
      );

      expect(getByTestId('bottomsheetfooter')).toBeOnTheScreen();
      expect(getByText('Buy')).toBeOnTheScreen();
    });

    it('does not show sticky buttons when isTokenDetailsRevampedEnabled is false', () => {
      mockIsTokenDetailsRevampedEnabled.mockReturnValue(false);

      const { queryByTestId } = render(<TokenDetails {...defaultProps} />);

      expect(queryByTestId('bottomsheetfooter')).toBeNull();
    });

    it('shows both Buy and Sell buttons when token has balance > 0', () => {
      mockUseTokenBalance.mockReturnValue({
        balance: '10.5',
        fiatBalance: '$1050.00',
        tokenFormattedBalance: '10.5 DAI',
      });

      const { getByText } = render(<TokenDetails {...defaultProps} />);

      expect(getByText('Buy')).toBeOnTheScreen();
      expect(getByText('Sell')).toBeOnTheScreen();
    });

    it('shows only Buy button when token has no balance', () => {
      mockUseTokenBalance.mockReturnValue({
        balance: '0',
        fiatBalance: '$0.00',
        tokenFormattedBalance: '0 DAI',
      });

      const { getByText, queryByText } = render(
        <TokenDetails {...defaultProps} />,
      );

      expect(getByText('Buy')).toBeOnTheScreen();
      expect(queryByText('Sell')).toBeNull();
    });

    it('shows only Buy button when token balance is undefined', () => {
      mockUseTokenBalance.mockReturnValue({
        balance: undefined,
        fiatBalance: undefined,
        tokenFormattedBalance: undefined,
      });

      const { getByText, queryByText } = render(
        <TokenDetails {...defaultProps} />,
      );

      expect(getByText('Buy')).toBeOnTheScreen();
      expect(queryByText('Sell')).toBeNull();
    });
  });
});
