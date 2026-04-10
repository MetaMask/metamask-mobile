import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useMoneyAccountTransactions } from '../../hooks/useMoneyAccountTransactions';
import MOCK_MONEY_TRANSACTIONS from '../../constants/mockActivityData';
import {
  isMoneyActivityDeposit,
  isMoneyActivityTransfer,
} from '../../constants/moneyActivityFilters';
import MoneyActivityView from './MoneyActivityView';
import { MoneyActivityViewTestIds } from './MoneyActivityView.testIds';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: jest.fn(),
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 48, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('../../hooks/useMoneyAccountTransactions', () => ({
  useMoneyAccountTransactions: jest.fn(),
}));

jest.mock('../../components/MoneyActivityItem/MoneyActivityItem', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ tx }: { tx: { id: string } }) => (
      <View testID={`activity-mock-tx-${tx.id}`}>
        <Text>{tx.id}</Text>
      </View>
    ),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'money.activity.title': 'Activity',
      'money.activity.empty': 'No activity yet',
      'money.activity.filter_all': 'All',
      'money.activity.filter_deposits': 'Deposits',
      'money.activity.filter_transfers': 'Transfers',
    };
    return map[key] ?? key;
  },
}));

const mockUseMoneyAccountTransactions = jest.mocked(
  useMoneyAccountTransactions,
);

const MOCK_DEPOSITS = MOCK_MONEY_TRANSACTIONS.filter(isMoneyActivityDeposit);
const MOCK_TRANSFERS = MOCK_MONEY_TRANSACTIONS.filter(isMoneyActivityTransfer);

describe('MoneyActivityView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAccountTransactions.mockReturnValue({
      allTransactions: MOCK_MONEY_TRANSACTIONS,
      deposits: MOCK_DEPOSITS,
      transfers: MOCK_TRANSFERS,
      submittedTransactions: [],
      moneyAddress: '0x0000000000000000000000000000000000000001',
    });
  });

  it('renders the main container', () => {
    const { getByTestId } = renderWithProvider(<MoneyActivityView />);

    expect(getByTestId(MoneyActivityViewTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('renders the activity title', () => {
    const { getByTestId } = renderWithProvider(<MoneyActivityView />);

    expect(getByTestId(MoneyActivityViewTestIds.TITLE)).toBeOnTheScreen();
  });

  it('renders filter controls', () => {
    const { getByTestId } = renderWithProvider(<MoneyActivityView />);

    expect(getByTestId(MoneyActivityViewTestIds.FILTER_ALL)).toBeOnTheScreen();
    expect(
      getByTestId(MoneyActivityViewTestIds.FILTER_DEPOSITS),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyActivityViewTestIds.FILTER_TRANSFERS),
    ).toBeOnTheScreen();
  });

  it('pressing the back button calls navigation.goBack', () => {
    const { getByTestId } = renderWithProvider(<MoneyActivityView />);

    fireEvent.press(getByTestId(MoneyActivityViewTestIds.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders transaction rows from activity data', () => {
    const { getByTestId } = renderWithProvider(<MoneyActivityView />);

    expect(getByTestId('activity-mock-tx-money-tx-1')).toBeOnTheScreen();
  });

  it('renders empty state when there are no transactions', () => {
    mockUseMoneyAccountTransactions.mockReturnValue({
      allTransactions: [],
      deposits: [],
      transfers: [],
      submittedTransactions: [],
      moneyAddress: '0x0000000000000000000000000000000000000001',
    });

    const { getByTestId } = renderWithProvider(<MoneyActivityView />);

    expect(getByTestId(MoneyActivityViewTestIds.EMPTY_LIST)).toBeOnTheScreen();
    expect(
      getByTestId(MoneyActivityViewTestIds.EMPTY_LIST_MESSAGE),
    ).toBeOnTheScreen();
  });
});
