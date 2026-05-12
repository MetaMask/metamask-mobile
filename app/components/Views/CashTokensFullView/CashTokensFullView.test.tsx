import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import CashTokensFullView from './CashTokensFullView';
import { useMerklBonusClaim } from '../../UI/Earn/components/MerklRewards/hooks/useMerklBonusClaim';
import { selectMoneyHubEnabledFlag } from '../../UI/Money/selectors/featureFlags';
import { CashTokensFullViewTestIds } from './CashTokensFullView.testIds';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
}));

const mockUseMusdBalance = jest.fn(() => ({
  hasMusdBalanceOnAnyChain: false,
  tokenBalanceByChain: {},
}));
jest.mock('../../UI/Earn/hooks/useMusdBalance', () => ({
  useMusdBalance: () => mockUseMusdBalance(),
}));

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUseMusdConversionTokens = jest.fn<{ tokens: any[] }, []>(() => ({
  tokens: [],
}));
jest.mock('../../UI/Earn/hooks/useMusdConversionTokens', () => ({
  useMusdConversionTokens: () => mockUseMusdConversionTokens(),
  tokenFiatValue: () => 0,
}));
jest.mock('../../UI/Bridge/hooks/useSwapBridgeNavigation', () => ({
  useSwapBridgeNavigation: () => ({ goToSwaps: jest.fn() }),
  SwapBridgeNavigationLocation: { MainView: 'MainView' },
}));
jest.mock(
  '../../UI/Money/components/MoneyConvertStablecoins/MoneyConvertStablecoins',
  () => {
    const { View, Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ location }: { location: string }) => (
        <View testID="money-convert-stablecoins-container">
          <Text testID="money-convert-stablecoins-location">{location}</Text>
        </View>
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
jest.mock('../../UI/Money/selectors/featureFlags', () => ({
  selectMoneyHubEnabledFlag: jest.fn(() => false),
}));
jest.mock('../../UI/Money/components/MoneyMusdEmptyBalanceRow', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ onPress }: { onPress?: () => void }) => (
      <Pressable testID="money-musd-empty-balance-row" onPress={onPress}>
        <Text>MetaMask USD empty</Text>
      </Pressable>
    ),
  };
});
jest.mock('./useCashTokensRefresh', () => ({
  useCashTokensRefresh: () => ({ refreshing: false, onRefresh: jest.fn() }),
}));
jest.mock('../../UI/Tokens', () => {
  const { createElement } = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  const MockTokens = ({
    isFullView,
    showOnlyMusd,
    listHeaderComponent,
  }: {
    isFullView?: boolean;
    showOnlyMusd?: boolean;
    listHeaderComponent?: React.ReactElement;
  }) =>
    createElement(
      View,
      { testID: 'tokens-cash-view' },
      createElement(
        Text,
        { testID: 'tokens-props' },
        `isFullView=${isFullView} showOnlyMusd=${showOnlyMusd}`,
      ),
      listHeaderComponent,
    );
  return { __esModule: true, default: MockTokens };
});

jest.mock('../Homepage/Sections/Cash/CashGetMusdEmptyState', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => (
      <View testID="cash-get-musd-empty-state">
        <Text>Get mUSD</Text>
      </View>
    ),
  };
});

