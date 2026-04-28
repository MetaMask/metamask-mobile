import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyAccountHomeRow from './MoneyAccountHomeRow';
import { MoneyAccountHomeRowTestIds } from './MoneyAccountHomeRow.testIds';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';

const mockNavigate = jest.fn();
const mockNavigateToCash = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../../../Views/Homepage/Sections/Cash/useCashNavigation', () => ({
  useCashNavigation: () => ({
    navigateToCash: mockNavigateToCash,
  }),
}));

jest.mock('../../hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseMoneyAccountBalance = jest.mocked(useMoneyAccountBalance);

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

describe('MoneyAccountHomeRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAccountBalance.mockReturnValue(createBalanceMock());
  });

  describe('empty variant', () => {
    it('renders the empty container testID', () => {
      const { getByTestId } = renderWithProvider(
        <MoneyAccountHomeRow variant="empty" />,
      );

      expect(
        getByTestId(MoneyAccountHomeRowTestIds.EMPTY_CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the "Get started" button', () => {
      const { getByTestId } = renderWithProvider(
        <MoneyAccountHomeRow variant="empty" />,
      );

      expect(
        getByTestId(MoneyAccountHomeRowTestIds.GET_STARTED_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders the APY tag with "Earn" prefix', () => {
      const { getByTestId } = renderWithProvider(
        <MoneyAccountHomeRow variant="empty" />,
      );

      expect(getByTestId(MoneyAccountHomeRowTestIds.APY_TAG)).toHaveTextContent(
        strings('homepage.sections.cash_empty_state.earn_apy', {
          percentage: 4,
        }),
      );
    });

    it('navigates to Money home when "Get started" is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <MoneyAccountHomeRow variant="empty" />,
      );

      fireEvent.press(
        getByTestId(MoneyAccountHomeRowTestIds.GET_STARTED_BUTTON),
      );

      expect(mockNavigateToCash).toHaveBeenCalledTimes(1);
    });
  });

  describe('funded variant', () => {
    it('renders the funded container testID', () => {
      const { getByTestId } = renderWithProvider(
        <MoneyAccountHomeRow variant="funded" />,
      );

      expect(
        getByTestId(MoneyAccountHomeRowTestIds.FUNDED_CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the "Add" button', () => {
      const { getByTestId } = renderWithProvider(
        <MoneyAccountHomeRow variant="funded" />,
      );

      expect(
        getByTestId(MoneyAccountHomeRowTestIds.ADD_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders the balance from useMoneyAccountBalance', () => {
      const { getByTestId } = renderWithProvider(
        <MoneyAccountHomeRow variant="funded" />,
      );

      expect(getByTestId(MoneyAccountHomeRowTestIds.BALANCE)).toHaveTextContent(
        '$1,000.00',
      );
    });

    it('renders the APY tag without "Earn" prefix', () => {
      const { getByTestId } = renderWithProvider(
        <MoneyAccountHomeRow variant="funded" />,
      );

      expect(getByTestId(MoneyAccountHomeRowTestIds.APY_TAG)).toHaveTextContent(
        strings('homepage.sections.cash_filled_state.apy', { percentage: 4 }),
      );
    });

    it('opens the Add money sheet when "Add" is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <MoneyAccountHomeRow variant="funded" />,
      );

      fireEvent.press(getByTestId(MoneyAccountHomeRowTestIds.ADD_BUTTON));

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
        <MoneyAccountHomeRow variant="funded" />,
      );

      expect(
        getByTestId(MoneyAccountHomeRowTestIds.BALANCE_SKELETON),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyAccountHomeRowTestIds.BALANCE),
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
        <MoneyAccountHomeRow variant="funded" />,
      );

      expect(
        getByTestId(MoneyAccountHomeRowTestIds.APY_TAG_SKELETON),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyAccountHomeRowTestIds.APY_TAG),
      ).not.toBeOnTheScreen();
    });

    it('renders balance and APY values when data has loaded', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoneyAccountHomeRow variant="funded" />,
      );

      expect(getByTestId(MoneyAccountHomeRowTestIds.BALANCE)).toBeOnTheScreen();
      expect(getByTestId(MoneyAccountHomeRowTestIds.APY_TAG)).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyAccountHomeRowTestIds.BALANCE_SKELETON),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(MoneyAccountHomeRowTestIds.APY_TAG_SKELETON),
      ).not.toBeOnTheScreen();
    });
  });
});
