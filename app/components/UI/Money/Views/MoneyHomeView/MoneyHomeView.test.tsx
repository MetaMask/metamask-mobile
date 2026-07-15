import React from 'react';
import { act, fireEvent, within } from '@testing-library/react-native';
import { Linking } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import BigNumber from 'bignumber.js';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Engine from '../../../../../core/Engine';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
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
import { MoneyActivityLoadingTestIds } from '../../components/MoneyActivityLoading/MoneyActivityLoading.testIds';
import { MoneyCondensedInfoCardsTestIds } from '../../components/MoneyCondensedInfoCards/MoneyCondensedInfoCards.testIds';
import { MoneyMusdTokenRowTestIds } from '../../components/MoneyMusdTokenRow/MoneyMusdTokenRow.testIds';
import { MoneySectionHeaderTestIds } from '../../components/MoneySectionHeader/MoneySectionHeader.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import AppConstants from '../../../../../core/AppConstants';
import { useMoneyAccountTransactions } from '../../hooks/useMoneyAccountTransactions';
import { useMoneyAccountApiActivity } from '../../hooks/useMoneyAccountApiActivity';
import { AUTO_FILL_MAX_PAGES } from '../../hooks/useMoneyActivityItems';
import { strings } from '../../../../../../locales/i18n';
import MOCK_MONEY_TRANSACTIONS from '../../constants/mockActivityData';
import type { AccountsApiActivity } from '../../types/moneyActivity';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import useMoneyAccountInfo from '../../hooks/useMoneyAccountInfo';
import {
  selectCardHomeDataStatus,
  selectHasMetalCard,
  selectIsCardholder,
} from '../../../../../selectors/cardController';
import { useMoneyAccountCardLinkage } from '../../../Card/hooks/useMoneyAccountCardLinkage';
import { MONEY_HOME_CARD_ORIGIN } from '../../../Card/hooks/useCardPostAuthRedirect';
import { moneyFormatUsd } from '../../utils/moneyFormatFiat';
import { useMusdBalance } from '../../../Earn/hooks/useMusdBalance';
import {
  BOTTOM_SHEET_NAMES,
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  MONEY_URLS,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  CardActions,
  CardEntryPoint,
  CardScreens,
} from '../../../Card/util/metrics';
import { selectIsMoneyAccountGeoEligible } from '../../selectors/eligibility';
import { selectMoneyEnableMoneyAccountFlag } from '../../selectors/featureFlags';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockInitiateDeposit = jest.fn();
const mockRefetchBalance = jest.fn();
const mockTrackEvent = jest.fn();
const mockBuild = jest.fn(() => ({ name: 'built-event' }));
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn((_eventName?: unknown) => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));
const mockMoneyFormatUsd = moneyFormatUsd as jest.MockedFunction<
  typeof moneyFormatUsd
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

const mockDepositTokens = [
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

const mockUseMoneyEarnableTokens = jest.fn(() => ({
  tokens: mockDepositTokens as ReturnType<typeof Array.from>,
  isNoFeeToken: jest.fn(() => false),
}));

jest.mock('../../hooks/useMoneyEarnableTokens', () => ({
  useMoneyEarnableTokens: () => mockUseMoneyEarnableTokens(),
}));

// Animated Rive graphic pulls in device sensors; not exercised by these tests.
jest.mock('../../components/MoneyNextBestActionParallax', () => ({
  __esModule: true,
  default: () => null,
  PARALLAX_ARTBOARD_FUND: 'Parallax Block 1',
  PARALLAX_ARTBOARD_CARD: 'Parallax Block 2',
}));

jest.mock('../../hooks/useMoneyAccountTransactions', () => ({
  useMoneyAccountTransactions: jest.fn(),
}));

jest.mock('../../hooks/useMoneyAccountApiActivity', () => ({
  useMoneyAccountApiActivity: jest.fn(),
}));

jest.mock(
  '../../components/AccountsApiActivityItem/AccountsApiActivityItem',
  () => {
    const { TouchableOpacity, Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ activity }: { activity: { hash: string } }) => (
        <TouchableOpacity testID={`money-activity-api-${activity.hash}`}>
          <Text>{activity.hash}</Text>
        </TouchableOpacity>
      ),
    };
  },
);

jest.mock('../../hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useRefreshMusdFiatRate', () => ({
  __esModule: true,
  default: jest.fn(() => jest.fn().mockResolvedValue(undefined)),
}));

jest.mock('../../hooks/useMoneyAccountInfo', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../Earn/hooks/useMusdConversion', () => ({
  useMusdConversion: jest.fn(),
}));

jest.mock('../../../Earn/hooks/useMusdBalance', () => ({
  useMusdBalance: jest.fn(),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      navigate: jest.fn(),
    },
  },
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PreferencesController: {
        setPrivacyMode: jest.fn(),
      },
    },
  },
}));

jest.mock('../../utils/moneyFormatFiat', () => ({
  ...jest.requireActual('../../utils/moneyFormatFiat'),
  moneyFormatFiat: jest.fn(() => '$0.12'),
  moneyFormatUsd: jest.fn(() => '$0.12'),
}));

jest.mock('../../../../../selectors/cardController', () => ({
  ...jest.requireActual('../../../../../selectors/cardController'),
  selectIsCardholder: jest.fn(),
  selectHasMetalCard: jest.fn(),
  selectCardHomeDataStatus: jest.fn(() => 'idle'),
  selectIsMoneyAccountDelegatedForCard: jest.fn(() => false),
}));

jest.mock('../../selectors/eligibility', () => ({
  ...jest.requireActual('../../selectors/eligibility'),
  selectIsMoneyAccountGeoEligible: jest.fn(() => true),
}));

jest.mock('../../selectors/featureFlags', () => ({
  ...jest.requireActual('../../selectors/featureFlags'),
  selectMoneyEnableMoneyAccountFlag: jest.fn(() => true),
}));

jest.mock('../../../../../selectors/preferencesController', () => ({
  ...jest.requireActual('../../../../../selectors/preferencesController'),
  selectPrivacyMode: jest.fn(() => false),
}));

jest.mock('../../../Card/hooks/useMoneyAccountCardLinkage', () => ({
  __esModule: true,
  useMoneyAccountCardLinkage: jest.fn(() => ({
    hasMoneyAccountRequirements: false,
    hasMoneyAccountBaseRequirements: false,
    isCardAuthenticated: false,
    isCardVerified: false,
    isCardLinkedToMoneyAccount: false,
    primaryMoneyAccount: undefined,
    moneyAccountCardToken: null,
    canLink: false,
    status: 'idle' as const,
    isLinking: false,
    error: null,
    startLinkFlow: jest.fn(),
    openLinkCardSheet: jest.fn(),
    confirmLinkInBackground: jest.fn(() => Promise.resolve(false)),
    reset: jest.fn(),
  })),
}));

jest.mock('../../../Card/hooks/useCardHomeData', () => ({
  __esModule: true,
  useCardHomeData: jest.fn(() => ({
    data: null,
    isLoading: false,
    isRefreshing: false,
    isError: false,
    refetch: jest.fn(),
    primaryToken: null,
    availableTokens: [],
    fundingTokens: [],
    balanceMap: new Map(),
  })),
}));

jest.mock('../../../Earn/hooks/useMusdBalance', () => ({
  useMusdBalance: jest.fn(() => ({ tokenBalanceAggregated: '0' })),
}));

const mockTrackButtonClicked = jest.fn();
const mockTrackSurfaceClicked = jest.fn();
jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(() => ({
    trackButtonClicked: mockTrackButtonClicked,
    trackTooltipClicked: jest.fn(),
    trackSurfaceClicked: mockTrackSurfaceClicked,
    trackTokenButtonClicked: jest.fn(),
    trackTokenSurfaceClicked: jest.fn(),
    trackActivitySurfaceClicked: jest.fn(),
    trackScreenViewed: jest.fn(),
  })),
}));

jest.mock('../../hooks/useMoneyAccount', () => ({
  useMoneyAccountDeposit: jest.fn(() => ({
    initiateDeposit: mockInitiateDeposit,
  })),
  useMoneyAccountWithdrawal: jest.fn(() => ({
    initiateWithdrawal: jest.fn(() => Promise.resolve()),
  })),
}));

jest.mock('../../hooks/useOnboardingStep', () => ({
  useOnboardingStep: jest.fn(() => ({
    currentStep: 0,
    incrementStep: jest.fn(),
    isVisible: true,
  })),
  STEPPER_IDS: { MONEY: 'money-home-onboarding-stepper' },
}));

const mockSelectIsCardholder = jest.mocked(selectIsCardholder);
const mockSelectHasMetalCard = jest.mocked(selectHasMetalCard);
const mockSelectCardHomeDataStatus = jest.mocked(selectCardHomeDataStatus);
const mockSelectIsMoneyAccountGeoEligible = jest.mocked(
  selectIsMoneyAccountGeoEligible,
);
const mockSelectMoneyEnableMoneyAccountFlag = jest.mocked(
  selectMoneyEnableMoneyAccountFlag,
);
const mockUseMoneyAccountCardLinkage = jest.mocked(useMoneyAccountCardLinkage);
const mockOpenLinkCardSheet = jest.fn();
const mockStartLinkFlow = jest.fn();

const mockUseMoneyAccountTransactions = jest.mocked(
  useMoneyAccountTransactions,
);
const mockUseMoneyAccountApiActivity = jest.mocked(useMoneyAccountApiActivity);

const apiActivityResult = (
  overrides: Partial<ReturnType<typeof useMoneyAccountApiActivity>> = {},
): ReturnType<typeof useMoneyAccountApiActivity> => ({
  activity: [],
  watermark: Number.NEGATIVE_INFINITY,
  isComplete: true,
  pageCount: 1,
  hasMore: false,
  loadMore: jest.fn(),
  isLoadingMore: false,
  isLoading: false,
  error: false,
  refetch: jest.fn(),
  ...overrides,
});

