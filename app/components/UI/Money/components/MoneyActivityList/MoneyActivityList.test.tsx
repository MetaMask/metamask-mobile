import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MoneyActivityList from './MoneyActivityList';
import MOCK_MONEY_TRANSACTIONS from '../../constants/mockActivityData';
import { MoneyActivityListTestIds } from './MoneyActivityList.testIds';
import { MoneyActivityItemTestIds } from '../MoneyActivityItem/MoneyActivityItem.testIds';

jest.mock('../MoneyActivityItem/MoneyActivityItem', () => {
  const { View, Text } = jest.requireActual('react-native');
  const mockRowPrefix = 'money-activity-item-row';
  return {
    __esModule: true,
    default: ({ tx }: { tx: { id: string; moneySubtitle?: string } }) => (
      <View testID={`${mockRowPrefix}-${tx.id}`}>
        <Text>{tx.moneySubtitle ?? 'no-desc'}</Text>
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

const renderWithProvider = (ui: React.ReactElement) => {
  const store = createMockStore();
  return render(<Provider store={store}>{ui}</Provider>);
};

describe('MoneyActivityList', () => {
  it('renders up to 5 transactions from mock data', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyActivityList transactions={MOCK_MONEY_TRANSACTIONS} />,
    );

    expect(getByTestId(MoneyActivityListTestIds.CONTAINER)).toBeOnTheScreen();
    expect(
      getByTestId(`${MoneyActivityItemTestIds.ROW}-money-tx-1`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${MoneyActivityItemTestIds.ROW}-money-tx-5`),
    ).toBeOnTheScreen();
  });

  it('does not render more than 5 items', () => {
    const { queryByTestId } = renderWithProvider(
      <MoneyActivityList transactions={MOCK_MONEY_TRANSACTIONS} />,
    );

    expect(
      queryByTestId(`${MoneyActivityItemTestIds.ROW}-money-tx-6`),
    ).toBeNull();
  });

  it('returns null when transactions list is empty', () => {
    const { queryByTestId } = renderWithProvider(
      <MoneyActivityList transactions={[]} />,
    );

    expect(queryByTestId(MoneyActivityListTestIds.CONTAINER)).toBeNull();
  });

  it('renders section header with Activity title', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyActivityList transactions={MOCK_MONEY_TRANSACTIONS} />,
    );

    expect(getByTestId('section-header')).toBeOnTheScreen();
  });

  it('renders View all button when onViewAllPress is provided', () => {
    const mockPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <MoneyActivityList
        transactions={MOCK_MONEY_TRANSACTIONS}
        onViewAllPress={mockPress}
      />,
    );

    const button = getByTestId(MoneyActivityListTestIds.VIEW_ALL_BUTTON);
    expect(button).toBeOnTheScreen();
    fireEvent.press(button);
    expect(mockPress).toHaveBeenCalledTimes(1);
  });

  it('does not render View all button when onViewAllPress is not provided', () => {
    const { queryByTestId } = renderWithProvider(
      <MoneyActivityList transactions={MOCK_MONEY_TRANSACTIONS} />,
    );

    expect(queryByTestId(MoneyActivityListTestIds.VIEW_ALL_BUTTON)).toBeNull();
  });

  it('calls onHeaderPress when section header is pressed', () => {
    const mockPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <MoneyActivityList
        transactions={MOCK_MONEY_TRANSACTIONS}
        onHeaderPress={mockPress}
      />,
    );

    fireEvent.press(getByTestId('section-header'));
    expect(mockPress).toHaveBeenCalledTimes(1);
  });
});
