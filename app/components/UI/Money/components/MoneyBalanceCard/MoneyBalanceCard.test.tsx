import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { ButtonVariant } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyBalanceCard from './MoneyBalanceCard';
import { MoneyBalanceCardTestIds } from './MoneyBalanceCard.testIds';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import useMoneyAccountInfo from '../../hooks/useMoneyAccountInfo';
import { selectMoneyOnboardingSeen } from '../../../../../reducers/user/selectors';
import { selectWalletHomeOnboardingFlowVisible } from '../../../../../selectors/onboarding';
import { useMoneyNavigation } from '../../hooks/useMoneyNavigation';

const mockNavigate = jest.fn();
const mockNavigateToMoneyHome = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useMoneyAccountInfo', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useMoneyNavigation', () => ({
  __esModule: true,
  useMoneyNavigation: jest.fn(),
}));

jest.mock('../../../../../reducers/user/selectors', () => ({
  __esModule: true,
  selectMoneyOnboardingSeen: jest.fn(),
}));

jest.mock('../../../../../selectors/onboarding', () => ({
  __esModule: true,
  selectWalletHomeOnboardingFlowVisible: jest.fn(),
}));

const mockUseMoneyAccountBalance = jest.mocked(useMoneyAccountBalance);
const mockUseMoneyAccountInfo = jest.mocked(useMoneyAccountInfo);
const mockSelectMoneyOnboardingSeen = jest.mocked(selectMoneyOnboardingSeen);
const mockSelectWalletHomeOnboardingFlowVisible = jest.mocked(
  selectWalletHomeOnboardingFlowVisible,
);
const mockUseMoneyNavigation = jest.mocked(useMoneyNavigation);

const createBalanceMock = (
  overrides: Partial<ReturnType<typeof useMoneyAccountBalance>> = {},
) =>
  ({
    totalFiatFormatted: '$1,000.00',
    totalFiatRaw: '1000',
    tokenTotal: undefined,
    isAggregatedBalanceLoading: false,
    isBalanceFetchError: false,
    isBalanceFetching: false,
    refetchBalance: jest.fn(),
    apyDecimal: 0.04,
    apyPercent: 4,
    apyPercentFormatted: '4%',
    vaultApyQuery: {
      data: { apy: 0.04, timestamp: '2026-01-01T00:00:00Z' },
      isLoading: false,
    },
    musdBalanceQuery: {
      data: { balance: '1000000000' },
      isLoading: false,
    },
    musdEquivalentBalanceQuery: {
      data: {
        musdEquivalentValue: '0',
        musdSHFvdBalance: '0',
        exchangeRate: '1000000',
      },
      isLoading: false,
    },
    musdFiatFormatted: '$1,000.00',
    musdSHFvdFiatFormatted: '$0.00',
    ...overrides,
  }) as ReturnType<typeof useMoneyAccountBalance>;

const createInfoMock = (
  overrides: Partial<ReturnType<typeof useMoneyAccountInfo>> = {},
): ReturnType<typeof useMoneyAccountInfo> =>
  ({
    isMoneyAccountFeatureEnabled: true,
    hasMoneyAccount: true,
    primaryMoneyAccount: {
      address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    },
    ...overrides,
  }) as ReturnType<typeof useMoneyAccountInfo>;