const CARD_TX: AccountsApiActivity = {
  kind: 'card',
  hash: '0xcard1',
  time: 1780574031000,
  chainId: '0x8f',
  token: {
    address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
    symbol: 'mUSD',
    decimals: 6,
  },
  amount: '5381986',
  paidTo: '0x8dFE562Cbb4E93D5029f39DA26BB6B501a8d1D3e',
};

const mockUseMusdBalance = jest.mocked(useMusdBalance);

const mockUseMoneyAccountBalance = jest.mocked(useMoneyAccountBalance);
const mockUseMoneyAccountInfo = jest.mocked(useMoneyAccountInfo);

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

const collectTestIdsInTreeOrder = (
  node: ReactTestInstance,
  testIds: string[] = [],
): string[] => {
  if (typeof node.props?.testID === 'string') {
    testIds.push(node.props.testID);
  }

  node.children.forEach((child) => {
    if (typeof child === 'object' && child !== null && 'props' in child) {
      collectTestIdsInTreeOrder(child as ReactTestInstance, testIds);
    }
  });

  return testIds;
};

const expectTestIdBefore = (
  root: ReactTestInstance,
  earlierTestId: string,
  laterTestId: string,
) => {
  const order = collectTestIdsInTreeOrder(root);
  expect(order.indexOf(earlierTestId)).toBeGreaterThanOrEqual(0);
  expect(order.indexOf(laterTestId)).toBeGreaterThanOrEqual(0);
  expect(order.indexOf(earlierTestId)).toBeLessThan(order.indexOf(laterTestId));
};

