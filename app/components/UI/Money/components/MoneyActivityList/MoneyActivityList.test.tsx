import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MoneyActivityList from './MoneyActivityList';
import MOCK_MONEY_TRANSACTIONS from '../../constants/mockActivityData';
import { onchainItem } from '../../types/moneyActivity';
import { MoneyActivityListTestIds } from './MoneyActivityList.testIds';
import { MoneyActivityItemTestIds } from '../MoneyActivityItem/MoneyActivityItem.testIds';

const MOCK_ITEMS = MOCK_MONEY_TRANSACTIONS.map(onchainItem);

jest.mock('../MoneyActivityItem/MoneyActivityItem', () => {
  const { View, Text } = jest.requireActual('react-native');
  const mockRowPrefix = 'money-activity-item-row';
  return {
    __esModule: true,
    default: ({
      tx,
      privacyMode,
    }: {
      tx: { id: string; moneySubtitle?: string };
      privacyMode?: boolean;
    }) => (
      <View testID={`${mockRowPrefix}-${tx.id}`}>
        <Text>{tx.moneySubtitle ?? 'no-desc'}</Text>
        <Text testID={`${mockRowPrefix}-${tx.id}-privacy-mode`}>
          {String(privacyMode)}
        </Text>
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
      <MoneyActivityList items={MOCK_ITEMS} />,
    );

    expect(getByTestId(MoneyActivityListTestIds.CONTAINER)).toBeOnTheScreen();
    expect(
      getByTestId(`${MoneyActivityItemTestIds.ROW}-${MOCK_ITEMS[0].id}`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${MoneyActivityItemTestIds.ROW}-${MOCK_ITEMS[4].id}`),
    ).toBeOnTheScreen();
  });

  it('does not render more than 5 items', () => {
    const { queryByTestId } = renderWithProvider(
      <MoneyActivityList items={MOCK_ITEMS} />,
    );

    expect(
      queryByTestId(`${MoneyActivityItemTestIds.ROW}-${MOCK_ITEMS[5].id}`),
    ).toBeNull();
  });

  it('returns null when transactions list is empty', () => {
    const { queryByTestId } = renderWithProvider(
      <MoneyActivityList items={[]} />,
    );

    expect(queryByTestId(MoneyActivityListTestIds.CONTAINER)).toBeNull();
  });

  it('renders section header with Activity title', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyActivityList items={MOCK_ITEMS} />,
    );

    expect(getByTestId('section-header')).toBeOnTheScreen();
  });

  it('renders View all button when onViewAllPress is provided', () => {
    const mockPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <MoneyActivityList items={MOCK_ITEMS} onViewAllPress={mockPress} />,
    );

    const button = getByTestId(MoneyActivityListTestIds.VIEW_ALL_BUTTON);
    expect(button).toBeOnTheScreen();
    fireEvent.press(button);
    expect(mockPress).toHaveBeenCalledTimes(1);
  });

  it('does not render View all button when onViewAllPress is not provided', () => {
    const { queryByTestId } = renderWithProvider(
      <MoneyActivityList items={MOCK_ITEMS} />,
    );

    expect(queryByTestId(MoneyActivityListTestIds.VIEW_ALL_BUTTON)).toBeNull();
  });

  it('calls onHeaderPress when section header is pressed', () => {
    const mockPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <MoneyActivityList items={MOCK_ITEMS} onHeaderPress={mockPress} />,
    );

    fireEvent.press(getByTestId('section-header'));
    expect(mockPress).toHaveBeenCalledTimes(1);
  });

  it('hides View all and does not wire the header arrow with 5 or fewer transactions', () => {
    const onHeaderPress = jest.fn();
    const onViewAllPress = jest.fn();
    const { getByTestId, queryByTestId } = renderWithProvider(
      <MoneyActivityList
        items={MOCK_ITEMS.slice(0, 5)}
        onHeaderPress={onHeaderPress}
        onViewAllPress={onViewAllPress}
      />,
    );

    fireEvent.press(getByTestId('section-header'));
    expect(onHeaderPress).not.toHaveBeenCalled();
    expect(queryByTestId(MoneyActivityListTestIds.VIEW_ALL_BUTTON)).toBeNull();
  });

  it('wires the header arrow and renders View all with more than 5 transactions', () => {
    const onHeaderPress = jest.fn();
    const onViewAllPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <MoneyActivityList
        items={MOCK_ITEMS}
        onHeaderPress={onHeaderPress}
        onViewAllPress={onViewAllPress}
      />,
    );

    fireEvent.press(getByTestId('section-header'));
    expect(onHeaderPress).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId(MoneyActivityListTestIds.VIEW_ALL_BUTTON));
    expect(onViewAllPress).toHaveBeenCalledTimes(1);
  });

  it('renders View all when more pages remain upstream even at the preview count', () => {
    const onHeaderPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <MoneyActivityList
        items={MOCK_ITEMS.slice(0, 5)}
        hasMore
        onHeaderPress={onHeaderPress}
        onViewAllPress={jest.fn()}
      />,
    );

    expect(
      getByTestId(MoneyActivityListTestIds.VIEW_ALL_BUTTON),
    ).toBeOnTheScreen();
    fireEvent.press(getByTestId('section-header'));
    expect(onHeaderPress).toHaveBeenCalledTimes(1);
  });

  it('forwards privacyMode false by default to each row', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyActivityList items={MOCK_ITEMS} />,
    );

    expect(
      getByTestId(
        `${MoneyActivityItemTestIds.ROW}-${MOCK_ITEMS[0].id}-privacy-mode`,
      ),
    ).toHaveTextContent('false');
  });

  it('forwards privacyMode true to each row when set', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyActivityList items={MOCK_ITEMS} privacyMode />,
    );

    expect(
      getByTestId(
        `${MoneyActivityItemTestIds.ROW}-${MOCK_ITEMS[0].id}-privacy-mode`,
      ),
    ).toHaveTextContent('true');
  });
});
