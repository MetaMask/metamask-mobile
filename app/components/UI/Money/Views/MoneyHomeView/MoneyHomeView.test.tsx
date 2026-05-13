import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
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
import { useMoneyAccountCardLinkage } from '../../../Card/hooks/useMoneyAccountCardLinkage';
import { getDetectedGeolocation } from '../../../../../reducers/fiatOrders';
import { moneyFormatFiat } from '../../utils/moneyFormatFiat';
import { useMusdConversion } from '../../../Earn/hooks/useMusdConversion';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockInitiateCustomConversion = jest.fn();
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

const mockUseMusdConversionTokens = jest.fn(() => ({
  tokens: mockConversionTokens as ReturnType<typeof Array.from>,
}));

jest.mock('../../../Earn/hooks/useMusdConversionTokens', () => ({
  useMusdConversionTokens: () => mockUseMusdConversionTokens(),
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
  useMusdConversion: jest.fn(),
}));

jest.mock('../../../../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      navigate: jest.fn(),
    },
  },
}));

jest.mock('../../utils/moneyFormatFiat', () => ({
  moneyFormatFiat: jest.fn(() => '$0.12'),
}));

jest.mock('../../../../../selectors/cardController', () => ({
  ...jest.requireActual('../../../../../selectors/cardController'),
  selectIsCardholder: jest.fn(),
}));

jest.mock('../../../Card/hooks/useMoneyAccountCardLinkage', () => ({
  useMoneyAccountCardLinkage: jest.fn(),
}));

jest.mock('../../../../../reducers/fiatOrders', () => ({
  ...jest.requireActual('../../../../../reducers/fiatOrders'),
  getDetectedGeolocation: jest.fn(),
}));

const mockSelectIsCardholder = jest.mocked(selectIsCardholder);
const mockGetDetectedGeolocation = jest.mocked(getDetectedGeolocation);
const mockUseMoneyAccountCardLinkage = jest.mocked(useMoneyAccountCardLinkage);
const mockLinkInBackground = jest.fn();

const mockUseMoneyAccountTransactions = jest.mocked(
  useMoneyAccountTransactions,
);

const mockUseMusdConversion = jest.mocked(useMusdConversion);

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
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      tx,
      onPress,
    }: {
      tx: { id: string };
      onPress?: () => void;
    }) => (
      <TouchableOpacity
        testID={`money-activity-item-${tx.id}`}
        onPress={onPress}
      >
        <Text>{tx.id}</Text>
      </TouchableOpacity>
    ),
  };
});
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('@react-native-masked-view/masked-view', () => 'MaskedView');
jest.mock('../../../../UI/AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn(() => null),
}));
jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

