import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MoneyActivityList from './MoneyActivityList';
import MOCK_MONEY_TRANSACTIONS from '../../constants/mockActivityData';
import { MoneyActivityListTestIds } from './MoneyActivityList.testIds';

jest.mock('../../../MultichainTransactionListItem', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      transaction,
      description,
    }: {
      transaction: { id: string };
      description?: string;
    }) => (
      <View testID={`mock-tx-${transaction.id}`}>
        <Text>{description ?? 'no-desc'}</Text>
      </View>
    ),
  };
});

jest.mock('../MoneySectionHeader', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ title, onPress }: { title: string; onPress?: () => void }) => (
      <Text testID="section-header" onPress={onPress}>
        {title}
      </Text>
    ),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const createMockStore = () =>
  configureStore({
    reducer: {
      user: (state = { appTheme: 'light' }) => state,
    },
  });

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };

const renderWithProvider = (ui: React.ReactElement) => {
  const store = createMockStore();
  return render(<Provider store={store}>{ui}</Provider>);
};

describe('MoneyActivityList', () => {
  it('renders up to 5 transactions from mock data', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyActivityList
        transactions={MOCK_MONEY_TRANSACTIONS}
        navigation={mockNavigation as never}
      />,
    );

    expect(getByTestId(MoneyActivityListTestIds.CONTAINER)).toBeTruthy();
    expect(getByTestId('mock-tx-money-tx-1')).toBeTruthy();
    expect(getByTestId('mock-tx-money-tx-5')).toBeTruthy();
  });

  it('does not render more than 5 items', () => {
    const { queryByTestId } = renderWithProvider(
      <MoneyActivityList
        transactions={MOCK_MONEY_TRANSACTIONS}
        navigation={mockNavigation as never}
      />,
    );

    expect(queryByTestId('mock-tx-money-tx-6')).toBeNull();
  });

  it('returns null when transactions list is empty', () => {
    const { queryByTestId } = renderWithProvider(
      <MoneyActivityList
        transactions={[]}
        navigation={mockNavigation as never}
      />,
    );

    expect(queryByTestId(MoneyActivityListTestIds.CONTAINER)).toBeNull();
  });

  it('renders section header with Activity title', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyActivityList
        transactions={MOCK_MONEY_TRANSACTIONS}
        navigation={mockNavigation as never}
      />,
    );

    expect(getByTestId('section-header')).toBeTruthy();
  });

  it('renders View all button when onViewAllPress is provided', () => {
    const mockPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <MoneyActivityList
        transactions={MOCK_MONEY_TRANSACTIONS}
        onViewAllPress={mockPress}
        navigation={mockNavigation as never}
      />,
    );

    const button = getByTestId(MoneyActivityListTestIds.VIEW_ALL_BUTTON);
    expect(button).toBeTruthy();
    fireEvent.press(button);
    expect(mockPress).toHaveBeenCalledTimes(1);
  });

  it('does not render View all button when onViewAllPress is not provided', () => {
    const { queryByTestId } = renderWithProvider(
      <MoneyActivityList
        transactions={MOCK_MONEY_TRANSACTIONS}
        navigation={mockNavigation as never}
      />,
    );

    expect(queryByTestId(MoneyActivityListTestIds.VIEW_ALL_BUTTON)).toBeNull();
  });

  it('calls onHeaderPress when section header is pressed', () => {
    const mockPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <MoneyActivityList
        transactions={MOCK_MONEY_TRANSACTIONS}
        onHeaderPress={mockPress}
        navigation={mockNavigation as never}
      />,
    );

    fireEvent.press(getByTestId('section-header'));
    expect(mockPress).toHaveBeenCalledTimes(1);
  });
});