jest.mock('../Homepage/components/SectionRow/SectionRow', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

describe('CashTokensFullView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation((cb) => {
        if (typeof cb === 'function') cb();
        const donePromise = Promise.resolve();
        return {
          cancel: jest.fn(),
          done: (...args: Parameters<typeof donePromise.then>) =>
            donePromise.then(...args),
          then: donePromise.then.bind(donePromise),
        } as unknown as ReturnType<
          typeof InteractionManager.runAfterInteractions
        >;
      });
    mockUseMusdBalance.mockReturnValue({
      hasMusdBalanceOnAnyChain: false,
      tokenBalanceByChain: {},
    });
    mockUseMerklBonusClaim.mockReturnValue({
      claimableReward: null,
      lifetimeBonusClaimed: null,
      hasPendingClaim: false,
      isClaiming: false,
      error: null,
      claimRewards: mockClaimRewards,
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders mUSD title', () => {
    renderWithProvider(<CashTokensFullView />);
    expect(screen.getByText('Money')).toBeOnTheScreen();
  });

  it('renders Get mUSD empty state when user has no mUSD', () => {
    mockUseMusdBalance.mockReturnValue({
      hasMusdBalanceOnAnyChain: false,
      tokenBalanceByChain: {},
    });
    renderWithProvider(<CashTokensFullView />);
    expect(screen.getByTestId('cash-get-musd-empty-state')).toBeOnTheScreen();
    expect(screen.getByText('Get mUSD')).toBeOnTheScreen();
  });

  it('renders Tokens with isFullView and showOnlyMusd when user has mUSD', async () => {
    mockUseMusdBalance.mockReturnValue({
      hasMusdBalanceOnAnyChain: true,
      tokenBalanceByChain: { '0x1': '1000' },
    });
    renderWithProvider(<CashTokensFullView />);
    await waitFor(() => {
      expect(screen.getByTestId('tokens-cash-view')).toBeOnTheScreen();
    });
    expect(
      screen.getByText('isFullView=true showOnlyMusd=true'),
    ).toBeOnTheScreen();
  });

  it('navigates back when back button is pressed', () => {
    renderWithProvider(<CashTokensFullView />);
    fireEvent.press(screen.getByTestId('cash-tokens-full-view-back-button'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  describe('Money Hub enabled', () => {
    beforeEach(() => {
      (selectMoneyHubEnabledFlag as unknown as jest.Mock).mockReturnValue(true);
      mockUseMusdBalance.mockReturnValue({
        hasMusdBalanceOnAnyChain: false,
        tokenBalanceByChain: {},
      });
    });

    it('renders the empty Money Hub layout (heading, mUSD row, bonus + convert)', () => {
      renderWithProvider(<CashTokensFullView />);
      expect(
        screen.getByTestId(CashTokensFullViewTestIds.HEADING),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('money-musd-empty-balance-row'),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId('cash-get-musd-empty-state'),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId('asset-overview-claim-bonus'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('money-convert-stablecoins-container'),
      ).toBeOnTheScreen();
    });

    it('renders Your balance heading when user has mUSD', async () => {
      mockUseMusdBalance.mockReturnValue({
        hasMusdBalanceOnAnyChain: true,
        tokenBalanceByChain: { '0x1': '1000' },
      });
      renderWithProvider(<CashTokensFullView />);
      await waitFor(() => {
        expect(
          screen.getByTestId(CashTokensFullViewTestIds.HEADING),
        ).toBeOnTheScreen();
      });
    });

    it('press handlers wire to navigation and pass money_hub location to convert section', () => {
      renderWithProvider(<CashTokensFullView />);
      fireEvent.press(screen.getByTestId('money-musd-empty-balance-row'));
      expect(mockNavigate).toHaveBeenCalledWith(
        'Asset',
        expect.objectContaining({ symbol: 'mUSD' }),
      );
      expect(
        screen.getByTestId('money-convert-stablecoins-location'),
      ).toHaveTextContent('money_hub');
    });

    it('renders Swap/Buy footer with no stablecoins; switches to Convert when stablecoins exist', () => {
      const { rerender } = renderWithProvider(<CashTokensFullView />);
      expect(
        screen.getByTestId(CashTokensFullViewTestIds.SWAP_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(CashTokensFullViewTestIds.BUY_BUTTON),
      ).toBeOnTheScreen();
      expect(() => {
        fireEvent.press(
          screen.getByTestId(CashTokensFullViewTestIds.SWAP_BUTTON),
        );
        fireEvent.press(
          screen.getByTestId(CashTokensFullViewTestIds.BUY_BUTTON),
        );
      }).not.toThrow();

      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [
          {
            address: '0xabc',
            chainId: '0x1',
            symbol: 'USDC',
            fiat: { balance: 100 },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        ],
      });
      rerender(<CashTokensFullView />);
      expect(
        screen.queryByTestId(CashTokensFullViewTestIds.SWAP_BUTTON),
      ).not.toBeOnTheScreen();
      expect(() =>
        fireEvent.press(screen.getByText('Convert to mUSD')),
      ).not.toThrow();
    });
  });
});
