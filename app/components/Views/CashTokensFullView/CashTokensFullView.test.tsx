import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import CashTokensFullView from './CashTokensFullView';
import { useMerklBonusClaim } from '../../UI/Earn/components/MerklRewards/hooks/useMerklBonusClaim';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

const mockUseMusdBalance = jest.fn(() => ({ hasMusdBalanceOnAnyChain: false }));
jest.mock('../../UI/Earn/hooks/useMusdBalance', () => ({
  useMusdBalance: () => mockUseMusdBalance(),
}));

// Let real CashGetMusdEmptyState render; mock its dependencies
jest.mock('../../../core/NavigationService', () => ({
  __esModule: true,
  default: { navigation: { navigate: jest.fn() } },
}));
jest.mock('../../UI/Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({ goToBuy: jest.fn() }),
}));
jest.mock('../../UI/Earn/hooks/useMusdConversion', () => ({
  useMusdConversion: () => ({
    initiateCustomConversion: jest.fn(),
    initiateMaxConversion: jest.fn(),
    clearError: jest.fn(),
    error: null,
    hasSeenConversionEducationScreen: true,
  }),
}));
jest.mock('../../UI/Earn/hooks/useMusdConversionTokens', () => ({
  useMusdConversionTokens: () => ({ tokens: [] }),
}));
jest.mock('../../UI/Bridge/hooks/useSwapBridgeNavigation', () => ({
  useSwapBridgeNavigation: () => ({ goToSwaps: jest.fn() }),
  SwapBridgeNavigationLocation: { MainView: 'MainView' },
}));
jest.mock(
  '../../UI/Money/components/MoneyConvertStablecoins/MoneyConvertStablecoins',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: (props: Record<string, unknown>) => (
        <View testID="money-convert-stablecoins-container" {...props} />
      ),
    };
  },
);
jest.mock(
  '../../UI/Earn/components/AssetOverviewClaimBonus/AssetOverviewClaimBonus',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () => <View testID="asset-overview-claim-bonus" />,
    };
  },
);
jest.mock('../../UI/Earn/hooks/useMusdConversionFlowData', () => ({
  useMusdConversionFlowData: () => ({
    hasConvertibleTokens: true,
    isMusdBuyableOnAnyChain: true,
    getPaymentTokenForSelectedNetwork: () => ({
      address: '0xabc',
      chainId: '0x1',
    }),
  }),
}));

const mockClaimRewards = jest.fn();

jest.mock(
  '../../UI/Earn/components/MerklRewards/hooks/useMerklBonusClaim',
  () => ({
    useMerklBonusClaim: jest.fn(),
  }),
);

const mockUseMerklBonusClaim = jest.mocked(useMerklBonusClaim);
jest.mock('../../../core/Engine', () => ({
  context: {},
}));
jest.mock('../../Views/confirmations/hooks/useNetworkName', () => ({
  useNetworkName: () => 'Ethereum Mainnet',
}));
jest.mock('../../UI/Earn/selectors/featureFlags', () => ({
  selectMusdQuickConvertEnabledFlag: jest.fn(() => false),
}));
jest.mock('../../UI/Tokens', () => {
  const { createElement } = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  const MockTokens = ({
    isFullView,
    showOnlyMusd,
  }: {
    isFullView?: boolean;
    showOnlyMusd?: boolean;
  }) =>
    createElement(
      View,
      { testID: 'tokens-cash-view' },
      createElement(
        Text,
        { testID: 'tokens-props' },
        `isFullView=${isFullView} showOnlyMusd=${showOnlyMusd}`,
      ),
    );
  return { __esModule: true, default: MockTokens };
});

describe('CashTokensFullView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMusdBalance.mockReturnValue({ hasMusdBalanceOnAnyChain: false });
    mockUseMerklBonusClaim.mockReturnValue({
      claimableReward: null,
      lifetimeBonusClaimed: null,
      hasPendingClaim: false,
      isClaiming: false,
      error: null,
      claimRewards: mockClaimRewards,
    });
  });

  it('renders mUSD title', () => {
    renderWithProvider(<CashTokensFullView />);
    expect(screen.getByText('Money')).toBeOnTheScreen();
  });

  it('renders Get mUSD empty state when user has no mUSD', () => {
    mockUseMusdBalance.mockReturnValue({ hasMusdBalanceOnAnyChain: false });
    renderWithProvider(<CashTokensFullView />);
    expect(screen.getByTestId('cash-get-musd-empty-state')).toBeOnTheScreen();
    expect(screen.getByText('Get mUSD')).toBeOnTheScreen();
  });

  it('renders Tokens with isFullView and showOnlyMusd when user has mUSD', () => {
    mockUseMusdBalance.mockReturnValue({ hasMusdBalanceOnAnyChain: true });
    renderWithProvider(<CashTokensFullView />);
    expect(screen.getByTestId('tokens-cash-view')).toBeOnTheScreen();
    expect(
      screen.getByText('isFullView=true showOnlyMusd=true'),
    ).toBeOnTheScreen();
  });

  it('navigates back when back button is pressed', () => {
    renderWithProvider(<CashTokensFullView />);
    fireEvent.press(screen.getByTestId('back-button'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
