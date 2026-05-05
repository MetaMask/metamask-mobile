import React from 'react';
import type { ReactTestInstance } from 'react-test-renderer';
import { Animated } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyHomeView from './MoneyHomeView';
import { MoneyHomeViewTestIds } from './MoneyHomeView.testIds';
import { MoneyHeaderTestIds } from '../../components/MoneyHeader/MoneyHeader.testIds';
import { MoneyBalanceSummaryTestIds } from '../../components/MoneyBalanceSummary/MoneyBalanceSummary.testIds';
import { MoneyActionButtonRowTestIds } from '../../components/MoneyActionButtonRow/MoneyActionButtonRow.testIds';
import { MoneyEarningsTestIds } from '../../components/MoneyEarnings/MoneyEarnings.testIds';
import { MoneyOnboardingCardTestIds } from '../../components/MoneyOnboardingCard/MoneyOnboardingCard.testIds';
import { MoneyHowItWorksTestIds } from '../../components/MoneyHowItWorks/MoneyHowItWorks.testIds';
import { MoneyPotentialEarningsTestIds } from '../../components/MoneyPotentialEarnings/MoneyPotentialEarnings.testIds';
import { MoneyMetaMaskCardTestIds } from '../../components/MoneyMetaMaskCard/MoneyMetaMaskCard.testIds';
import { MoneyWhatYouGetTestIds } from '../../components/MoneyWhatYouGet/MoneyWhatYouGet.testIds';
import { MoneyFooterTestIds } from '../../components/MoneyFooter/MoneyFooter.testIds';
import { MoneyActivityListTestIds } from '../../components/MoneyActivityList/MoneyActivityList.testIds';
import { MoneyCondensedInfoCardsTestIds } from '../../components/MoneyCondensedInfoCards/MoneyCondensedInfoCards.testIds';
import { MoneyMusdTokenRowTestIds } from '../../components/MoneyMusdTokenRow/MoneyMusdTokenRow.testIds';
import { MoneySectionHeaderTestIds } from '../../components/MoneySectionHeader/MoneySectionHeader.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { useMoneyAccountTransactions } from '../../hooks/useMoneyAccountTransactions';
import { strings } from '../../../../../../locales/i18n';
import MOCK_MONEY_TRANSACTIONS from '../../constants/mockActivityData';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { selectIsCardholder } from '../../../../../selectors/cardController';
import { moneyFormatFiat } from '../../utils/moneyFormatFiat';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockMoneyFormatFiat = moneyFormatFiat as jest.MockedFunction<
  typeof moneyFormatFiat
>;

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: mockNavigate,
    }),
  };
});

const mockConversionTokens = [
  {
    name: 'USD Coin',
    symbol: 'USDC',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    chainId: '0x1',
    decimals: 6,
    balanceInSelectedCurrency: '$5,000.00',
    fiat: { balance: 5000 },
  },
];

jest.mock('../../../Earn/hooks/useMusdConversionTokens', () => ({
  useMusdConversionTokens: () => ({ tokens: mockConversionTokens }),
  STABLECOIN_SYMBOLS: new Set(['USDC', 'USDT', 'DAI']),
  tokenFiatValue: (token: { fiat?: { balance?: number } }) =>
    token?.fiat?.balance ?? 0,
}));

jest.mock('../../hooks/useMoneyAccountTransactions', () => ({
  useMoneyAccountTransactions: jest.fn(),
}));

jest.mock('../../hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../Earn/hooks/useMusdConversion', () => ({
  useMusdConversion: () => ({
    initiateCustomConversion: jest.fn(),
  }),
}));

jest.mock('../../utils/moneyFormatFiat', () => ({
  moneyFormatFiat: jest.fn(() => '$0.12'),
}));

jest.mock('../../../../../selectors/cardController', () => ({
  ...jest.requireActual('../../../../../selectors/cardController'),
  selectIsCardholder: jest.fn(),
}));

const mockSelectIsCardholder = jest.mocked(selectIsCardholder);

const mockUseMoneyAccountTransactions = jest.mocked(
  useMoneyAccountTransactions,
);

const mockUseMoneyAccountBalance = jest.mocked(useMoneyAccountBalance);

