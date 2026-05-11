import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyBalanceCard from './MoneyBalanceCard';
import { MoneyBalanceCardTestIds } from './MoneyBalanceCard.testIds';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { selectMusdConversionEducationSeen } from '../../../../../reducers/user/selectors';

const mockNavigate = jest.fn();

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

jest.mock('../../../../../reducers/user/selectors', () => ({
  __esModule: true,
  selectMusdConversionEducationSeen: jest.fn(),
}));

const mockUseMoneyAccountBalance = jest.mocked(useMoneyAccountBalance);
const mockSelectMusdConversionEducationSeen = jest.mocked(
  selectMusdConversionEducationSeen,
);

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
    mockSelectMusdConversionEducationSeen.mockReturnValue(true);
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

    it('renders the Add button', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON)).toBeOnTheScreen();
    });

    it('renders the label', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.LABEL)).toHaveTextContent(
        strings('money.balance_card.label'),
      );
    });

    it('renders the empty container when totalFiatRaw is the string zero', () => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({ totalFiatRaw: '0', totalFiatFormatted: '$0.00' }),
      );

      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        getByTestId(MoneyBalanceCardTestIds.EMPTY_CONTAINER),
      ).toBeOnTheScreen();
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
      mockSelectMusdConversionEducationSeen.mockReturnValue(false);
    });

    it('renders the new-user container testID', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        getByTestId(MoneyBalanceCardTestIds.NEW_USER_CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the Get started button', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        getByTestId(MoneyBalanceCardTestIds.GET_STARTED_BUTTON),
      ).toHaveTextContent(
        strings('homepage.sections.money_empty_state.get_started'),
      );
    });

    it('does not render the Add button', () => {
      const { queryByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        queryByTestId(MoneyBalanceCardTestIds.ADD_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('navigates to the conversion education flow when Get started is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.GET_STARTED_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
        screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
        params: {
          returnTo: {
            screen: Routes.MONEY.ROOT,
            params: { screen: Routes.MONEY.HOME },
          },
        },
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

    it('renders the Add button', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON)).toBeOnTheScreen();
    });

    it('renders the APY tag', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.APY_TAG)).toHaveTextContent(
        strings('money.apy_label', { percentage: 4 }),
      );
    });

    it('renders the mUSD currency suffix next to the APY value', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.APY_TAG)).toHaveTextContent(
        strings('money.apy_currency_suffix').trim(),
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
    it('navigates to MONEY home when the card body is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.FUNDED_CONTAINER));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ROOT, {
        screen: Routes.MONEY.HOME,
      });
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

    it('opens the Add money sheet (and not the Money home) when Add is pressed in empty state', () => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({
          totalFiatRaw: undefined,
          totalFiatFormatted: undefined,
        }),
      );

      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON));

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
        strings('money.apy_label', { percentage: 0 }),
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