describe('MoneyHomeView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.alert = jest.fn();

    mockInitiateCustomConversion.mockResolvedValue(undefined);
    mockUseMusdConversion.mockReturnValue({
      initiateCustomConversion: mockInitiateCustomConversion,
    } as unknown as ReturnType<typeof useMusdConversion>);

    mockSelectIsCardholder.mockReturnValue(false);
    mockGetDetectedGeolocation.mockReturnValue('US');

    mockLinkInBackground.mockReset().mockResolvedValue(true);
    mockUseMoneyAccountCardLinkage.mockReturnValue({
      hasMoneyAccountRequirements: false,
      isCardAuthenticated: false,
      primaryMoneyAccount: undefined,
      moneyAccountCardToken: null,
      canLink: false,
      status: 'idle',
      isLinking: false,
      error: null,
      linkInBackground: mockLinkInBackground,
      reset: jest.fn(),
    } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);

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
          balanceOfInAssets: '2000000',
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
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(getByTestId(MoneyHomeViewTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('renders the scroll view', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(getByTestId(MoneyHomeViewTestIds.SCROLL_VIEW)).toBeOnTheScreen();
  });

  it('renders the header section', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(getByTestId(MoneyHeaderTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('renders the balance summary section', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(getByTestId(MoneyBalanceSummaryTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('renders the action button row', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(
      getByTestId(MoneyActionButtonRowTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the onboarding card', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(getByTestId(MoneyOnboardingCardTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('renders the earnings section', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(getByTestId(MoneyEarningsTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('hides the how it works section in filled state', () => {
    const { queryByTestId } = renderWithProvider(<MoneyHomeView />);
    expect(
      queryByTestId(MoneyHowItWorksTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('renders the potential earnings section when tokens exist', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(
      getByTestId(MoneyPotentialEarningsTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the MetaMask Card section', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(getByTestId(MoneyMetaMaskCardTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('hides the what you get section in filled state', () => {
    const { queryByTestId } = renderWithProvider(<MoneyHomeView />);
    expect(
      queryByTestId(MoneyWhatYouGetTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('renders the footer', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    expect(getByTestId(MoneyFooterTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('navigates to the Money activity screen when View all is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    fireEvent.press(getByTestId(MoneyActivityListTestIds.VIEW_ALL_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ACTIVITY);
  });

  it.each([
    ['action row Add', MoneyActionButtonRowTestIds.ADD_BUTTON],
    ['footer Add money', MoneyFooterTestIds.ADD_MONEY_BUTTON],
  ])('opens the Add money sheet from the %s button', (_label, testId) => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    fireEvent.press(getByTestId(testId));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
    });
  });

  it('opens the More sheet when menu button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    fireEvent.press(getByTestId(MoneyHeaderTestIds.MENU_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.MORE_SHEET,
    });
  });

  it('opens the Transfer sheet when Transfer button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    fireEvent.press(getByTestId(MoneyActionButtonRowTestIds.TRANSFER_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.TRANSFER_MONEY_SHEET,
    });
  });

  it('navigates to Card root when Card button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    fireEvent.press(getByTestId(MoneyActionButtonRowTestIds.CARD_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT);
  });

  it('opens the APY info sheet when the APY info button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    fireEvent.press(getByTestId(MoneyBalanceSummaryTestIds.APY_INFO_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.APY_INFO_SHEET,
      params: { apy: 5 },
    });
  });

  it('opens the earnings info sheet when the earnings info button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    fireEvent.press(getByTestId(MoneySectionHeaderTestIds.INFO_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.EARNINGS_INFO_SHEET,
    });
  });

  it('opens the earn-crypto info sheet when the section info button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    fireEvent.press(getByTestId(MoneyPotentialEarningsTestIds.INFO_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.EARN_CRYPTO_INFO_SHEET,
    });
  });

  it('navigates to Card root when Get now row is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    fireEvent.press(getByTestId(MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT);
  });

  it('navigates to potential earnings screen when View potential earnings is pressed', () => {
    mockUseMusdConversionTokens.mockReturnValueOnce({
      tokens: Array.from({ length: 6 }, (_, i) => ({
        ...mockConversionTokens[0],
        address:
          `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB${i.toString(16).padStart(2, '0')}` as `0x${string}`,
        fiat: { balance: 5000 },
      })),
    });
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    fireEvent.press(getByTestId(MoneyPotentialEarningsTestIds.VIEW_ALL_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.POTENTIAL_EARNINGS);
  });

  it('opens the MUSD learn more URL when learn more is pressed in empty state', () => {
    const mockOpenURL = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);

    mockUseMoneyAccountTransactions.mockReturnValue({
      allTransactions: [],
      deposits: [],
      transfers: [],
      submittedTransactions: [],
      moneyAddress: '0x0000000000000000000000000000000000000001',
    });

    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    fireEvent.press(getByTestId(MoneyWhatYouGetTestIds.LEARN_MORE_BUTTON));

    expect(mockOpenURL).toHaveBeenCalledTimes(1);
    mockOpenURL.mockRestore();
  });

  describe('monthly and yearly earnings', () => {
    it('passes the formatted monthly earnings to MoneyEarnings', () => {
      mockMoneyFormatFiat.mockImplementation((value) =>
        String(value) === '0' ? '$0.00' : '$0.12',
      );

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(getByTestId(MoneyEarningsTestIds.MONTHLY_VALUE)).toHaveTextContent(
        '+$0.12',
      );
    });

    it('passes the formatted yearly earnings to MoneyEarnings', () => {
      mockMoneyFormatFiat.mockImplementation((value) =>
        String(value) === '0' ? '$0.00' : '$0.12',
      );

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(getByTestId(MoneyEarningsTestIds.YEARLY_VALUE)).toHaveTextContent(
        '+$0.12',
      );
    });

    it('drops the + prefix when projected earnings round to formatted zero', () => {
      mockMoneyFormatFiat.mockReturnValue('$0.00');
      mockUseMoneyAccountBalance.mockReturnValue({
        totalFiatFormatted: '$0.00',
        musdFiatFormatted: '$0.00',
        musdSHFvdFiatFormatted: '$0.00',
        totalFiatRaw: '0.001',
        tokenTotal: undefined,
        isAggregatedBalanceLoading: false,
        apyDecimal: 0.05,
        apyPercent: 5,
        apyPercentFormatted: '5%',
        vaultApyQuery: { data: { apy: 0.05 }, isLoading: false },
        musdBalanceQuery: { data: undefined, isLoading: false },
        musdEquivalentBalanceQuery: { data: undefined, isLoading: false },
      } as ReturnType<typeof useMoneyAccountBalance>);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(getByTestId(MoneyEarningsTestIds.MONTHLY_VALUE)).toHaveTextContent(
        /^\$0\.00$/,
      );
      expect(getByTestId(MoneyEarningsTestIds.YEARLY_VALUE)).toHaveTextContent(
        /^\$0\.00$/,
      );
    });

    it('displays the zero-formatted value for monthly earnings when totalFiatRaw is absent', () => {
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

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(getByTestId(MoneyEarningsTestIds.MONTHLY_VALUE)).toHaveTextContent(
        '$0.00',
      );
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
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(
        getByTestId(MoneyOnboardingCardTestIds.STEP_LABEL),
      ).toHaveTextContent('Step 2 of 2');
    });

    it('renders the activity list', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(getByTestId(MoneyActivityListTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('renders condensed info cards', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(
        getByTestId(MoneyCondensedInfoCardsTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('hides expanded HowItWorks section', () => {
      const { queryByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(
        queryByTestId(MoneyHowItWorksTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('hides expanded WhatYouGet section', () => {
      const { queryByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(
        queryByTestId(MoneyWhatYouGetTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('renders the MetaMask Card section', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(getByTestId(MoneyMetaMaskCardTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('navigates to Card root when onboarding CTA is tapped', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

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
      // Non-US so MetaMask card renders in link mode (manage mode is US-only).
      mockGetDetectedGeolocation.mockReturnValue('GB');
    });

    it('renders onboarding card with step 2 and link-card variant', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
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
      );
      expect(
        getByTestId(MoneyMetaMaskCardTestIds.LINK_BUTTON),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW),
      ).not.toBeOnTheScreen();
    });

    it('renders the balance summary section', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(
        getByTestId(MoneyBalanceSummaryTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the action button row', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(
        getByTestId(MoneyActionButtonRowTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the earnings section', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(getByTestId(MoneyEarningsTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('renders the activity list', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(getByTestId(MoneyActivityListTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('renders condensed info cards', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(
        getByTestId(MoneyCondensedInfoCardsTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the potential earnings section', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(
        getByTestId(MoneyPotentialEarningsTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('hides expanded HowItWorks section', () => {
      const { queryByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(
        queryByTestId(MoneyHowItWorksTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('hides expanded WhatYouGet section', () => {
      const { queryByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(
        queryByTestId(MoneyWhatYouGetTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('renders the footer', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(getByTestId(MoneyFooterTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('navigates to Card home when onboarding CTA is tapped by cardholder without Money account readiness', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByTestId(MoneyOnboardingCardTestIds.CTA_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
      });
      expect(mockLinkInBackground).not.toHaveBeenCalled();
    });

    it('navigates to Card home when the MetaMaskCard link button is tapped by cardholder without Money account readiness', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByTestId(MoneyMetaMaskCardTestIds.LINK_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
      });
      expect(mockLinkInBackground).not.toHaveBeenCalled();
    });

    describe('fully ready for inline linking (canLink=true)', () => {
      beforeEach(() => {
        mockUseMoneyAccountCardLinkage.mockReturnValue({
          hasMoneyAccountRequirements: true,
          isCardAuthenticated: true,
          primaryMoneyAccount: { address: '0xabc' },
          moneyAccountCardToken: { symbol: 'USDC' },
          canLink: true,
          status: 'idle',
          isLinking: false,
          error: null,
          linkInBackground: mockLinkInBackground,
          reset: jest.fn(),
        } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);
      });

      it('calls linkInBackground and does NOT navigate when onboarding CTA is tapped', async () => {
        const { getByTestId } = renderWithProvider(<MoneyHomeView />);

        await act(async () => {
          fireEvent.press(getByTestId(MoneyOnboardingCardTestIds.CTA_BUTTON));
        });

        expect(mockLinkInBackground).toHaveBeenCalledTimes(1);
        expect(mockNavigate).not.toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
        });
      });

      it('calls linkInBackground and does NOT navigate when MetaMaskCard link button is tapped', async () => {
        const { getByTestId } = renderWithProvider(<MoneyHomeView />);

        await act(async () => {
          fireEvent.press(getByTestId(MoneyMetaMaskCardTestIds.LINK_BUTTON));
        });

        expect(mockLinkInBackground).toHaveBeenCalledTimes(1);
        expect(mockNavigate).not.toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
        });
      });
    });

    it('navigates to Card home (does NOT call linkInBackground) when prerequisites are met but Monad USDC token is missing (canLink=false)', () => {
      mockUseMoneyAccountCardLinkage.mockReturnValue({
        hasMoneyAccountRequirements: true,
        isCardAuthenticated: true,
        primaryMoneyAccount: { address: '0xabc' },
        moneyAccountCardToken: null,
        canLink: false,
        status: 'idle',
        isLinking: false,
        error: null,
        linkInBackground: mockLinkInBackground,
        reset: jest.fn(),
      } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByTestId(MoneyOnboardingCardTestIds.CTA_BUTTON));

      expect(mockLinkInBackground).not.toHaveBeenCalled();
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
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(
        getByTestId(MoneyOnboardingCardTestIds.STEP_LABEL),
      ).toHaveTextContent('Step 1 of 2');
    });

    it('does not render the activity list', () => {
      const { queryByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(
        queryByTestId(MoneyActivityListTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('does not render condensed info cards', () => {
      const { queryByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(
        queryByTestId(MoneyCondensedInfoCardsTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('renders expanded HowItWorks section', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(getByTestId(MoneyHowItWorksTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('renders expanded WhatYouGet section', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(getByTestId(MoneyWhatYouGetTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it.each([
      ['onboarding card CTA', MoneyOnboardingCardTestIds.CTA_BUTTON],
      ['mUSD row Add', MoneyMusdTokenRowTestIds.ADD_BUTTON],
    ])('opens the Add money sheet from the %s button', (_label, testId) => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByTestId(testId));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
      });
    });

    it('navigates to Asset details when the mUSD token row is pressed', () => {
      const NavigationService = jest.requireMock(
        '../../../../../core/NavigationService',
      ).default;

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByTestId(MoneyMusdTokenRowTestIds.CONTAINER));

      expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
        'Asset',
        expect.objectContaining({ source: expect.any(String) }),
      );
    });

    it('navigates to HowItWorks when its section header is pressed', () => {
      const { getByText } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByText(strings('money.how_it_works.title')));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.HOW_IT_WORKS);
    });

    it('opens the Learn more URL when Learn more is pressed', () => {
      const { Linking } = jest.requireMock('react-native');
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByTestId(MoneyWhatYouGetTestIds.LEARN_MORE_BUTTON));

      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining('http'),
      );
    });
  });

  describe('filled state navigation handlers', () => {
    it('navigates to Potential Earnings when View all is pressed on potential earnings section', () => {
      mockUseMusdConversionTokens.mockReturnValueOnce({
        tokens: Array.from({ length: 6 }, (_, i) => ({
          ...mockConversionTokens[0],
          address:
            `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB${i.toString(16).padStart(2, '0')}` as `0x${string}`,
          fiat: { balance: 5000 },
        })),
      });
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(
        getByTestId(MoneyPotentialEarningsTestIds.VIEW_ALL_BUTTON),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MONEY.POTENTIAL_EARNINGS,
      );
    });

    it('initiates a custom conversion when a token Convert button is pressed', async () => {
      const { getByText } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByText(strings('money.potential_earnings.convert')));

      expect(mockInitiateCustomConversion).toHaveBeenCalledWith(
        expect.objectContaining({
          preferredPaymentToken: expect.objectContaining({
            address: mockConversionTokens[0].address,
          }),
          navigationStack: Routes.MONEY.ROOT,
        }),
      );
    });

    it('logs an error when initiateCustomConversion rejects', async () => {
      mockInitiateCustomConversion.mockRejectedValueOnce(
        new Error('network failure'),
      );
      const Logger = jest.requireMock('../../../../../util/Logger');

      const { getByText } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByText(strings('money.potential_earnings.convert')));

      await Promise.resolve();

      expect(Logger.default.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          message: expect.stringContaining('MoneyHomeView'),
        }),
      );
    });

    it('triggers the under-construction alert when an activity item is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByTestId('money-activity-item-padded-0'));

      expect(global.alert).toHaveBeenCalled();
    });
  });

  describe('card upsell mode — Get Now handler', () => {
    it('navigates to Card root when the Get Now card row is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByTestId(MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT);
    });
  });

  describe('Metal card geolocation gating', () => {
    it('renders the Metal card row when geolocation is US', () => {
      mockGetDetectedGeolocation.mockReturnValue('US');

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.METAL_CARD_ROW),
      ).toBeOnTheScreen();
      expect(
        getByTestId(MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW),
      ).toBeOnTheScreen();
    });

    it('renders the Metal card row when geolocation is a US sub-region (e.g. US-CA)', () => {
      mockGetDetectedGeolocation.mockReturnValue('us-ca');

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.METAL_CARD_ROW),
      ).toBeOnTheScreen();
    });

    it('hides the Metal card row when geolocation is GB', () => {
      mockGetDetectedGeolocation.mockReturnValue('GB');

      const { queryByTestId, getByTestId } = renderWithProvider(
        <MoneyHomeView />,
      );

      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.METAL_CARD_ROW),
      ).not.toBeOnTheScreen();
      expect(
        getByTestId(MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW),
      ).toBeOnTheScreen();
    });

    it('hides the Metal card row when geolocation is undefined (loading/unknown - fail closed)', () => {
      mockGetDetectedGeolocation.mockReturnValue(undefined);

      const { queryByTestId, getByTestId } = renderWithProvider(
        <MoneyHomeView />,
      );

      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.METAL_CARD_ROW),
      ).not.toBeOnTheScreen();
      expect(
        getByTestId(MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW),
      ).toBeOnTheScreen();
    });
  });

  describe('MetaMask card mode selection', () => {
    beforeEach(() => {
      mockUseMoneyAccountTransactions.mockReturnValue({
        allTransactions: Array.from({ length: 3 }, (_, index) => ({
          ...MOCK_MONEY_TRANSACTIONS[index % MOCK_MONEY_TRANSACTIONS.length],
          id: `mm-card-mode-${index}`,
        })),
        deposits: [],
        transfers: [],
        submittedTransactions: [],
        moneyAddress: '0x0000000000000000000000000000000000000001',
      });
    });

    it('selects mode="manage" when cardholder and US', () => {
      mockSelectIsCardholder.mockReturnValue(true);
      mockGetDetectedGeolocation.mockReturnValue('US');

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.MANAGE_CONTAINER),
      ).toBeOnTheScreen();
    });

    it('selects mode="link" when cardholder but not US', () => {
      mockSelectIsCardholder.mockReturnValue(true);
      mockGetDetectedGeolocation.mockReturnValue('GB');

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.LINK_CONTAINER),
      ).toBeOnTheScreen();
    });

    it('selects mode="upsell" when not cardholder', () => {
      mockSelectIsCardholder.mockReturnValue(false);
      mockGetDetectedGeolocation.mockReturnValue('US');

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW),
      ).toBeOnTheScreen();
    });

    it('navigates to Card root when Manage is pressed in manage mode', () => {
      mockSelectIsCardholder.mockReturnValue(true);
      mockGetDetectedGeolocation.mockReturnValue('US');

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByTestId(MoneyMetaMaskCardTestIds.MANAGE_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT);
    });
  });

  describe('Get now navigation', () => {
    it('navigates to the card sign-up flow when the virtual card Get now button is pressed', () => {
      mockGetDetectedGeolocation.mockReturnValue('GB');

      const { getByText } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByText(strings('money.metamask_card.get_now')));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT);
    });

    it('navigates to the card sign-up flow when the metal card Get now button is pressed', () => {
      mockGetDetectedGeolocation.mockReturnValue('US');

      const { getAllByText } = renderWithProvider(<MoneyHomeView />);
      const buttons = getAllByText(strings('money.metamask_card.get_now'));

      fireEvent.press(buttons[1]);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT);
    });
  });
});