jest.mock(
  '../../../../UI/Assets/components/AssetLogo/AssetLogo',
  () => 'AssetLogo',
);
jest.mock(
  '../../../../../component-library/components/Badges/BadgeWrapper',
  () => ({
    __esModule: true,
    default: 'BadgeWrapper',
    BadgePosition: { BottomRight: 'BottomRight' },
  }),
);
jest.mock('../../../../../component-library/components/Badges/Badge', () => ({
  __esModule: true,
  default: 'Badge',
  BadgeVariant: { Network: 'Network' },
}));

jest.mock('../../components/MoneyActivityItem/MoneyActivityItem', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ tx }: { tx: { id: string } }) => (
      <View testID={`money-activity-item-${tx.id}`}>
        <Text>{tx.id}</Text>
      </View>
    ),
  };
});
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('@react-native-masked-view/masked-view', () => 'MaskedView');
jest.mock('../../../../UI/AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn(() => null),
}));

const educationSeenState = {
  user: { musdConversionEducationSeen: true },
};

const educationNotSeenState = {
  user: { musdConversionEducationSeen: false },
};

describe('MoneyHomeView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.alert = jest.fn();

    mockSelectIsCardholder.mockReturnValue(false);

    mockUseMoneyAccountBalance.mockReturnValue({
      totalFiatFormatted: '$3.00',
      musdFiatFormatted: '$1.00',
      musdSHFvdFiatFormatted: '$2.00',
      totalFiatRaw: '3',
      tokenTotal: undefined,
      isAggregatedBalanceLoading: false,
      apyDecimal: 0.05,
      apyPercent: 5,
      apyPercentFormatted: '5%',
      vaultApyQuery: {
        data: { apy: 0.05, timestamp: '2026-01-01T00:00:00Z' },
        isLoading: false,
      },
      musdBalanceQuery: {
        data: { balance: '1000000' },
        isLoading: false,
      },
      musdEquivalentBalanceQuery: {
        data: {
          musdEquivalentValue: '2000000',
          musdSHFvdBalance: '2000000',
          exchangeRate: '1000000',
        },
        isLoading: false,
      },
    } as ReturnType<typeof useMoneyAccountBalance>);

    // Activity list renders when there are at least 10 transactions; pad the
    // mock set so the activity-related assertions below find the View all button.
    const paddedTransactions = Array.from({ length: 10 }, (_, index) => ({
      ...MOCK_MONEY_TRANSACTIONS[index % MOCK_MONEY_TRANSACTIONS.length],
      id: `padded-${index}`,
    }));
    mockUseMoneyAccountTransactions.mockReturnValue({
      allTransactions: paddedTransactions,
      deposits: [],
      transfers: [],
      submittedTransactions: [],
      moneyAddress: '0x0000000000000000000000000000000000000001',
    });
  });

  it('renders the main container', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
      state: educationSeenState,
    });

    expect(getByTestId(MoneyHomeViewTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('renders the scroll view', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
      state: educationSeenState,
    });

    expect(getByTestId(MoneyHomeViewTestIds.SCROLL_VIEW)).toBeOnTheScreen();
  });

  it('renders the header section', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
      state: educationSeenState,
    });

    expect(getByTestId(MoneyHeaderTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('renders the balance summary section', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
      state: educationSeenState,
    });

    expect(getByTestId(MoneyBalanceSummaryTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('renders the action button row', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
      state: educationSeenState,
    });

    expect(
      getByTestId(MoneyActionButtonRowTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the onboarding card when education has not been seen', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
      state: educationNotSeenState,
    });

    expect(getByTestId(MoneyOnboardingCardTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('does not render the onboarding card when education has been seen', () => {
    const { queryByTestId } = renderWithProvider(<MoneyHomeView />, {
      state: educationSeenState,
    });

    expect(
      queryByTestId(MoneyOnboardingCardTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('renders the earnings section', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
      state: educationSeenState,
    });

    expect(getByTestId(MoneyEarningsTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('hides the how it works section in filled state', () => {
    const { queryByTestId } = renderWithProvider(<MoneyHomeView />, {
      state: educationSeenState,
    });
    expect(
      queryByTestId(MoneyHowItWorksTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('renders the potential earnings section when tokens exist', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
      state: educationSeenState,
    });

    expect(
      getByTestId(MoneyPotentialEarningsTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the MetaMask Card section', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
      state: educationSeenState,
    });

    expect(getByTestId(MoneyMetaMaskCardTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('hides the what you get section in filled state', () => {
    const { queryByTestId } = renderWithProvider(<MoneyHomeView />, {
      state: educationSeenState,
    });
    expect(
      queryByTestId(MoneyWhatYouGetTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('renders the footer', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
      state: educationSeenState,
    });

    expect(getByTestId(MoneyFooterTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('pressing the back button calls navigation.goBack', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
      state: educationSeenState,
    });

    fireEvent.press(getByTestId(MoneyHeaderTestIds.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('navigates to the Money activity screen when View all is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
      state: educationSeenState,
    });

    fireEvent.press(getByTestId(MoneyActivityListTestIds.VIEW_ALL_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ACTIVITY);
  });

  it.each([
    ['action row Add', MoneyActionButtonRowTestIds.ADD_BUTTON],
    ['footer Add money', MoneyFooterTestIds.ADD_MONEY_BUTTON],
  ])('opens the Add money sheet from the %s button', (_label, testId) => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
      state: educationSeenState,
    });

    fireEvent.press(getByTestId(testId));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
    });
  });

  it('opens the More sheet when menu button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
      state: educationSeenState,
    });

    fireEvent.press(getByTestId(MoneyHeaderTestIds.MENU_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.MORE_SHEET,
    });
  });

  it('opens the Transfer sheet when Transfer button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
      state: educationSeenState,
    });

    fireEvent.press(getByTestId(MoneyActionButtonRowTestIds.TRANSFER_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.TRANSFER_MONEY_SHEET,
    });
  });

  it('navigates to Card root when Card button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
      state: educationSeenState,
    });

    fireEvent.press(getByTestId(MoneyActionButtonRowTestIds.CARD_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT);
  });

  it('opens the APY info sheet when the APY info button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
      state: educationSeenState,
    });

    fireEvent.press(getByTestId(MoneyBalanceSummaryTestIds.APY_INFO_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.APY_INFO_SHEET,
      params: { apy: 5 },
    });
  });

  it('opens the earnings info sheet when the earnings info button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
      state: educationSeenState,
    });

    fireEvent.press(getByTestId(MoneySectionHeaderTestIds.INFO_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.EARNINGS_INFO_SHEET,
      params: { apy: 5 },
    });
  });

  describe('projected earnings', () => {
    it('passes the formatted projected earnings to MoneyEarnings', () => {
      mockMoneyFormatFiat.mockReturnValue('$0.12');

      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationSeenState,
      });

      expect(
        getByTestId(MoneyEarningsTestIds.PROJECTED_VALUE),
      ).toHaveTextContent('$0.12');
    });

    it('displays the zero-formatted value for projected earnings when totalFiatRaw is absent', () => {
      mockMoneyFormatFiat.mockReturnValue('$0.00');
      mockUseMoneyAccountBalance.mockReturnValue({
        totalFiatFormatted: undefined,
        musdFiatFormatted: undefined,
        musdSHFvdFiatFormatted: undefined,
        totalFiatRaw: undefined,
        tokenTotal: undefined,
        isAggregatedBalanceLoading: false,
        apyDecimal: 0.05,
        apyPercent: 5,
        apyPercentFormatted: '5%',
        vaultApyQuery: { data: { apy: 0.05 }, isLoading: false },
        musdBalanceQuery: { data: undefined, isLoading: false },
        musdEquivalentBalanceQuery: { data: undefined, isLoading: false },
      } as ReturnType<typeof useMoneyAccountBalance>);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationSeenState,
      });

      expect(
        getByTestId(MoneyEarningsTestIds.PROJECTED_VALUE),
      ).toHaveTextContent('$0.00');
    });
  });

  describe('milestone state (1-9 transactions)', () => {
    beforeEach(() => {
      mockUseMoneyAccountTransactions.mockReturnValue({
        allTransactions: Array.from({ length: 3 }, (_, index) => ({
          ...MOCK_MONEY_TRANSACTIONS[index % MOCK_MONEY_TRANSACTIONS.length],
          id: `milestone-${index}`,
        })),
        deposits: [],
        transfers: [],
        submittedTransactions: [],
        moneyAddress: '0x0000000000000000000000000000000000000001',
      });
    });

    it('renders onboarding card with step 2', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationNotSeenState,
      });
      expect(
        getByTestId(MoneyOnboardingCardTestIds.STEP_LABEL),
      ).toHaveTextContent('Step 2 of 2');
    });

    it('renders the activity list', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationSeenState,
      });
      expect(getByTestId(MoneyActivityListTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('renders condensed info cards', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationSeenState,
      });
      expect(
        getByTestId(MoneyCondensedInfoCardsTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('hides expanded HowItWorks section', () => {
      const { queryByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationSeenState,
      });
      expect(
        queryByTestId(MoneyHowItWorksTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('hides expanded WhatYouGet section', () => {
      const { queryByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationSeenState,
      });
      expect(
        queryByTestId(MoneyWhatYouGetTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('renders the MetaMask Card section', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationSeenState,
      });
      expect(getByTestId(MoneyMetaMaskCardTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('navigates to Card root when onboarding CTA is tapped', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationNotSeenState,
      });

      fireEvent.press(getByTestId(MoneyOnboardingCardTestIds.CTA_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT);
    });
  });

  describe('card-unlinked state (milestone + has cardholder)', () => {
    beforeEach(() => {
      mockUseMoneyAccountTransactions.mockReturnValue({
        allTransactions: Array.from({ length: 3 }, (_, index) => ({
          ...MOCK_MONEY_TRANSACTIONS[index % MOCK_MONEY_TRANSACTIONS.length],
          id: `card-unlinked-${index}`,
        })),
        deposits: [],
        transfers: [],
        submittedTransactions: [],
        moneyAddress: '0x0000000000000000000000000000000000000001',
      });
      mockSelectIsCardholder.mockReturnValue(true);
    });

    it('renders onboarding card with step 2 and link-card variant', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationNotSeenState,
      });
      expect(
        getByTestId(MoneyOnboardingCardTestIds.STEP_LABEL),
      ).toHaveTextContent('Step 2 of 2');
      expect(getByTestId(MoneyOnboardingCardTestIds.TITLE)).toHaveTextContent(
        strings('money.onboarding.link_card_title'),
      );
    });

    it('renders MetaMask Card section in link mode', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoneyHomeView />,
        { state: educationSeenState },
      );
      expect(
        getByTestId(MoneyMetaMaskCardTestIds.LINK_BUTTON),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW),
      ).not.toBeOnTheScreen();
    });

    it('renders the balance summary section', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationSeenState,
      });
      expect(
        getByTestId(MoneyBalanceSummaryTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the action button row', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationSeenState,
      });
      expect(
        getByTestId(MoneyActionButtonRowTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the earnings section', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationSeenState,
      });
      expect(getByTestId(MoneyEarningsTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('renders the activity list', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationSeenState,
      });
      expect(getByTestId(MoneyActivityListTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('renders condensed info cards', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationSeenState,
      });
      expect(
        getByTestId(MoneyCondensedInfoCardsTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the potential earnings section', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationSeenState,
      });
      expect(
        getByTestId(MoneyPotentialEarningsTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('hides expanded HowItWorks section', () => {
      const { queryByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationSeenState,
      });
      expect(
        queryByTestId(MoneyHowItWorksTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('hides expanded WhatYouGet section', () => {
      const { queryByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationSeenState,
      });
      expect(
        queryByTestId(MoneyWhatYouGetTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('renders the footer', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationSeenState,
      });
      expect(getByTestId(MoneyFooterTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('navigates to Card home when onboarding CTA is tapped by cardholder', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationNotSeenState,
      });

      fireEvent.press(getByTestId(MoneyOnboardingCardTestIds.CTA_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
      });
    });
  });

  describe('empty state (0 transactions)', () => {
    beforeEach(() => {
      mockUseMoneyAccountTransactions.mockReturnValue({
        allTransactions: [],
        deposits: [],
        transfers: [],
        submittedTransactions: [],
        moneyAddress: '0x0000000000000000000000000000000000000001',
      });
    });

    it('renders onboarding card with step 1', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationNotSeenState,
      });
      expect(
        getByTestId(MoneyOnboardingCardTestIds.STEP_LABEL),
      ).toHaveTextContent('Step 1 of 2');
    });

    it('does not render the activity list', () => {
      const { queryByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationSeenState,
      });
      expect(
        queryByTestId(MoneyActivityListTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('does not render condensed info cards', () => {
      const { queryByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationSeenState,
      });
      expect(
        queryByTestId(MoneyCondensedInfoCardsTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('renders expanded HowItWorks section', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationSeenState,
      });
      expect(getByTestId(MoneyHowItWorksTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('renders expanded WhatYouGet section', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationSeenState,
      });
      expect(getByTestId(MoneyWhatYouGetTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it.each([
      ['onboarding card CTA', MoneyOnboardingCardTestIds.CTA_BUTTON],
      ['mUSD row Add', MoneyMusdTokenRowTestIds.ADD_BUTTON],
    ])('opens the Add money sheet from the %s button', (_label, testId) => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: educationNotSeenState,
      });

      fireEvent.press(getByTestId(testId));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
      });
    });
  });

  describe('Add money footer peek-and-hide', () => {
    const fireScrollViewLayout = (scrollView: ReactTestInstance) => {
      fireEvent(scrollView, 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 375, height: 600 } },
      });
    };

    const fireStepperLayout = (
      onboarding: ReactTestInstance,
      y: number,
      height = 300,
    ) => {
      // The stepper container is the immediate Box wrapper around the
      // onboarding card. Fire layout on its parent (the wrapper Box).
      const target = onboarding.parent ?? onboarding;
      fireEvent(target, 'layout', {
        nativeEvent: { layout: { x: 0, y, width: 375, height } },
      });
    };

    const fireScroll = (
      scrollView: ReactTestInstance,
      contentOffsetY: number,
    ) => {
      fireEvent.scroll(scrollView, {
        nativeEvent: {
          contentOffset: { x: 0, y: contentOffsetY },
          contentSize: { width: 375, height: 2000 },
          layoutMeasurement: { width: 375, height: 600 },
        },
      });
    };

    it('does not render the footer when the stepper is visible and education has not been seen', () => {
      const { queryByTestId, getByTestId } = renderWithProvider(
        <MoneyHomeView />,
        { state: educationNotSeenState },
      );

      // Stepper sits at the top of the scroll view, well within the viewport.
      const onboarding = getByTestId(MoneyOnboardingCardTestIds.CONTAINER);
      const scrollView = getByTestId(MoneyHomeViewTestIds.SCROLL_VIEW);
      act(() => {
        fireScrollViewLayout(scrollView);
        fireStepperLayout(onboarding, 100, 300);
      });

      expect(queryByTestId(MoneyFooterTestIds.CONTAINER)).not.toBeOnTheScreen();
    });

    it('renders the footer when the stepper has scrolled out of view and education has not been seen', () => {
      const animatedTimingSpy = jest
        .spyOn(Animated, 'timing')
        .mockImplementation(
          () =>
            ({
              start: (cb?: Animated.EndCallback) => cb?.({ finished: true }),
              stop: jest.fn(),
              reset: jest.fn(),
            }) as unknown as Animated.CompositeAnimation,
        );

      const { queryByTestId, getByTestId } = renderWithProvider(
        <MoneyHomeView />,
        { state: educationNotSeenState },
      );

      const onboarding = getByTestId(MoneyOnboardingCardTestIds.CONTAINER);
      const scrollView = getByTestId(MoneyHomeViewTestIds.SCROLL_VIEW);

      act(() => {
        fireScrollViewLayout(scrollView);
        fireStepperLayout(onboarding, 100, 300);
      });

      // Scroll past the bottom of the stepper (y=100 + height=300 = 400).
      act(() => {
        fireScroll(scrollView, 500);
      });

      expect(queryByTestId(MoneyFooterTestIds.CONTAINER)).toBeOnTheScreen();

      animatedTimingSpy.mockRestore();
    });

    it('hides the footer again when the stepper scrolls back into view', () => {
      const animatedTimingSpy = jest
        .spyOn(Animated, 'timing')
        .mockImplementation(
          () =>
            ({
              start: (cb?: Animated.EndCallback) => cb?.({ finished: true }),
              stop: jest.fn(),
              reset: jest.fn(),
            }) as unknown as Animated.CompositeAnimation,
        );

      const { queryByTestId, getByTestId } = renderWithProvider(
        <MoneyHomeView />,
        { state: educationNotSeenState },
      );

      const onboarding = getByTestId(MoneyOnboardingCardTestIds.CONTAINER);
      const scrollView = getByTestId(MoneyHomeViewTestIds.SCROLL_VIEW);

      act(() => {
        fireScrollViewLayout(scrollView);
        fireStepperLayout(onboarding, 100, 300);
      });

      // Show the footer first (scroll past the stepper).
      act(() => {
        fireScroll(scrollView, 500);
      });

      // Measure the animated footer wrapper so the exit animation can run.
      const animatedFooter = queryByTestId(MoneyFooterTestIds.CONTAINER);
      const animatedFooterParent = animatedFooter?.parent;
      if (animatedFooterParent) {
        act(() => {
          fireEvent(animatedFooterParent, 'layout', {
            nativeEvent: {
              layout: { x: 0, y: 0, width: 375, height: 80 },
            },
          });
        });
      }
      expect(queryByTestId(MoneyFooterTestIds.CONTAINER)).toBeOnTheScreen();

      // Scroll back so the stepper re-enters the viewport.
      act(() => {
        fireScroll(scrollView, 0);
      });

      expect(queryByTestId(MoneyFooterTestIds.CONTAINER)).not.toBeOnTheScreen();

      animatedTimingSpy.mockRestore();
    });

    it('does not restart the slide-in animation when the footer reflows after appearing', () => {
      const animatedTimingSpy = jest
        .spyOn(Animated, 'timing')
        .mockImplementation(
          () =>
            ({
              start: (cb?: Animated.EndCallback) => cb?.({ finished: true }),
              stop: jest.fn(),
              reset: jest.fn(),
            }) as unknown as Animated.CompositeAnimation,
        );

      const { queryByTestId, getByTestId } = renderWithProvider(
        <MoneyHomeView />,
        { state: educationNotSeenState },
      );

      const onboarding = getByTestId(MoneyOnboardingCardTestIds.CONTAINER);
      const scrollView = getByTestId(MoneyHomeViewTestIds.SCROLL_VIEW);

      act(() => {
        fireScrollViewLayout(scrollView);
        fireStepperLayout(onboarding, 100, 300);
      });

      // Scroll the stepper out of view so the footer peeks in. This is the
      // single visibility transition that should drive exactly one animation.
      act(() => {
        fireScroll(scrollView, 500);
      });

      const callsAfterPeek = animatedTimingSpy.mock.calls.length;
      expect(callsAfterPeek).toBeGreaterThan(0);

      // Subsequent layout reflows on the animated footer wrapper (e.g. when
      // the measured height changes) must not retrigger the slide-in.
      const animatedFooter = queryByTestId(MoneyFooterTestIds.CONTAINER);
      const animatedFooterParent = animatedFooter?.parent;
      if (animatedFooterParent) {
        act(() => {
          fireEvent(animatedFooterParent, 'layout', {
            nativeEvent: {
              layout: { x: 0, y: 0, width: 375, height: 80 },
            },
          });
        });
        // A second layout with a different height simulates a reflow after the
        // initial measurement settles.
        act(() => {
          fireEvent(animatedFooterParent, 'layout', {
            nativeEvent: {
              layout: { x: 0, y: 0, width: 375, height: 96 },
            },
          });
        });
      }

      expect(animatedTimingSpy).toHaveBeenCalledTimes(callsAfterPeek);

      animatedTimingSpy.mockRestore();
    });

    it('does not re-render on every scroll event when the visibility region is unchanged', () => {
      let renderCount = 0;
      const ProfiledMoneyHomeView = () => (
        <React.Profiler
          id="MoneyHomeViewPerf"
          onRender={() => {
            renderCount += 1;
          }}
        >
          <MoneyHomeView />
        </React.Profiler>
      );

      const { getByTestId } = renderWithProvider(<ProfiledMoneyHomeView />, {
        state: educationNotSeenState,
      });

      const onboarding = getByTestId(MoneyOnboardingCardTestIds.CONTAINER);
      const scrollView = getByTestId(MoneyHomeViewTestIds.SCROLL_VIEW);

      act(() => {
        fireScrollViewLayout(scrollView);
        fireStepperLayout(onboarding, 100, 300);
      });

      // Stepper occupies y=[100, 400] and viewport height is 600. Scrolling
      // anywhere in [0, 99] keeps the stepper fully in view, so visibility
      // never flips. Without the fix the parent would commit on every scroll
      // (10 commits for 10 events). With the fix the count must be at most 1.
      const baselineRenderCount = renderCount;
      act(() => {
        for (let y = 0; y < 100; y += 10) {
          fireScroll(scrollView, y);
        }
      });
      expect(renderCount - baselineRenderCount).toBeLessThanOrEqual(1);

      // Crossing the visibility threshold flips isStepperVisible exactly once
      // and must trigger a bounded number of commits (state change + the
      // visibility-driven effect mounting the footer), not one per frame.
      const beforeFlip = renderCount;
      act(() => {
        fireScroll(scrollView, 500);
      });
      expect(renderCount - beforeFlip).toBeGreaterThanOrEqual(1);
      expect(renderCount - beforeFlip).toBeLessThanOrEqual(3);

      // Subsequent scroll events that stay past the threshold must not
      // re-render on every frame either.
      const afterFlip = renderCount;
      act(() => {
        for (let y = 500; y < 600; y += 10) {
          fireScroll(scrollView, y);
        }
      });
      expect(renderCount - afterFlip).toBeLessThanOrEqual(1);
    });

    it('always renders the footer and never the stepper when education has been seen', () => {
      const { queryByTestId, getByTestId } = renderWithProvider(
        <MoneyHomeView />,
        { state: educationSeenState },
      );

      // Footer is mounted from the first render when education has been seen.
      expect(queryByTestId(MoneyFooterTestIds.CONTAINER)).toBeOnTheScreen();
      // Stepper is gated on !hasSeenMusdConversionEducation, so it must not
      // render at all once the user has completed/dismissed onboarding.
      expect(
        queryByTestId(MoneyOnboardingCardTestIds.CONTAINER),
      ).not.toBeOnTheScreen();

      // Scroll events with the stepper absent must keep the footer visible.
      const scrollView = getByTestId(MoneyHomeViewTestIds.SCROLL_VIEW);
      act(() => {
        fireScrollViewLayout(scrollView);
        fireScroll(scrollView, 0);
      });

      expect(queryByTestId(MoneyFooterTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('keeps the footer hidden when the stepper is below the viewport (off-screen, not yet scrolled to)', () => {
      const { queryByTestId, getByTestId } = renderWithProvider(
        <MoneyHomeView />,
        { state: educationNotSeenState },
      );

      const onboarding = getByTestId(MoneyOnboardingCardTestIds.CONTAINER);
      const scrollView = getByTestId(MoneyHomeViewTestIds.SCROLL_VIEW);

      // Simulate a tall scroll where the stepper sits below the visible
      // viewport (y=900, height=300, viewport height=600). The user has not
      // yet scrolled to the stepper, so the footer must stay hidden.
      act(() => {
        fireScrollViewLayout(scrollView);
        fireStepperLayout(onboarding, 900, 300);
        fireScroll(scrollView, 0);
      });

      expect(queryByTestId(MoneyFooterTestIds.CONTAINER)).not.toBeOnTheScreen();
    });

    it('keeps the footer hidden on initial layout while the stepper height is still 0', () => {
      const { queryByTestId, getByTestId } = renderWithProvider(
        <MoneyHomeView />,
        { state: educationNotSeenState },
      );

      const onboarding = getByTestId(MoneyOnboardingCardTestIds.CONTAINER);
      const scrollView = getByTestId(MoneyHomeViewTestIds.SCROLL_VIEW);

      // First onLayout reports an unmeasured (height=0) stepper. The footer
      // must not flash into view before measurements settle.
      act(() => {
        fireScrollViewLayout(scrollView);
        fireStepperLayout(onboarding, 0, 0);
      });

      expect(queryByTestId(MoneyFooterTestIds.CONTAINER)).not.toBeOnTheScreen();

      // Once the stepper reports a real height the footer is still hidden
      // because the user has not scrolled past it.
      act(() => {
        fireStepperLayout(onboarding, 100, 300);
      });

      expect(queryByTestId(MoneyFooterTestIds.CONTAINER)).not.toBeOnTheScreen();
    });
  });
});