describe('MoneyBalanceCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAccountBalance.mockReturnValue(createBalanceMock());
    mockUseMoneyAccountInfo.mockReturnValue(createInfoMock());
    mockSelectMoneyOnboardingSeen.mockReturnValue(true);
    mockSelectWalletHomeOnboardingFlowVisible.mockReturnValue(false);
    mockUseMoneyNavigation.mockReturnValue({
      navigateToMoneyHome: mockNavigateToMoneyHome,
    });
  });

  describe('when balance is empty (totalFiatRaw undefined)', () => {
    beforeEach(() => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({
          totalFiatRaw: undefined,
          totalFiatFormatted: undefined,
        }),
      );
    });

    it('renders the empty container testID', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        getByTestId(MoneyBalanceCardTestIds.EMPTY_CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the balance-unavailable message when totalFiatFormatted is undefined', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.BALANCE)).toHaveTextContent(
        strings('money.balance_unavailable'),
      );
    });

    it('renders the Earn button with the earn label', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoneyBalanceCard />,
      );

      expect(
        getByTestId(MoneyBalanceCardTestIds.EARN_BUTTON),
      ).toHaveTextContent(strings('homepage.sections.money_empty_state.earn'));
      expect(
        queryByTestId(MoneyBalanceCardTestIds.ADD_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('renders the Earn button as a primary variant', () => {
      const { getByTestId, UNSAFE_getByProps } = renderWithProvider(
        <MoneyBalanceCard />,
      );

      expect(
        getByTestId(MoneyBalanceCardTestIds.EARN_BUTTON),
      ).toBeOnTheScreen();
      expect(
        UNSAFE_getByProps({
          testID: MoneyBalanceCardTestIds.EARN_BUTTON,
          variant: ButtonVariant.Primary,
        }).props.variant,
      ).toBe(ButtonVariant.Primary);
    });

    it('opens the Add money sheet (and not the Money home) when Earn is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.EARN_BUTTON));

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
      });
    });

    it('renders the label', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.LABEL)).toHaveTextContent(
        strings('money.balance_card.label'),
      );
    });

    it('renders the empty container and Earn button when totalFiatRaw is the string zero', () => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({ totalFiatRaw: '0', totalFiatFormatted: '$0.00' }),
      );

      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoneyBalanceCard />,
      );

      expect(
        getByTestId(MoneyBalanceCardTestIds.EMPTY_CONTAINER),
      ).toBeOnTheScreen();
      expect(
        getByTestId(MoneyBalanceCardTestIds.EARN_BUTTON),
      ).toHaveTextContent(strings('homepage.sections.money_empty_state.earn'));
      expect(
        queryByTestId(MoneyBalanceCardTestIds.ADD_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });

  describe('when balance is empty and onboarding has not been seen', () => {
    beforeEach(() => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({
          totalFiatRaw: undefined,
          totalFiatFormatted: undefined,
        }),
      );
      mockSelectMoneyOnboardingSeen.mockReturnValue(false);
    });

    it('renders the new-user container testID', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        getByTestId(MoneyBalanceCardTestIds.NEW_USER_CONTAINER),
      ).toBeOnTheScreen();
    });

    it('does not render the Add button', () => {
      const { queryByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        queryByTestId(MoneyBalanceCardTestIds.ADD_BUTTON),
      ).not.toBeOnTheScreen();
    });

    describe('when the wallet-home onboarding stepper is not displayed', () => {
      beforeEach(() => {
        mockSelectWalletHomeOnboardingFlowVisible.mockReturnValue(false);
      });

      it('renders the Earn button with the earn label', () => {
        const { getByTestId, queryByTestId } = renderWithProvider(
          <MoneyBalanceCard />,
        );

        expect(
          getByTestId(MoneyBalanceCardTestIds.EARN_BUTTON),
        ).toHaveTextContent(
          strings('homepage.sections.money_empty_state.earn'),
        );
        expect(
          queryByTestId(MoneyBalanceCardTestIds.GET_STARTED_BUTTON),
        ).not.toBeOnTheScreen();
      });

      it('still renders the new-user container', () => {
        const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

        expect(
          getByTestId(MoneyBalanceCardTestIds.NEW_USER_CONTAINER),
        ).toBeOnTheScreen();
      });

      it('calls navigateToMoneyHome when Earn is pressed', () => {
        const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

        fireEvent.press(getByTestId(MoneyBalanceCardTestIds.EARN_BUTTON));

        expect(mockNavigateToMoneyHome).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the wallet-home onboarding stepper is displayed', () => {
      beforeEach(() => {
        mockSelectWalletHomeOnboardingFlowVisible.mockReturnValue(true);
      });

      it('renders the Get started button with the get_started label', () => {
        const { getByTestId, queryByTestId } = renderWithProvider(
          <MoneyBalanceCard />,
        );

        expect(
          getByTestId(MoneyBalanceCardTestIds.GET_STARTED_BUTTON),
        ).toHaveTextContent(
          strings('homepage.sections.money_empty_state.get_started'),
        );
        expect(
          queryByTestId(MoneyBalanceCardTestIds.EARN_BUTTON),
        ).not.toBeOnTheScreen();
      });

      it('still renders the new-user container', () => {
        const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

        expect(
          getByTestId(MoneyBalanceCardTestIds.NEW_USER_CONTAINER),
        ).toBeOnTheScreen();
      });

      it('calls navigateToMoneyHome when Get started is pressed', () => {
        const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

        fireEvent.press(
          getByTestId(MoneyBalanceCardTestIds.GET_STARTED_BUTTON),
        );

        expect(mockNavigateToMoneyHome).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('when balance is funded', () => {
    it('renders the funded container testID', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        getByTestId(MoneyBalanceCardTestIds.FUNDED_CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the balance from useMoneyAccountBalance', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.BALANCE)).toHaveTextContent(
        '$1,000.00',
      );
    });

    it('renders the Add button with the add label and not the Earn button', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoneyBalanceCard />,
      );

      expect(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON)).toHaveTextContent(
        strings('money.balance_card.add'),
      );
      expect(
        queryByTestId(MoneyBalanceCardTestIds.EARN_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('renders the APY tag', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.APY_TAG)).toHaveTextContent(
        /4% APY/,
      );
    });

    it('renders the mUSD currency suffix next to the APY value', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.APY_TAG)).toHaveTextContent(
        /• mUSD/,
      );
    });
  });

  describe('navigation', () => {
    it('calls navigateToMoneyHome when the card body is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.FUNDED_CONTAINER));

      expect(mockNavigateToMoneyHome).toHaveBeenCalledTimes(1);
    });

    it('opens the Add money sheet when Add is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
      });
    });

    it('opens the Money balance info sheet when the info icon is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.INFO_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.MONEY_BALANCE_INFO_SHEET,
      });
    });

    it('opens the Add money sheet (and not the Money home) when Earn is pressed in empty state', () => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({
          totalFiatRaw: undefined,
          totalFiatFormatted: undefined,
        }),
      );

      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.EARN_BUTTON));

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
      });
    });
  });

  describe('loading states', () => {
    it('renders balance skeleton when balance is loading', () => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({ isAggregatedBalanceLoading: true }),
      );

      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoneyBalanceCard />,
      );

      expect(
        getByTestId(MoneyBalanceCardTestIds.BALANCE_SKELETON),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyBalanceCardTestIds.BALANCE),
      ).not.toBeOnTheScreen();
    });

    it('renders APY skeleton when APY is loading', () => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({
          vaultApyQuery: {
            data: undefined,
            isLoading: true,
          } as ReturnType<typeof useMoneyAccountBalance>['vaultApyQuery'],
        }),
      );

      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoneyBalanceCard />,
      );

      expect(
        getByTestId(MoneyBalanceCardTestIds.APY_TAG_SKELETON),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyBalanceCardTestIds.APY_TAG),
      ).not.toBeOnTheScreen();
    });

    it('renders balance and APY values when data has loaded', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoneyBalanceCard />,
      );

      expect(getByTestId(MoneyBalanceCardTestIds.BALANCE)).toBeOnTheScreen();
      expect(getByTestId(MoneyBalanceCardTestIds.APY_TAG)).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyBalanceCardTestIds.BALANCE_SKELETON),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(MoneyBalanceCardTestIds.APY_TAG_SKELETON),
      ).not.toBeOnTheScreen();
    });

    it('renders the APY tag with 0 when apyPercent is undefined', () => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({ apyPercent: undefined }),
      );

      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.APY_TAG)).toHaveTextContent(
        /0% APY/,
      );
    });
  });

  describe('layout resilience', () => {
    it('keeps the APY tag and Add button on screen when the balance is very long', () => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({
          totalFiatRaw: '999999999990',
          totalFiatFormatted: '$999,999,999,999.99',
        }),
      );

      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.BALANCE)).toHaveTextContent(
        '$999,999,999,999.99',
      );
      expect(getByTestId(MoneyBalanceCardTestIds.APY_TAG)).toBeOnTheScreen();
      expect(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON)).toBeOnTheScreen();
    });
  });

  describe('error state', () => {
    beforeEach(() => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({
          isBalanceFetchError: true,
          isBalanceFetching: false,
          totalFiatFormatted: undefined,
          totalFiatRaw: undefined,
        }),
      );
    });

    it('renders the error container testID', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        getByTestId(MoneyBalanceCardTestIds.ERROR_CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the balance-unavailable message', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        getByTestId(MoneyBalanceCardTestIds.BALANCE_ERROR),
      ).toBeOnTheScreen();
    });

    it('renders the retry button', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        getByTestId(MoneyBalanceCardTestIds.BALANCE_RETRY),
      ).toBeOnTheScreen();
    });

    it('does not render the balance text', () => {
      const { queryByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        queryByTestId(MoneyBalanceCardTestIds.BALANCE),
      ).not.toBeOnTheScreen();
    });

    it('does not render $0.00 as the balance', () => {
      const { queryByText } = renderWithProvider(<MoneyBalanceCard />);

      expect(queryByText('$0.00')).not.toBeOnTheScreen();
    });

    it('calls refetchBalance when the retry button is pressed', () => {
      const mockRefetch = jest.fn();
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({
          isBalanceFetchError: true,
          isBalanceFetching: false,
          totalFiatFormatted: undefined,
          totalFiatRaw: undefined,
          refetchBalance: mockRefetch,
        }),
      );

      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.BALANCE_RETRY));

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('retrying state (error + fetching)', () => {
    it('renders the balance skeleton', () => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({
          isBalanceFetchError: true,
          isBalanceFetching: true,
          totalFiatFormatted: undefined,
          totalFiatRaw: undefined,
        }),
      );

      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoneyBalanceCard />,
      );

      expect(
        getByTestId(MoneyBalanceCardTestIds.BALANCE_SKELETON),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyBalanceCardTestIds.BALANCE_ERROR),
      ).not.toBeOnTheScreen();
    });
  });

  describe('featureDisabled state', () => {
    beforeEach(() => {
      mockUseMoneyAccountInfo.mockReturnValue(
        createInfoMock({ isMoneyAccountFeatureEnabled: false }),
      );
    });

    it('renders the feature-disabled message in the balance slot', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        getByTestId(MoneyBalanceCardTestIds.BALANCE_FEATURE_DISABLED),
      ).toHaveTextContent(strings('money.balance_feature_disabled'));
    });

    it('does not render the balance text', () => {
      const { queryByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        queryByTestId(MoneyBalanceCardTestIds.BALANCE),
      ).not.toBeOnTheScreen();
    });

    it('does not render the balance error message', () => {
      const { queryByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        queryByTestId(MoneyBalanceCardTestIds.BALANCE_ERROR),
      ).not.toBeOnTheScreen();
    });
  });

  describe('noAccount state', () => {
    beforeEach(() => {
      mockUseMoneyAccountInfo.mockReturnValue(
        createInfoMock({
          isMoneyAccountFeatureEnabled: true,
          hasMoneyAccount: false,
          primaryMoneyAccount: undefined,
        }),
      );
    });

    it('renders the no-account message in the balance slot', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        getByTestId(MoneyBalanceCardTestIds.BALANCE_NO_ACCOUNT),
      ).toHaveTextContent(strings('money.balance_no_account'));
    });

    it('does not render the balance text', () => {
      const { queryByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        queryByTestId(MoneyBalanceCardTestIds.BALANCE),
      ).not.toBeOnTheScreen();
    });

    it('does not render the balance error message', () => {
      const { queryByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        queryByTestId(MoneyBalanceCardTestIds.BALANCE_ERROR),
      ).not.toBeOnTheScreen();
    });
  });
});
