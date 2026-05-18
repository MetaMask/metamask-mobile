import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyBalanceCard from './MoneyBalanceCard';
import { MoneyBalanceCardTestIds } from './MoneyBalanceCard.testIds';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
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

describe('MoneyBalanceCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAccountBalance.mockReturnValue(createBalanceMock());
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

    it('renders the balance as $0.00', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.BALANCE)).toHaveTextContent(
        '$0.00',
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
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      const button = getByTestId(MoneyBalanceCardTestIds.EARN_BUTTON);
      expect(button).toBeOnTheScreen();
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

    it('falls back to $0.00 when totalFiatFormatted is undefined but totalFiatRaw is non-zero', () => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({
          totalFiatRaw: '1000',
          totalFiatFormatted: undefined,
        }),
      );

      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.BALANCE)).toHaveTextContent(
        '$0.00',
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
});