describe('MoneyHomeView', () => {
  let defaultMoneyAccountBalance: ReturnType<typeof useMoneyAccountBalance>;

  beforeEach(() => {
    jest.clearAllMocks();
    global.alert = jest.fn();

    // clearAllMocks() resets call history but not a previously-set
    // mockReturnValue, so explicitly restore the default (visible) state.
    jest.mocked(selectPrivacyMode).mockReturnValue(false);

    mockUseMoneyAccountApiActivity.mockReturnValue(apiActivityResult());

    mockInitiateDeposit.mockResolvedValue(undefined);

    mockSelectIsCardholder.mockReturnValue(false);
    mockSelectHasMetalCard.mockReturnValue(false);
    mockSelectCardHomeDataStatus.mockReturnValue('idle');
    mockSelectIsMoneyAccountGeoEligible.mockReturnValue(true);
    mockSelectMoneyEnableMoneyAccountFlag.mockReturnValue(true);

    mockOpenLinkCardSheet.mockReset();
    mockStartLinkFlow.mockReset();
    mockUseMoneyAccountCardLinkage.mockReturnValue({
      hasMoneyAccountRequirements: false,
      hasMoneyAccountBaseRequirements: false,
      isCardAuthenticated: false,
      isCardVerified: false,
      isCardLinkedToMoneyAccount: false,
      primaryMoneyAccount: undefined,
      moneyAccountCardToken: null,
      canLink: false,
      status: 'idle',
      isLinking: false,
      error: null,
      startLinkFlow: mockStartLinkFlow,
      openLinkCardSheet: mockOpenLinkCardSheet,
      reset: jest.fn(),
    } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);

    mockUseMoneyAccountInfo.mockReturnValue({
      hasMoneyAccount: true,
      primaryMoneyAccount: {
        address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
      },
    } as ReturnType<typeof useMoneyAccountInfo>);

    defaultMoneyAccountBalance = {
      totalFiatFormatted: '$3.00',
      totalFiatRaw: '3',
      tokenTotal: new BigNumber('3'),
      withdrawableMusd: undefined,
      isBalanceLoading: false,
      isBalanceFetchError: false,
      isBalanceFetching: false,
      isBalanceUnavailable: false,
      lastKnownTotalFiatFormatted: undefined,
      refetchBalance: mockRefetchBalance,
      apyDecimal: 0.05,
      apyPercent: 5,
      apyPercentFormatted: '5%',
      vaultApyQuery: {
        data: { apy: 0.05, timestamp: '2026-01-01T00:00:00Z' },
        isLoading: false,
      },
      moneyBalanceQuery: {
        data: {
          musdBalance: '1000000',
          vmusdValueInMusd: '2000000',
          totalBalance: '3000000',
        },
        isLoading: false,
      },
    } as unknown as ReturnType<typeof useMoneyAccountBalance>;
    mockUseMoneyAccountBalance.mockReturnValue(defaultMoneyAccountBalance);

    mockUseMusdBalance.mockReturnValue({
      hasMusdBalanceOnAnyChain: true,
      hasMusdBalanceOnChain: () => true,
      tokenBalanceByChain: {},
      fiatBalanceByChain: {},
      fiatBalanceFormattedByChain: {},
      tokenBalanceAggregated: '1',
      fiatBalanceAggregated: '1',
      fiatBalanceAggregatedFormatted: '$1.00',
    } as ReturnType<typeof useMusdBalance>);

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
      mockDataEnabled: false,
    });

    mockRefetchBalance.mockReset();
    mockRefetchBalance.mockResolvedValue([]);
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

  describe('pull to refresh', () => {
    it('calls refetchBalance when refresh control onRefresh runs', async () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      const scrollView = getByTestId(MoneyHomeViewTestIds.SCROLL_VIEW);

      await act(async () => {
        await scrollView.props.refreshControl.props.onRefresh();
      });

      expect(mockRefetchBalance).toHaveBeenCalledTimes(1);
    });

    it('logs refresh failure when refetchBalance rejects', async () => {
      const loggerMock = jest.requireMock('../../../../../util/Logger');
      mockRefetchBalance.mockRejectedValueOnce(new Error('refresh failed'));
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      const scrollView = getByTestId(MoneyHomeViewTestIds.SCROLL_VIEW);

      await act(async () => {
        await scrollView.props.refreshControl.props.onRefresh();
      });

      expect(loggerMock.default.error).toHaveBeenCalledWith(
        expect.any(Error),
        '[MoneyHomeView] Pull-to-refresh failed',
      );
    });
  });

  describe('balance fetch error state', () => {
    beforeEach(() => {
      mockUseMoneyAccountBalance.mockReturnValue({
        totalFiatFormatted: undefined,
        totalFiatRaw: undefined,
        tokenTotal: undefined,
        withdrawableMusd: undefined,
        isBalanceLoading: false,
        isBalanceFetchError: true,
        isBalanceFetching: false,
        isBalanceUnavailable: true,
        lastKnownTotalFiatFormatted: undefined,
        refetchBalance: jest.fn(),
        apyDecimal: 0.05,
        apyPercent: 5,
        apyPercentFormatted: '5%',
        vaultApyQuery: { data: { apy: 0.05 }, isLoading: false },
        moneyBalanceQuery: { data: undefined, isLoading: false },
      } as unknown as ReturnType<typeof useMoneyAccountBalance>);
    });

    it('hides MoneyEarnings on balance fetch error', () => {
      const { queryByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        queryByTestId(MoneyEarningsTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('still renders the balance summary container', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        getByTestId(MoneyBalanceSummaryTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });
  });

  describe('privacy mode', () => {
    const mockSelectPrivacyMode = jest.mocked(selectPrivacyMode);
    const mockSetPrivacyMode = Engine.context.PreferencesController
      .setPrivacyMode as jest.MockedFunction<
      typeof Engine.context.PreferencesController.setPrivacyMode
    >;

    beforeEach(() => {
      mockSelectPrivacyMode.mockReturnValue(false);
      mockSetPrivacyMode.mockClear();
    });

    it('calls setPrivacyMode(true) when the balance is pressed and privacy mode was off', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(
        getByTestId(MoneyBalanceSummaryTestIds.BALANCE_PRESSABLE),
      );

      expect(mockSetPrivacyMode).toHaveBeenCalledWith(true);
    });

    it('calls setPrivacyMode(false) when the balance is pressed and privacy mode was on', () => {
      mockSelectPrivacyMode.mockReturnValue(true);
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(
        getByTestId(MoneyBalanceSummaryTestIds.BALANCE_PRESSABLE),
      );

      expect(mockSetPrivacyMode).toHaveBeenCalledWith(false);
    });

    it('masks the balance when privacy mode is on', () => {
      mockSelectPrivacyMode.mockReturnValue(true);
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(getByTestId(MoneyBalanceSummaryTestIds.BALANCE)).toHaveTextContent(
        '•'.repeat(12),
      );
    });

    it('shows the real balance when privacy mode is off', () => {
      mockSelectPrivacyMode.mockReturnValue(false);
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        getByTestId(MoneyBalanceSummaryTestIds.BALANCE),
      ).not.toHaveTextContent('•'.repeat(12));
    });

    it('masks the earnings values when privacy mode is on', () => {
      mockSelectPrivacyMode.mockReturnValue(true);
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(getByTestId(MoneyEarningsTestIds.MONTHLY_VALUE)).toHaveTextContent(
        '•'.repeat(9),
      );
      expect(getByTestId(MoneyEarningsTestIds.YEARLY_VALUE)).toHaveTextContent(
        '•'.repeat(9),
      );
    });

    it('shows the real earnings values when privacy mode is off', () => {
      mockSelectPrivacyMode.mockReturnValue(false);
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        getByTestId(MoneyEarningsTestIds.MONTHLY_VALUE),
      ).not.toHaveTextContent('•'.repeat(9));
      expect(
        getByTestId(MoneyEarningsTestIds.YEARLY_VALUE),
      ).not.toHaveTextContent('•'.repeat(9));
    });
  });

  describe('displayState precedence matrix', () => {
    it('noAccount — renders no-account message, hides MoneyEarnings', () => {
      mockUseMoneyAccountInfo.mockReturnValue({
        hasMoneyAccount: false,
        primaryMoneyAccount: undefined,
        isMoneyAccountFeatureEnabled: true,
      });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoneyHomeView />,
      );

      expect(
        getByTestId(MoneyBalanceSummaryTestIds.BALANCE_NO_ACCOUNT),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyEarningsTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('renders the unavailable slot whenever there is no fresh balance', () => {
      mockUseMoneyAccountBalance.mockReturnValue({
        totalFiatFormatted: undefined,
        totalFiatRaw: undefined,
        isBalanceLoading: true,
        isBalanceFetchError: true,
        isBalanceFetching: false,
        lastKnownTotalFiatFormatted: undefined,
        refetchBalance: jest.fn(),
        apyPercent: 5,
        vaultApyQuery: { data: { apy: 0.05 }, isLoading: false },
        moneyBalanceQuery: { data: undefined, isLoading: false },
      } as unknown as ReturnType<typeof useMoneyAccountBalance>);

      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoneyHomeView />,
      );

      expect(
        getByTestId(MoneyBalanceSummaryTestIds.BALANCE_UNAVAILABLE),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyBalanceSummaryTestIds.BALANCE),
      ).not.toBeOnTheScreen();
    });

    it('balance — renders balance value and MoneyEarnings', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(getByTestId(MoneyBalanceSummaryTestIds.BALANCE)).toBeOnTheScreen();
      expect(getByTestId(MoneyEarningsTestIds.CONTAINER)).toBeOnTheScreen();
    });

    describe('unavailable — totalFiatFormatted is undefined in non-error, non-loading state', () => {
      beforeEach(() => {
        // Balance queries succeeded (no error, not loading) but
        // totalFiatFormatted is undefined — e.g. musdFiatRate missing.
        mockUseMoneyAccountBalance.mockReturnValue({
          totalFiatFormatted: undefined,
          totalFiatRaw: undefined,
          isBalanceLoading: false,
          isBalanceFetchError: false,
          isBalanceFetching: false,
          refetchBalance: jest.fn(),
          apyPercent: 5,
          vaultApyQuery: { data: { apy: 0.05 }, isLoading: false },
          moneyBalanceQuery: { data: undefined, isLoading: false },
        } as unknown as ReturnType<typeof useMoneyAccountBalance>);
      });

      it('renders the balance-unavailable message', () => {
        const { getByTestId } = renderWithProvider(<MoneyHomeView />);

        expect(
          getByTestId(MoneyBalanceSummaryTestIds.BALANCE_UNAVAILABLE),
        ).toBeOnTheScreen();
      });

      it('hides MoneyEarnings', () => {
        const { queryByTestId } = renderWithProvider(<MoneyHomeView />);

        expect(
          queryByTestId(MoneyEarningsTestIds.CONTAINER),
        ).not.toBeOnTheScreen();
      });

      it('does not render the balance value', () => {
        const { queryByTestId } = renderWithProvider(<MoneyHomeView />);

        expect(
          queryByTestId(MoneyBalanceSummaryTestIds.BALANCE),
        ).not.toBeOnTheScreen();
      });
    });

    describe('dust threshold gating', () => {
      const dustMock = {
        totalFiatFormatted: '$0.00',
        // 0.0001 < DUST_THRESHOLD (0.01) — displays as $0.00 but is above zero
        totalFiatRaw: '0.0001',
        withdrawableMusd: undefined,
        isBalanceLoading: false,
        isBalanceFetchError: false,
        isBalanceFetching: false,
        refetchBalance: jest.fn(),
        apyDecimal: 0.05,
        apyPercent: 5,
        apyPercentFormatted: '5%',
        vaultApyQuery: { data: { apy: 0.05 }, isLoading: false },
        moneyBalanceQuery: { data: undefined, isLoading: false },
      } as unknown as ReturnType<typeof useMoneyAccountBalance>;

      beforeEach(() => {
        mockUseMoneyAccountBalance.mockReturnValue(dustMock);
        mockUseMoneyAccountTransactions.mockReturnValue({
          allTransactions: [],
          deposits: [],
          transfers: [],
          submittedTransactions: [],
          moneyAddress: '0x0000000000000000000000000000000000000001',
          mockDataEnabled: false,
        });
      });

      it('disables Transfer button for sub-cent (dust) balance', () => {
        const { getByTestId } = renderWithProvider(<MoneyHomeView />);
        const transferButton = getByTestId(
          MoneyActionButtonRowTestIds.TRANSFER_BUTTON,
        );
        expect(transferButton.props.accessibilityState?.disabled).toBe(true);
      });

      it('hides MoneyEarnings for dust balance', () => {
        const { queryByTestId } = renderWithProvider(<MoneyHomeView />);
        expect(
          queryByTestId(MoneyEarningsTestIds.CONTAINER),
        ).not.toBeOnTheScreen();
      });

      it('shows unfunded onboarding sections for dust balance', () => {
        const { getByTestId } = renderWithProvider(<MoneyHomeView />);
        expect(getByTestId(MoneyHowItWorksTestIds.CONTAINER)).toBeOnTheScreen();
        expect(getByTestId(MoneyWhatYouGetTestIds.CONTAINER)).toBeOnTheScreen();
      });
    });

    describe('missing-rate (unavailable) state', () => {
      beforeEach(() => {
        mockUseMoneyAccountBalance.mockReturnValue({
          totalFiatFormatted: undefined,
          totalFiatRaw: undefined,
          isBalanceLoading: false,
          isBalanceFetchError: false,
          isBalanceFetching: false,
          isBalanceUnavailable: true,
          lastKnownTotalFiatFormatted: undefined,
          refetchBalance: jest.fn(),
          apyPercent: 5,
          vaultApyQuery: { data: { apy: 0.05 }, isLoading: false },
          moneyBalanceQuery: { data: undefined, isLoading: false },
        } as unknown as ReturnType<typeof useMoneyAccountBalance>);
        mockUseMoneyAccountTransactions.mockReturnValue({
          allTransactions: [],
          deposits: [],
          transfers: [],
          submittedTransactions: [],
          moneyAddress: '0x0000000000000000000000000000000000000001',
          mockDataEnabled: false,
        });
      });

      it('disables Transfer button', () => {
        const { getByTestId } = renderWithProvider(<MoneyHomeView />);
        const transferButton = getByTestId(
          MoneyActionButtonRowTestIds.TRANSFER_BUTTON,
        );
        expect(transferButton.props.accessibilityState?.disabled).toBe(true);
      });

      it('hides MoneyEarnings', () => {
        const { queryByTestId } = renderWithProvider(<MoneyHomeView />);
        expect(
          queryByTestId(MoneyEarningsTestIds.CONTAINER),
        ).not.toBeOnTheScreen();
      });

      it('hides unfunded onboarding sections — does not fake an empty account', () => {
        const { queryByTestId } = renderWithProvider(<MoneyHomeView />);
        expect(
          queryByTestId(MoneyHowItWorksTestIds.CONTAINER),
        ).not.toBeOnTheScreen();
        expect(
          queryByTestId(MoneyWhatYouGetTestIds.CONTAINER),
        ).not.toBeOnTheScreen();
      });
    });

    describe('spendable balance regression guard', () => {
      it('enables Transfer button for a balance above the dust threshold', () => {
        const { getByTestId } = renderWithProvider(<MoneyHomeView />);
        const transferButton = getByTestId(
          MoneyActionButtonRowTestIds.TRANSFER_BUTTON,
        );
        expect(transferButton.props.accessibilityState?.disabled).toBeFalsy();
      });

      it('shows MoneyEarnings for a balance above the dust threshold', () => {
        const { getByTestId } = renderWithProvider(<MoneyHomeView />);
        expect(getByTestId(MoneyEarningsTestIds.CONTAINER)).toBeOnTheScreen();
      });
    });

    it('hides MoneyHowItWorks in noAccount state (displayState is noAccount, not balance)', () => {
      mockUseMoneyAccountInfo.mockReturnValue({
        hasMoneyAccount: false,
        primaryMoneyAccount: undefined,
        isMoneyAccountFeatureEnabled: true,
      });
      mockUseMoneyAccountBalance.mockReturnValue({
        totalFiatFormatted: '$0.00',
        totalFiatRaw: '0',
        isBalanceLoading: false,
        isBalanceFetchError: false,
        isBalanceFetching: false,
        refetchBalance: mockRefetchBalance,
        apyPercent: 5,
        vaultApyQuery: { data: { apy: 0.05 }, isLoading: false },
        moneyBalanceQuery: { data: undefined, isLoading: false },
      } as unknown as ReturnType<typeof useMoneyAccountBalance>);
      mockUseMoneyAccountTransactions.mockReturnValue({
        allTransactions: [],
        deposits: [],
        transfers: [],
        submittedTransactions: [],
        moneyAddress: '0x0000000000000000000000000000000000000001',
        mockDataEnabled: false,
      });

      const { queryByTestId } = renderWithProvider(<MoneyHomeView />);

      // hasBalanceValue is false in noAccount state, so unfunded sections are hidden.
      expect(
        queryByTestId(MoneyHowItWorksTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });
  });

  describe('balance unavailable banner', () => {
    const unavailableMock = (lastKnownTotalFiatFormatted?: string) =>
      ({
        totalFiatFormatted: undefined,
        totalFiatRaw: undefined,
        isAggregatedBalanceLoading: false,
        isBalanceFetchError: true,
        isBalanceFetching: false,
        isBalanceUnavailable: true,
        lastKnownTotalFiatFormatted,
        refetchBalance: jest.fn(),
        apyPercent: 5,
        vaultApyQuery: { data: { apy: 0.05 }, isLoading: false },
        musdBalanceQuery: { data: undefined, isLoading: false },
        musdEquivalentBalanceQuery: { data: undefined, isLoading: false },
      }) as unknown as ReturnType<typeof useMoneyAccountBalance>;

    it('shows the banner with a dash when no last known balance exists', () => {
      mockUseMoneyAccountBalance.mockReturnValue(unavailableMock());

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        getByTestId(MoneyHomeViewTestIds.BALANCE_UNAVAILABLE_BANNER),
      ).toBeOnTheScreen();
      expect(
        getByTestId(MoneyBalanceSummaryTestIds.BALANCE_UNAVAILABLE),
      ).toHaveTextContent(strings('money.balance_unavailable_value'));
    });

    it('shows the banner alongside the last known balance when cached', () => {
      mockUseMoneyAccountBalance.mockReturnValue(unavailableMock('$2,384.34'));

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        getByTestId(MoneyHomeViewTestIds.BALANCE_UNAVAILABLE_BANNER),
      ).toBeOnTheScreen();
      expect(
        getByTestId(MoneyBalanceSummaryTestIds.BALANCE_UNAVAILABLE),
      ).toHaveTextContent('$2,384.34');
    });

    it('hides the banner when the balance loads successfully', () => {
      const { queryByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        queryByTestId(MoneyHomeViewTestIds.BALANCE_UNAVAILABLE_BANNER),
      ).not.toBeOnTheScreen();
    });
  });

  it('hides the how it works section in funded state', () => {
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

  it('hides the what you get section in funded state', () => {
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

  describe('transfer button disabled state', () => {
    beforeEach(() => {
      mockUseMoneyAccountTransactions.mockReturnValue({
        allTransactions: [],
        deposits: [],
        transfers: [],
        submittedTransactions: [],
        moneyAddress: '0x0000000000000000000000000000000000000001',
        mockDataEnabled: false,
      });
    });

    it('disables Transfer button when initial balance is loading', () => {
      mockUseMoneyAccountBalance.mockReturnValue({
        ...defaultMoneyAccountBalance,
        totalFiatFormatted: undefined,
        totalFiatRaw: undefined,
        tokenTotal: undefined,
        isBalanceLoading: true,
        isBalanceFetchError: false,
        isBalanceFetching: true,
        isBalanceUnavailable: false,
      } as unknown as ReturnType<typeof useMoneyAccountBalance>);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      const transferButton = getByTestId(
        MoneyActionButtonRowTestIds.TRANSFER_BUTTON,
      );

      expect(transferButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('disables Transfer button when account has zero balance', () => {
      mockUseMoneyAccountBalance.mockReturnValue({
        ...defaultMoneyAccountBalance,
        totalFiatFormatted: '$0.00',
        totalFiatRaw: '0',
        isBalanceLoading: false,
        isBalanceFetchError: false,
        isBalanceFetching: false,
      } as unknown as ReturnType<typeof useMoneyAccountBalance>);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      const transferButton = getByTestId(
        MoneyActionButtonRowTestIds.TRANSFER_BUTTON,
      );

      expect(transferButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('does not navigate to Transfer sheet when Transfer button is pressed while disabled', () => {
      mockUseMoneyAccountBalance.mockReturnValue({
        ...defaultMoneyAccountBalance,
        totalFiatFormatted: '$0.00',
        totalFiatRaw: '0',
        isBalanceLoading: false,
        isBalanceFetchError: false,
        isBalanceFetching: false,
      } as unknown as ReturnType<typeof useMoneyAccountBalance>);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByTestId(MoneyActionButtonRowTestIds.TRANSFER_BUTTON));

      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.TRANSFER_MONEY_SHEET,
      });
    });
  });

  it('navigates to Card root when Card button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);
    jest.clearAllMocks();

    fireEvent.press(getByTestId(MoneyActionButtonRowTestIds.CARD_BUTTON));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_BUTTON_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      screen: CardScreens.MONEY_HOME,
      entrypoint: CardEntryPoint.MONEY_HOME_ACTION_ROW,
      action: CardActions.MONEY_ACCOUNT_CARD_ACTION_ROW_BUTTON,
    });
    expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
      screen: Routes.CARD.HOME,
      params: { postAuthRedirect: MONEY_HOME_CARD_ORIGIN },
      animation: 'slide_from_bottom',
    });
  });

  it('tracks Card Viewed for the Card action row on render', () => {
    renderWithProvider(<MoneyHomeView />);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_VIEWED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      screen: CardScreens.MONEY_HOME,
      entrypoint: CardEntryPoint.MONEY_HOME_ACTION_ROW,
    });
  });

  it('does not track the MetaMask Card impression while card home data is unsettled (idle status)', () => {
    mockSelectCardHomeDataStatus.mockReturnValue('idle');

    renderWithProvider(<MoneyHomeView />);

    expect(mockAddProperties).not.toHaveBeenCalledWith(
      expect.objectContaining({
        entrypoint: CardEntryPoint.MONEY_HOME_METAMASK_CARD,
      }),
    );
  });

  it('tracks the MetaMask Card impression once the card home data fetch has settled', () => {
    mockSelectCardHomeDataStatus.mockReturnValue('success');

    renderWithProvider(<MoneyHomeView />);

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: CardScreens.MONEY_HOME,
        entrypoint: CardEntryPoint.MONEY_HOME_METAMASK_CARD,
        mode: 'upsell',
        card_state: 'non_cardholder',
      }),
    );
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

    expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
      screen: Routes.CARD.HOME,
      params: { postAuthRedirect: MONEY_HOME_CARD_ORIGIN },
      animation: 'slide_from_bottom',
    });
  });

  it('navigates to potential earnings screen when View potential earnings is pressed', () => {
    mockUseMoneyEarnableTokens.mockReturnValueOnce({
      tokens: Array.from({ length: 6 }, (_, i) => ({
        ...mockDepositTokens[0],
        address:
          `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB${i.toString(16).padStart(2, '0')}` as `0x${string}`,
        fiat: { balance: 5000 },
      })),
      isNoFeeToken: jest.fn(() => false),
    });
    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    fireEvent.press(getByTestId(MoneyPotentialEarningsTestIds.VIEW_ALL_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.POTENTIAL_EARNINGS);
  });

  it('opens the Money landing URL in the in-app browser when learn more is pressed in unfunded state', () => {
    const mockOpenURL = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);

    mockUseMoneyAccountBalance.mockReturnValue({
      totalFiatFormatted: '$0.00',
      totalFiatRaw: '0',
      tokenTotal: new BigNumber(0),
      isBalanceLoading: false,
      isBalanceFetchError: false,
      isBalanceFetching: false,
      refetchBalance: mockRefetchBalance,
      apyPercent: 5,
      vaultApyQuery: { data: { apy: 0.05 }, isLoading: false },
      moneyBalanceQuery: { data: undefined, isLoading: false },
    } as unknown as ReturnType<typeof useMoneyAccountBalance>);
    mockUseMoneyAccountTransactions.mockReturnValue({
      allTransactions: [],
      deposits: [],
      transfers: [],
      submittedTransactions: [],
      moneyAddress: '0x0000000000000000000000000000000000000001',
      mockDataEnabled: false,
    });

    const { getByTestId } = renderWithProvider(<MoneyHomeView />);

    fireEvent.press(getByTestId(MoneyWhatYouGetTestIds.LEARN_MORE_BUTTON));

    expect(mockOpenURL).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: AppConstants.URLS.MONEY_LANDING,
        timestamp: expect.any(Number),
        fromMoney: true,
      },
    });
    mockOpenURL.mockRestore();
  });

  describe('monthly and yearly earnings', () => {
    it('passes the formatted monthly earnings to MoneyEarnings', () => {
      mockMoneyFormatUsd.mockImplementation((value) =>
        String(value) === '0' ? '$0.00' : '$0.12',
      );

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(getByTestId(MoneyEarningsTestIds.MONTHLY_VALUE)).toHaveTextContent(
        '+$0.12',
      );
    });

    it('passes the formatted yearly earnings to MoneyEarnings', () => {
      mockMoneyFormatUsd.mockImplementation((value) =>
        String(value) === '0' ? '$0.00' : '$0.12',
      );

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(getByTestId(MoneyEarningsTestIds.YEARLY_VALUE)).toHaveTextContent(
        '+$0.12',
      );
    });

    it('drops the + prefix when projected earnings round to formatted zero', () => {
      mockMoneyFormatUsd.mockReturnValue('$0.00');
      // totalFiatRaw must be >= DUST_THRESHOLD so hasSpendableBalance is true
      // and MoneyEarnings renders. moneyFormatUsd is mocked to return '$0.00'
      // for all values, exercising the no-plus-prefix path.
      mockUseMoneyAccountBalance.mockReturnValue({
        totalFiatFormatted: '$3.00',
        totalFiatRaw: '3',
        isBalanceLoading: false,
        apyDecimal: 0.05,
        apyPercent: 5,
        apyPercentFormatted: '5%',
        vaultApyQuery: { data: { apy: 0.05 }, isLoading: false },
        moneyBalanceQuery: { data: undefined, isLoading: false },
      } as ReturnType<typeof useMoneyAccountBalance>);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(getByTestId(MoneyEarningsTestIds.MONTHLY_VALUE)).toHaveTextContent(
        /^\$0\.00$/,
      );
      expect(getByTestId(MoneyEarningsTestIds.YEARLY_VALUE)).toHaveTextContent(
        /^\$0\.00$/,
      );
    });

    it('hides MoneyEarnings when totalFiatFormatted is absent in non-error, non-loading state', () => {
      // Prevents inconsistent UI where "Balance unavailable" headline pairs
      // with concrete "$0.00" projected earnings — that mismatch was the bug.
      mockMoneyFormatUsd.mockReturnValue('$0.00');
      mockUseMoneyAccountBalance.mockReturnValue({
        totalFiatFormatted: undefined,
        totalFiatRaw: undefined,
        tokenTotal: undefined,
        isBalanceLoading: false,
        isBalanceFetchError: false,
        isBalanceFetching: false,
        refetchBalance: jest.fn(),
        apyDecimal: 0.05,
        apyPercent: 5,
        apyPercentFormatted: '5%',
        vaultApyQuery: { data: { apy: 0.05 }, isLoading: false },
        moneyBalanceQuery: { data: undefined, isLoading: false },
      } as unknown as ReturnType<typeof useMoneyAccountBalance>);

      const { queryByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        queryByTestId(MoneyEarningsTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(MoneyEarningsTestIds.MONTHLY_VALUE),
      ).not.toBeOnTheScreen();
    });
  });

  describe('funded state (positive balance)', () => {
    beforeEach(() => {
      mockUseMoneyAccountTransactions.mockReturnValue({
        allTransactions: Array.from({ length: 3 }, (_, index) => ({
          ...MOCK_MONEY_TRANSACTIONS[index % MOCK_MONEY_TRANSACTIONS.length],
          id: `funded-${index}`,
        })),
        deposits: [],
        transfers: [],
        submittedTransactions: [],
        moneyAddress: '0x0000000000000000000000000000000000000001',
        mockDataEnabled: false,
      });
    });

    it('renders the activity list', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(getByTestId(MoneyActivityListTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('renders Accounts-API rows in the activity list', () => {
      mockUseMoneyAccountApiActivity.mockReturnValue(
        apiActivityResult({ activity: [CARD_TX] }),
      );

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        getByTestId(`money-activity-api-${CARD_TX.hash}`),
      ).toBeOnTheScreen();
    });

    it('does not render Accounts-API rows in mock-data mode', () => {
      mockUseMoneyAccountTransactions.mockReturnValue({
        allTransactions: Array.from({ length: 3 }, (_, index) => ({
          ...MOCK_MONEY_TRANSACTIONS[index % MOCK_MONEY_TRANSACTIONS.length],
          id: `mock-mode-${index}`,
        })),
        deposits: [],
        transfers: [],
        submittedTransactions: [],
        moneyAddress: '0x0000000000000000000000000000000000000001',
        mockDataEnabled: true,
      });
      mockUseMoneyAccountApiActivity.mockReturnValue(
        apiActivityResult({ activity: [CARD_TX] }),
      );

      const { queryByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(queryByTestId(`money-activity-api-${CARD_TX.hash}`)).toBeNull();
    });

    it('hides the Activity View all button with 5 or fewer transactions', () => {
      const { queryByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(
        queryByTestId(MoneyActivityListTestIds.VIEW_ALL_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('renders condensed info cards', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(
        getByTestId(MoneyCondensedInfoCardsTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('navigates to HowItWorks when the condensed how-it-works card is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(
        getByTestId(MoneyCondensedInfoCardsTestIds.HOW_IT_WORKS_CARD),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.HOW_IT_WORKS);
    });

    it('opens the mUSD price URL when the condensed mUSD card is pressed', () => {
      const mockOpenURL = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByTestId(MoneyCondensedInfoCardsTestIds.MUSD_CARD));

      expect(mockOpenURL).toHaveBeenCalledWith(AppConstants.URLS.MUSD_PRICE);
      expect(mockTrackSurfaceClicked).toHaveBeenCalledWith({
        component_name: COMPONENT_NAMES.MONEY_CONDENSED_INFO_CARDS_MUSD,
        redirect_target: MONEY_URLS.MUSD_PRICE,
      });
      mockOpenURL.mockRestore();
    });

    it('opens the Money landing URL in the in-app browser when the condensed What you get card is pressed', () => {
      const mockOpenURL = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(
        getByTestId(MoneyCondensedInfoCardsTestIds.WHAT_YOU_GET_CARD),
      );

      expect(mockOpenURL).not.toHaveBeenCalledWith(
        AppConstants.URLS.MONEY_LANDING,
      );
      expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: AppConstants.URLS.MONEY_LANDING,
          timestamp: expect.any(Number),
          fromMoney: true,
        },
      });
      mockOpenURL.mockRestore();
    });

    it('renders a single bottom Add money footer', () => {
      const { getAllByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(getAllByTestId(MoneyFooterTestIds.CONTAINER)).toHaveLength(1);
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
  });

  describe('card-unlinked state (funded + has cardholder)', () => {
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
        mockDataEnabled: false,
      });
      mockSelectIsCardholder.mockReturnValue(true);
      // Money Account ↔ card requirements met (incl. VEDA allowlisted) so the
      // link CTA is offered.
      mockUseMoneyAccountCardLinkage.mockReturnValue({
        hasMoneyAccountRequirements: true,
        hasMoneyAccountBaseRequirements: true,
        isCardAuthenticated: false,
        isCardLinkedToMoneyAccount: false,
        primaryMoneyAccount: { address: '0xabc' },
        moneyAccountCardToken: { symbol: 'veda' },
        canLink: false,
        status: 'idle',
        isLinking: false,
        error: null,
        startLinkFlow: mockStartLinkFlow,
        openLinkCardSheet: mockOpenLinkCardSheet,
        reset: jest.fn(),
      } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);
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

    it('delegates to startLinkFlow with the Money home origin when MetaMaskCard link button is tapped', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByTestId(MoneyMetaMaskCardTestIds.LINK_BUTTON));

      expect(mockStartLinkFlow).toHaveBeenCalledTimes(1);
      expect(mockStartLinkFlow).toHaveBeenCalledWith({
        ...MONEY_HOME_CARD_ORIGIN,
        entrypoint: CardEntryPoint.MONEY_HOME_METAMASK_CARD,
      });
      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
      });
      expect(mockOpenLinkCardSheet).not.toHaveBeenCalled();
    });

    describe('fully ready for inline linking (canLink=true)', () => {
      beforeEach(() => {
        mockUseMoneyAccountCardLinkage.mockReturnValue({
          hasMoneyAccountRequirements: true,
          hasMoneyAccountBaseRequirements: true,
          isCardAuthenticated: true,
          isCardVerified: true,
          isCardLinkedToMoneyAccount: false,
          primaryMoneyAccount: { address: '0xabc' },
          moneyAccountCardToken: { symbol: 'USDC' },
          canLink: true,
          status: 'idle',
          isLinking: false,
          error: null,
          startLinkFlow: mockStartLinkFlow,
          openLinkCardSheet: mockOpenLinkCardSheet,
          reset: jest.fn(),
        } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);
      });

      it('still calls startLinkFlow (not openLinkCardSheet directly) when MetaMaskCard link button is tapped', async () => {
        const { getByTestId } = renderWithProvider(<MoneyHomeView />);

        await act(async () => {
          fireEvent.press(getByTestId(MoneyMetaMaskCardTestIds.LINK_BUTTON));
        });

        expect(mockStartLinkFlow).toHaveBeenCalledTimes(1);
        expect(mockStartLinkFlow).toHaveBeenCalledWith({
          ...MONEY_HOME_CARD_ORIGIN,
          entrypoint: CardEntryPoint.MONEY_HOME_METAMASK_CARD,
        });
        expect(mockNavigate).not.toHaveBeenCalledWith(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
        });
      });
    });
  });

  describe('unfunded state (zero balance)', () => {
    beforeEach(() => {
      mockUseMoneyAccountBalance.mockReturnValue({
        totalFiatFormatted: '$0.00',
        totalFiatRaw: '0',
        tokenTotal: new BigNumber(0),
        withdrawableMusd: undefined,
        isBalanceLoading: false,
        isBalanceFetchError: false,
        isBalanceFetching: false,
        refetchBalance: mockRefetchBalance,
        apyDecimal: 0.05,
        apyPercent: 5,
        apyPercentFormatted: '5%',
        vaultApyQuery: { data: { apy: 0.05 }, isLoading: false },
        moneyBalanceQuery: { data: undefined, isLoading: false },
      } as unknown as ReturnType<typeof useMoneyAccountBalance>);
      mockUseMoneyAccountTransactions.mockReturnValue({
        allTransactions: [],
        deposits: [],
        transfers: [],
        submittedTransactions: [],
        moneyAddress: '0x0000000000000000000000000000000000000001',
        mockDataEnabled: false,
      });
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

    it('hides MoneyEarnings for a brand-new account with no activity', () => {
      const { queryByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        queryByTestId(MoneyEarningsTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('renders a single Add money footer alongside the mUSD token row', () => {
      const { getAllByTestId, getByTestId } = renderWithProvider(
        <MoneyHomeView />,
      );

      expect(getByTestId(MoneyMusdTokenRowTestIds.CONTAINER)).toBeOnTheScreen();
      expect(getAllByTestId(MoneyFooterTestIds.CONTAINER)).toHaveLength(1);
    });

    it('shows the mUSD token row balance in USD, not the preferred currency', () => {
      // mUSD is USD-pegged, so the row must use the USD-formatted token balance
      // (moneyFormatUsd) — never the preferred-currency string.
      mockMoneyFormatUsd.mockReturnValue('$1.00');
      mockUseMusdBalance.mockReturnValue({
        tokenBalanceAggregated: '1',
        fiatBalanceAggregatedFormatted: '€99.00',
      } as ReturnType<typeof useMusdBalance>);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      const row = getByTestId(MoneyMusdTokenRowTestIds.CONTAINER);
      expect(within(row).getByText('$1.00 • mUSD')).toBeOnTheScreen();
      expect(within(row).queryByText(/€99\.00/)).not.toBeOnTheScreen();
    });

    it('masks the mUSD token row balance when privacy mode is on', () => {
      mockMoneyFormatUsd.mockReturnValue('$1.00');
      mockUseMusdBalance.mockReturnValue({
        tokenBalanceAggregated: '1',
        fiatBalanceAggregatedFormatted: '€99.00',
      } as ReturnType<typeof useMusdBalance>);
      jest.mocked(selectPrivacyMode).mockReturnValue(true);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(getByTestId(MoneyMusdTokenRowTestIds.SUBTITLE)).toHaveTextContent(
        '•'.repeat(6),
      );
    });

    it('opens the Add money sheet from the empty-state footer', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByTestId(MoneyFooterTestIds.ADD_MONEY_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
      });
      expect(mockTrackButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
        label_key: 'money.footer.add_money',
        component_name: COMPONENT_NAMES.MONEY_FOOTER,
        redirect_target: BOTTOM_SHEET_NAMES.MONEY_ADD_MONEY_SHEET,
      });
    });

    it('initiates a deposit without preselection when the mUSD row Add button is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByTestId(MoneyMusdTokenRowTestIds.ADD_BUTTON));

      expect(mockInitiateDeposit).toHaveBeenCalledTimes(1);
      expect(mockInitiateDeposit).toHaveBeenCalledWith();
      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
      });
    });

    it('logs an error when the mUSD row deposit rejects', async () => {
      mockInitiateDeposit.mockRejectedValueOnce(new Error('network failure'));
      const Logger = jest.requireMock('../../../../../util/Logger');

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByTestId(MoneyMusdTokenRowTestIds.ADD_BUTTON));

      await Promise.resolve();

      expect(Logger.default.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          message: expect.stringContaining('mUSD row'),
        }),
      );
    });

    it('tracks the mUSD row Add click with the deposit redirect target', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByTestId(MoneyMusdTokenRowTestIds.ADD_BUTTON));

      expect(mockTrackButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
        label_key: 'money.musd_row.add',
        component_name: COMPONENT_NAMES.MONEY_MUSD_TOKEN_SECTION,
        redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
      });
    });

    it('opens the mUSD price URL when the mUSD token row is pressed', () => {
      const NavigationService = jest.requireMock(
        '../../../../../core/NavigationService',
      ).default;
      const mockOpenURL = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByTestId(MoneyMusdTokenRowTestIds.CONTAINER));

      expect(mockOpenURL).toHaveBeenCalledWith(AppConstants.URLS.MUSD_PRICE);
      expect(NavigationService.navigation.navigate).not.toHaveBeenCalled();
      expect(mockTrackSurfaceClicked).toHaveBeenCalledWith({
        component_name: COMPONENT_NAMES.MONEY_MUSD_TOKEN_SECTION,
        redirect_target: MONEY_URLS.MUSD_PRICE,
      });
      mockOpenURL.mockRestore();
    });

    it('navigates to HowItWorks when its section header is pressed', () => {
      const { getByText } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByText(strings('money.how_it_works.title')));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.HOW_IT_WORKS);
    });

    it('opens the Money landing URL in the in-app browser when Learn more is pressed', () => {
      const mockOpenURL = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined);
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByTestId(MoneyWhatYouGetTestIds.LEARN_MORE_BUTTON));

      expect(mockOpenURL).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: AppConstants.URLS.MONEY_LANDING,
          timestamp: expect.any(Number),
          fromMoney: true,
        },
      });
      mockOpenURL.mockRestore();
    });
  });

  describe('activity preview still settling (empty bucket, more pages pending)', () => {
    beforeEach(() => {
      // A funded account whose local tx history is empty and whose first
      // Accounts-API page parsed to zero preview rows, with more pages still
      // to fetch (isComplete: false). This is the window where the section
      // used to vanish entirely — no rows and no spinner.
      mockUseMoneyAccountBalance.mockReturnValue(defaultMoneyAccountBalance);
      mockUseMoneyAccountTransactions.mockReturnValue({
        allTransactions: [],
        deposits: [],
        transfers: [],
        submittedTransactions: [],
        moneyAddress: '0x0000000000000000000000000000000000000001',
        mockDataEnabled: false,
      });
      mockUseMoneyAccountApiActivity.mockReturnValue(
        apiActivityResult({
          activity: [],
          isLoading: false,
          isLoadingMore: true,
          isComplete: false,
          hasMore: true,
          pageCount: 1,
        }),
      );
    });

    it('keeps the activity loading skeleton on screen instead of hiding the section', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoneyHomeView />,
      );

      expect(
        getByTestId(MoneyActivityLoadingTestIds.CONTAINER),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyActivityListTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('drops the skeleton once the empty list is exhaustive (isComplete)', () => {
      mockUseMoneyAccountApiActivity.mockReturnValue(
        apiActivityResult({
          activity: [],
          isLoading: false,
          isLoadingMore: false,
          isComplete: true,
          hasMore: false,
        }),
      );

      const { queryByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        queryByTestId(MoneyActivityLoadingTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(MoneyActivityListTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('drops the skeleton once the auto-fill page budget is exhausted', () => {
      // Still-empty bucket with pages remaining, but the fill budget is
      // spent: the fetch loop has stopped, so the skeleton must settle
      // rather than spin forever.
      mockUseMoneyAccountApiActivity.mockReturnValue(
        apiActivityResult({
          activity: [],
          isLoading: false,
          isLoadingMore: false,
          isComplete: false,
          hasMore: true,
          pageCount: AUTO_FILL_MAX_PAGES,
        }),
      );

      const { queryByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        queryByTestId(MoneyActivityLoadingTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(MoneyActivityListTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('drops the skeleton when the fetch fails (error is terminal)', () => {
      mockUseMoneyAccountApiActivity.mockReturnValue(
        apiActivityResult({
          activity: [],
          isLoading: false,
          isLoadingMore: false,
          isComplete: true,
          hasMore: false,
          error: true,
        }),
      );

      const { queryByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        queryByTestId(MoneyActivityLoadingTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });
  });

  describe('balance not ready (loading state)', () => {
    beforeEach(() => {
      mockUseMoneyAccountBalance.mockReturnValue({
        totalFiatFormatted: undefined,
        totalFiatRaw: undefined,
        isBalanceLoading: true,
        isBalanceFetchError: false,
        isBalanceFetching: false,
        refetchBalance: mockRefetchBalance,
        apyPercent: 5,
        vaultApyQuery: { data: { apy: 0.05 }, isLoading: false },
        moneyBalanceQuery: { data: undefined, isLoading: false },
      } as unknown as ReturnType<typeof useMoneyAccountBalance>);
      mockUseMoneyAccountTransactions.mockReturnValue({
        allTransactions: [],
        deposits: [],
        transfers: [],
        submittedTransactions: [],
        moneyAddress: '0x0000000000000000000000000000000000000001',
        mockDataEnabled: false,
      });
    });

    it('renders neither the funded nor the unfunded blocks', () => {
      const { queryByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        queryByTestId(MoneyCondensedInfoCardsTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(MoneyHowItWorksTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(MoneyWhatYouGetTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });
  });

  describe('spent-to-zero (zero balance with activity)', () => {
    beforeEach(() => {
      mockUseMoneyAccountBalance.mockReturnValue({
        totalFiatFormatted: '$0.00',
        totalFiatRaw: '0',
        tokenTotal: new BigNumber(0),
        withdrawableMusd: undefined,
        isBalanceLoading: false,
        isBalanceFetchError: false,
        isBalanceFetching: false,
        refetchBalance: mockRefetchBalance,
        apyDecimal: 0.05,
        apyPercent: 5,
        apyPercentFormatted: '5%',
        vaultApyQuery: { data: { apy: 0.05 }, isLoading: false },
        moneyBalanceQuery: { data: undefined, isLoading: false },
      } as unknown as ReturnType<typeof useMoneyAccountBalance>);
      mockUseMoneyAccountTransactions.mockReturnValue({
        allTransactions: Array.from({ length: 3 }, (_, index) => ({
          ...MOCK_MONEY_TRANSACTIONS[index % MOCK_MONEY_TRANSACTIONS.length],
          id: `spent-to-zero-${index}`,
        })),
        deposits: [],
        transfers: [],
        submittedTransactions: [],
        moneyAddress: '0x0000000000000000000000000000000000000001',
        mockDataEnabled: false,
      });
    });

    it('renders condensed info cards', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(
        getByTestId(MoneyCondensedInfoCardsTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders MoneyEarnings when balance is zero but activity exists', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(getByTestId(MoneyEarningsTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('renders a single bottom Add money footer', () => {
      const { getAllByTestId } = renderWithProvider(<MoneyHomeView />);
      expect(getAllByTestId(MoneyFooterTestIds.CONTAINER)).toHaveLength(1);
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
  });

  describe('navigation handlers', () => {
    it('navigates to Potential Earnings when View all is pressed on potential earnings section', () => {
      mockUseMoneyEarnableTokens.mockReturnValueOnce({
        tokens: Array.from({ length: 6 }, (_, i) => ({
          ...mockDepositTokens[0],
          address:
            `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB${i.toString(16).padStart(2, '0')}` as `0x${string}`,
          fiat: { balance: 5000 },
        })),
        isNoFeeToken: jest.fn(() => false),
      });
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(
        getByTestId(MoneyPotentialEarningsTestIds.VIEW_ALL_BUTTON),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MONEY.POTENTIAL_EARNINGS,
      );
    });

    it('initiates a deposit when a token Convert button is pressed', async () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      const potentialEarnings = getByTestId(
        MoneyPotentialEarningsTestIds.CONTAINER,
      );
      fireEvent.press(
        within(potentialEarnings).getByText(
          strings('money.potential_earnings.add'),
        ),
      );

      expect(mockInitiateDeposit).toHaveBeenCalledWith(
        expect.objectContaining({
          preferredPaymentToken: expect.objectContaining({
            address: mockDepositTokens[0].address,
          }),
        }),
      );
    });

    it('logs an error when initiateDeposit rejects', async () => {
      mockInitiateDeposit.mockRejectedValueOnce(new Error('network failure'));
      const Logger = jest.requireMock('../../../../../util/Logger');

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      const potentialEarnings = getByTestId(
        MoneyPotentialEarningsTestIds.CONTAINER,
      );
      fireEvent.press(
        within(potentialEarnings).getByText(
          strings('money.potential_earnings.add'),
        ),
      );

      await Promise.resolve();

      expect(Logger.default.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          message: expect.stringContaining('MoneyHomeView'),
        }),
      );
    });
  });

  describe('card upsell mode — Get Now handler', () => {
    it('navigates to Card root when the Get Now card row is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByTestId(MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: { postAuthRedirect: MONEY_HOME_CARD_ORIGIN },
        animation: 'slide_from_bottom',
      });
    });
  });

  describe('MetaMask card mode selection', () => {
    it('selects mode="manage" when card is linked to money account', () => {
      mockSelectIsCardholder.mockReturnValue(true);
      mockUseMoneyAccountCardLinkage.mockReturnValue({
        hasMoneyAccountRequirements: false,
        hasMoneyAccountBaseRequirements: false,
        isCardAuthenticated: false,
        isCardLinkedToMoneyAccount: true,
        primaryMoneyAccount: undefined,
        moneyAccountCardToken: null,
        canLink: false,
        status: 'idle',
        isLinking: false,
        error: null,
        startLinkFlow: mockStartLinkFlow,
        openLinkCardSheet: mockOpenLinkCardSheet,
        reset: jest.fn(),
      } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.MANAGE_CONTAINER),
      ).toBeOnTheScreen();
    });

    it('selects mode="link" when cardholder but not linked', () => {
      mockSelectIsCardholder.mockReturnValue(true);
      mockUseMoneyAccountCardLinkage.mockReturnValue({
        hasMoneyAccountRequirements: true,
        hasMoneyAccountBaseRequirements: true,
        isCardAuthenticated: false,
        isCardLinkedToMoneyAccount: false,
        primaryMoneyAccount: { address: '0xabc' },
        moneyAccountCardToken: { symbol: 'veda' },
        canLink: false,
        status: 'idle',
        isLinking: false,
        error: null,
        startLinkFlow: mockStartLinkFlow,
        openLinkCardSheet: mockOpenLinkCardSheet,
        reset: jest.fn(),
      } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.LINK_CONTAINER),
      ).toBeOnTheScreen();
    });

    it('selects mode="link" for unauthenticated cardholder when base requirements are met but VEDA is unavailable', () => {
      mockSelectIsCardholder.mockReturnValue(true);
      mockUseMoneyAccountCardLinkage.mockReturnValue({
        hasMoneyAccountRequirements: false,
        hasMoneyAccountBaseRequirements: true,
        isCardAuthenticated: false,
        isCardVerified: false,
        isCardLinkedToMoneyAccount: false,
        primaryMoneyAccount: { address: '0xabc' },
        moneyAccountCardToken: null,
        canLink: false,
        status: 'idle',
        isLinking: false,
        error: null,
        startLinkFlow: mockStartLinkFlow,
        openLinkCardSheet: mockOpenLinkCardSheet,
        reset: jest.fn(),
      } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.LINK_CONTAINER),
      ).toBeOnTheScreen();
      expect(
        getByTestId(MoneyMetaMaskCardTestIds.LINK_BUTTON),
      ).toBeOnTheScreen();
    });

    it('hides the card section when cardholder but VEDA is not allowlisted (cannot link)', () => {
      mockSelectIsCardholder.mockReturnValue(true);
      mockUseMoneyAccountCardLinkage.mockReturnValue({
        hasMoneyAccountRequirements: false,
        hasMoneyAccountBaseRequirements: false,
        isCardAuthenticated: true,
        isCardLinkedToMoneyAccount: false,
        primaryMoneyAccount: { address: '0xabc' },
        moneyAccountCardToken: null,
        canLink: false,
        status: 'idle',
        isLinking: false,
        error: null,
        startLinkFlow: mockStartLinkFlow,
        openLinkCardSheet: mockOpenLinkCardSheet,
        reset: jest.fn(),
      } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);

      const { queryByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.LINK_CONTAINER),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('hides the card section when residency is blocked', () => {
      mockSelectIsCardholder.mockReturnValue(true);
      mockUseMoneyAccountCardLinkage.mockReturnValue({
        hasMoneyAccountRequirements: true,
        isCardAuthenticated: true,
        isCardVerified: true,
        isCardLinkedToMoneyAccount: false,
        isResidencyBlocked: true,
        primaryMoneyAccount: { address: '0xabc' },
        moneyAccountCardToken: { symbol: 'veda' },
        canLink: false,
        status: 'idle',
        isLinking: false,
        error: null,
        startLinkFlow: mockStartLinkFlow,
        openLinkCardSheet: mockOpenLinkCardSheet,
        reset: jest.fn(),
      } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);

      const { queryByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.LINK_CONTAINER),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('still shows manage mode when residency is blocked but card is already linked', () => {
      mockSelectIsCardholder.mockReturnValue(true);
      mockUseMoneyAccountCardLinkage.mockReturnValue({
        hasMoneyAccountRequirements: true,
        isCardAuthenticated: true,
        isCardVerified: true,
        isCardLinkedToMoneyAccount: true,
        isResidencyBlocked: true,
        primaryMoneyAccount: { address: '0xabc' },
        moneyAccountCardToken: { symbol: 'veda' },
        canLink: false,
        status: 'idle',
        isLinking: false,
        error: null,
        startLinkFlow: mockStartLinkFlow,
        openLinkCardSheet: mockOpenLinkCardSheet,
        reset: jest.fn(),
      } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.MANAGE_CONTAINER),
      ).toBeOnTheScreen();
    });

    it('selects mode="link" for cardholder even with zero transactions', () => {
      mockSelectIsCardholder.mockReturnValue(true);
      mockUseMoneyAccountCardLinkage.mockReturnValue({
        hasMoneyAccountRequirements: true,
        hasMoneyAccountBaseRequirements: true,
        isCardAuthenticated: false,
        isCardLinkedToMoneyAccount: false,
        primaryMoneyAccount: { address: '0xabc' },
        moneyAccountCardToken: { symbol: 'veda' },
        canLink: false,
        status: 'idle',
        isLinking: false,
        error: null,
        startLinkFlow: mockStartLinkFlow,
        openLinkCardSheet: mockOpenLinkCardSheet,
        reset: jest.fn(),
      } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);
      mockUseMoneyAccountTransactions.mockReturnValue({
        allTransactions: [],
        deposits: [],
        transfers: [],
        submittedTransactions: [],
        moneyAddress: '0x0000000000000000000000000000000000000001',
        mockDataEnabled: false,
      });

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.LINK_BUTTON),
      ).toBeOnTheScreen();
    });

    it('selects mode="upsell" when not cardholder', () => {
      mockSelectIsCardholder.mockReturnValue(false);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW),
      ).toBeOnTheScreen();
    });

    it('hides the upsell MetaMask Card when the Money account is not visible', () => {
      mockSelectIsCardholder.mockReturnValue(false);
      mockSelectIsMoneyAccountGeoEligible.mockReturnValue(false);

      const { queryByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('hides the verifying MetaMask Card when the Money account is not visible', () => {
      mockSelectIsCardholder.mockReturnValue(false);
      mockSelectIsMoneyAccountGeoEligible.mockReturnValue(false);
      mockUseMoneyAccountCardLinkage.mockReturnValue({
        hasMoneyAccountRequirements: true,
        hasMoneyAccountBaseRequirements: true,
        isCardAuthenticated: true,
        isCardVerified: false,
        isCardLinkedToMoneyAccount: false,
        primaryMoneyAccount: { address: '0xabc' },
        moneyAccountCardToken: { symbol: 'USDC' },
        canLink: false,
        status: 'idle',
        isLinking: false,
        error: null,
        startLinkFlow: mockStartLinkFlow,
        openLinkCardSheet: mockOpenLinkCardSheet,
        reset: jest.fn(),
      } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);

      const { queryByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('renders upsell MetaMask Card below Activity and Earn on your crypto', () => {
      mockSelectIsCardholder.mockReturnValue(false);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      const scrollRoot = getByTestId(MoneyHomeViewTestIds.SCROLL_VIEW);

      expectTestIdBefore(
        scrollRoot,
        MoneyActivityListTestIds.CONTAINER,
        MoneyMetaMaskCardTestIds.CONTAINER,
      );
      expectTestIdBefore(
        scrollRoot,
        MoneyPotentialEarningsTestIds.CONTAINER,
        MoneyMetaMaskCardTestIds.CONTAINER,
      );
    });

    it('renders link MetaMask Card above Activity and Earn on your crypto', () => {
      mockSelectIsCardholder.mockReturnValue(true);
      mockUseMoneyAccountCardLinkage.mockReturnValue({
        hasMoneyAccountRequirements: true,
        hasMoneyAccountBaseRequirements: true,
        isCardAuthenticated: false,
        isCardLinkedToMoneyAccount: false,
        primaryMoneyAccount: { address: '0xabc' },
        moneyAccountCardToken: { symbol: 'veda' },
        canLink: false,
        status: 'idle',
        isLinking: false,
        error: null,
        startLinkFlow: mockStartLinkFlow,
        openLinkCardSheet: mockOpenLinkCardSheet,
        reset: jest.fn(),
      } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      const scrollRoot = getByTestId(MoneyHomeViewTestIds.SCROLL_VIEW);

      expectTestIdBefore(
        scrollRoot,
        MoneyMetaMaskCardTestIds.CONTAINER,
        MoneyActivityListTestIds.CONTAINER,
      );
      expectTestIdBefore(
        scrollRoot,
        MoneyMetaMaskCardTestIds.CONTAINER,
        MoneyPotentialEarningsTestIds.CONTAINER,
      );
    });

    it('selects mode="link" when card-authenticated and VERIFIED even if selected wallet is not a cardholder account', () => {
      mockSelectIsCardholder.mockReturnValue(false);
      mockUseMoneyAccountCardLinkage.mockReturnValue({
        hasMoneyAccountRequirements: true,
        hasMoneyAccountBaseRequirements: true,
        isCardAuthenticated: true,
        isCardVerified: true,
        isCardLinkedToMoneyAccount: false,
        primaryMoneyAccount: { address: '0xabc' },
        moneyAccountCardToken: { symbol: 'USDC' },
        canLink: true,
        status: 'idle',
        isLinking: false,
        error: null,
        startLinkFlow: mockStartLinkFlow,
        openLinkCardSheet: mockOpenLinkCardSheet,
        reset: jest.fn(),
      } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.LINK_CONTAINER),
      ).toBeOnTheScreen();
    });

    it('shows the MetaMask Card section with verification banner when authenticated but not VERIFIED', () => {
      mockSelectIsCardholder.mockReturnValue(false);
      mockUseMoneyAccountCardLinkage.mockReturnValue({
        hasMoneyAccountRequirements: true,
        hasMoneyAccountBaseRequirements: true,
        isCardAuthenticated: true,
        isCardVerified: false,
        isCardLinkedToMoneyAccount: false,
        primaryMoneyAccount: { address: '0xabc' },
        moneyAccountCardToken: { symbol: 'USDC' },
        canLink: false,
        status: 'idle',
        isLinking: false,
        error: null,
        startLinkFlow: mockStartLinkFlow,
        openLinkCardSheet: mockOpenLinkCardSheet,
        reset: jest.fn(),
      } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);

      const { getByTestId, getByText } = renderWithProvider(<MoneyHomeView />);

      expect(getByTestId(MoneyMetaMaskCardTestIds.CONTAINER)).toBeOnTheScreen();
      expect(
        getByTestId(MoneyMetaMaskCardTestIds.VERIFYING_BANNER),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('money.metamask_card.verification_pending')),
      ).toBeOnTheScreen();
    });

    it('disables the link button when linkage is in progress', () => {
      mockSelectIsCardholder.mockReturnValue(true);
      mockUseMoneyAccountCardLinkage.mockReturnValue({
        hasMoneyAccountRequirements: true,
        hasMoneyAccountBaseRequirements: true,
        isCardAuthenticated: false,
        isCardLinkedToMoneyAccount: false,
        primaryMoneyAccount: { address: '0xabc' },
        moneyAccountCardToken: { symbol: 'veda' },
        canLink: false,
        status: 'idle',
        isLinking: true,
        error: null,
        startLinkFlow: mockStartLinkFlow,
        openLinkCardSheet: mockOpenLinkCardSheet,
        reset: jest.fn(),
      } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      const linkButton = getByTestId(MoneyMetaMaskCardTestIds.LINK_BUTTON);

      expect(linkButton.props.accessibilityState?.disabled).toBe(true);
      fireEvent.press(linkButton);
      expect(mockStartLinkFlow).not.toHaveBeenCalled();
    });

    it('navigates to Card root when Manage is pressed in manage mode', () => {
      mockSelectIsCardholder.mockReturnValue(true);
      mockUseMoneyAccountCardLinkage.mockReturnValue({
        hasMoneyAccountRequirements: false,
        hasMoneyAccountBaseRequirements: false,
        isCardAuthenticated: false,
        isCardLinkedToMoneyAccount: true,
        primaryMoneyAccount: undefined,
        moneyAccountCardToken: null,
        canLink: false,
        status: 'idle',
        isLinking: false,
        error: null,
        startLinkFlow: mockStartLinkFlow,
        openLinkCardSheet: mockOpenLinkCardSheet,
        reset: jest.fn(),
      } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByTestId(MoneyMetaMaskCardTestIds.MANAGE_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: { postAuthRedirect: MONEY_HOME_CARD_ORIGIN },
      });
    });

    it('navigates to Card root with push animation when Card button is pressed in manage mode', () => {
      mockSelectIsCardholder.mockReturnValue(true);
      mockUseMoneyAccountCardLinkage.mockReturnValue({
        hasMoneyAccountRequirements: false,
        hasMoneyAccountBaseRequirements: false,
        isCardAuthenticated: false,
        isCardLinkedToMoneyAccount: true,
        primaryMoneyAccount: undefined,
        moneyAccountCardToken: null,
        canLink: false,
        status: 'idle',
        isLinking: false,
        error: null,
        startLinkFlow: mockStartLinkFlow,
        openLinkCardSheet: mockOpenLinkCardSheet,
        reset: jest.fn(),
      } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);
      jest.clearAllMocks();

      fireEvent.press(getByTestId(MoneyActionButtonRowTestIds.CARD_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: { postAuthRedirect: MONEY_HOME_CARD_ORIGIN },
      });
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.CARD.ROOT,
        expect.objectContaining({ animation: 'slide_from_bottom' }),
      );
    });
  });

  describe('manage card balance', () => {
    const mockUseCardHomeData = jest.mocked(
      jest.requireMock('../../../Card/hooks/useCardHomeData').useCardHomeData,
    );
    const baseCardHomeData = {
      data: null,
      isLoading: false,
      isRefreshing: false,
      isError: false,
      refetch: jest.fn(),
      availableTokens: [],
      fundingTokens: [],
      balanceMap: new Map(),
    };

    afterEach(() => {
      mockUseCardHomeData.mockReturnValue({
        ...baseCardHomeData,
        primaryToken: null,
      });
    });

    const linkedCardLinkage = {
      hasMoneyAccountRequirements: false,
      hasMoneyAccountBaseRequirements: false,
      isCardAuthenticated: false,
      isCardLinkedToMoneyAccount: true,
      primaryMoneyAccount: undefined,
      moneyAccountCardToken: null,
      canLink: false,
      status: 'idle',
      isLinking: false,
      error: null,
      startLinkFlow: mockStartLinkFlow,
      openLinkCardSheet: mockOpenLinkCardSheet,
      reset: jest.fn(),
    } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>;

    // EUR/ETH = 900, USD/ETH = 1000 -> fiat->USD factor is 1000/900 = 10/9.
    const eurCurrencyRatesState = {
      engine: {
        backgroundState: {
          CurrencyRateController: {
            currentCurrency: 'eur',
            currencyRates: {
              ETH: {
                conversionDate: 0,
                conversionRate: 900,
                usdConversionRate: 1000,
              },
            },
          },
        },
      },
    };

    beforeEach(() => {
      mockMoneyFormatUsd.mockImplementation(
        (value: BigNumber) => `$${value.toFixed(2)}`,
      );
    });

    it('converts a non-Money primary token raw fiat number to USD', () => {
      mockSelectIsCardholder.mockReturnValue(true);
      mockUseMoneyAccountCardLinkage.mockReturnValue(linkedCardLinkage);
      mockUseCardHomeData.mockReturnValue({
        ...baseCardHomeData,
        primaryToken: {
          balanceFiat: '€90.00',
          rawFiatNumber: 90,
          isMoneyAccountEntry: false,
        } as unknown as ReturnType<
          typeof useMoneyAccountCardLinkage
        >['primaryMoneyAccount'],
      });

      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: eurCurrencyRatesState,
      });

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.MANAGE_BALANCE),
      ).toHaveTextContent('$100.00');
    });

    it('renders the Money Account USD raw fiat number without reconverting it', () => {
      mockSelectIsCardholder.mockReturnValue(true);
      mockUseMoneyAccountCardLinkage.mockReturnValue(linkedCardLinkage);
      mockUseCardHomeData.mockReturnValue({
        ...baseCardHomeData,
        primaryToken: {
          balanceFiat: '$100.00',
          rawFiatNumber: 100,
          isMoneyAccountEntry: true,
        } as unknown as ReturnType<
          typeof useMoneyAccountCardLinkage
        >['primaryMoneyAccount'],
      });

      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: eurCurrencyRatesState,
      });

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.MANAGE_BALANCE),
      ).toHaveTextContent('$100.00');
    });

    it('falls back to formatted zero when card home data has no primary token', () => {
      mockSelectIsCardholder.mockReturnValue(true);
      mockUseMoneyAccountCardLinkage.mockReturnValue(linkedCardLinkage);
      mockUseCardHomeData.mockReturnValue({
        ...baseCardHomeData,
        primaryToken: null,
      });

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.MANAGE_BALANCE),
      ).toHaveTextContent('$0.00');
    });

    it('renders the Money Account USD balance when currency rates are unavailable', () => {
      mockSelectIsCardholder.mockReturnValue(true);
      mockUseMoneyAccountCardLinkage.mockReturnValue(linkedCardLinkage);
      mockUseCardHomeData.mockReturnValue({
        ...baseCardHomeData,
        primaryToken: {
          balanceFiat: '$90.00',
          rawFiatNumber: 90,
          isMoneyAccountEntry: true,
        } as unknown as ReturnType<
          typeof useMoneyAccountCardLinkage
        >['primaryMoneyAccount'],
      });

      const { getByTestId } = renderWithProvider(<MoneyHomeView />);

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.MANAGE_BALANCE),
      ).toHaveTextContent('$90.00');
    });

    it('masks the Card manage balance when privacy mode is on', () => {
      mockSelectIsCardholder.mockReturnValue(true);
      mockUseMoneyAccountCardLinkage.mockReturnValue(linkedCardLinkage);
      mockUseCardHomeData.mockReturnValue({
        ...baseCardHomeData,
        primaryToken: {
          balanceFiat: '€90.00',
          rawFiatNumber: 90,
          isMoneyAccountEntry: true,
        } as unknown as ReturnType<
          typeof useMoneyAccountCardLinkage
        >['primaryMoneyAccount'],
      });
      jest.mocked(selectPrivacyMode).mockReturnValue(true);

      const { getByTestId } = renderWithProvider(<MoneyHomeView />, {
        state: eurCurrencyRatesState,
      });

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.MANAGE_BALANCE),
      ).toHaveTextContent('•'.repeat(9));
    });
  });

  describe('hasMetalCard selector wiring', () => {
    it('uses 3% cashback copy in link mode when user holds a Metal card', () => {
      mockSelectIsCardholder.mockReturnValue(true);
      mockSelectHasMetalCard.mockReturnValue(true);
      mockUseMoneyAccountCardLinkage.mockReturnValue({
        hasMoneyAccountRequirements: true,
        hasMoneyAccountBaseRequirements: true,
        isCardAuthenticated: false,
        isCardLinkedToMoneyAccount: false,
        primaryMoneyAccount: { address: '0xabc' },
        moneyAccountCardToken: { symbol: 'veda' },
        canLink: false,
        status: 'idle',
        isLinking: false,
        error: null,
        startLinkFlow: mockStartLinkFlow,
        openLinkCardSheet: mockOpenLinkCardSheet,
        reset: jest.fn(),
      } as unknown as ReturnType<typeof useMoneyAccountCardLinkage>);

      const { getByText } = renderWithProvider(<MoneyHomeView />);

      expect(getByText('Get 3% mUSD back')).toBeOnTheScreen();
    });
  });

  describe('Get now navigation', () => {
    it('navigates to the card sign-up flow when the virtual card Get now button is pressed', () => {
      const { getByText } = renderWithProvider(<MoneyHomeView />);

      fireEvent.press(getByText(strings('money.metamask_card.get_now')));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: { postAuthRedirect: MONEY_HOME_CARD_ORIGIN },
        animation: 'slide_from_bottom',
      });
    });
  });
});
