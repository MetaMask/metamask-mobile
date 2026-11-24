import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import {
  CardMerchantCategory,
  CardTransactionStatus,
  CardTransactionType,
  type CardTransaction,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';
import { CardHomeSelectors } from '../CardHome.testIds';
import CardHomeRecentActivity from './CardHomeRecentActivity';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  default: { locale: 'en-US' },
}));

jest.mock('../../../../../../util/intl', () => ({
  getIntlDateTimeFormatter: () => ({
    format: () => '15 Jan',
  }),
  getIntlNumberFormatter: () => ({
    format: (value: number) => `$${value.toFixed(2)}`,
  }),
}));

const buildTransaction = (
  overrides: Partial<CardTransaction> = {},
): CardTransaction => ({
  id: 'tx-1',
  providerId: 'baanx',
  timestamp: Date.now(),
  status: CardTransactionStatus.Completed,
  type: CardTransactionType.Purchase,
  isDebit: true,
  billingAmount: { value: '10.00', currency: 'USD' },
  merchant: {
    name: 'Coffee Shop',
    category: CardMerchantCategory.Food,
  },
  fundingSources: [],
  ...overrides,
});

const renderPanel = (
  props: Partial<React.ComponentProps<typeof CardHomeRecentActivity>> = {},
) =>
  renderWithProvider(
    <CardHomeRecentActivity
      transactions={props.transactions ?? [buildTransaction()]}
      isLoading={props.isLoading}
      hasError={props.hasError}
      onRetry={props.onRetry}
      onSeeAll={props.onSeeAll}
      onTransactionPress={props.onTransactionPress}
      privacyMode={props.privacyMode}
    />,
    { state: { engine: { backgroundState } } },
  );

describe('CardHomeRecentActivity', () => {
  it('renders the latest transactions and See all when a history destination exists', () => {
    const transactions = [
      buildTransaction({ id: 'tx-1', merchant: { name: 'Pret A Manger' } }),
      buildTransaction({ id: 'tx-2', merchant: { name: 'Uber' } }),
    ];
    const { getByTestId, getByText, queryByText, queryByTestId } = renderPanel({
      transactions,
      onSeeAll: jest.fn(),
    });

    expect(getByTestId(CardHomeSelectors.RECENT_ACTIVITY)).toBeOnTheScreen();
    expect(getByText('Pret A Manger')).toBeOnTheScreen();
    expect(getByText('Uber')).toBeOnTheScreen();
    expect(
      getByTestId(CardHomeSelectors.RECENT_ACTIVITY_SEE_ALL),
    ).toBeOnTheScreen();
    expect(
      getByText('card.card_home.recent_activity.see_all'),
    ).toBeOnTheScreen();
    expect(queryByText('card.card_home.recent_activity.title')).toBeNull();
    expect(queryByTestId(CardHomeSelectors.RECENT_ACTIVITY_EMPTY)).toBeNull();
  });

  it('caps the list at five transactions', () => {
    const transactions = Array.from({ length: 7 }, (_, index) =>
      buildTransaction({
        id: `tx-${index + 1}`,
        merchant: { name: `Merchant ${index + 1}` },
      }),
    );
    const { getByText, queryByText } = renderPanel({
      transactions,
      onSeeAll: jest.fn(),
    });

    expect(getByText('Merchant 1')).toBeOnTheScreen();
    expect(getByText('Merchant 5')).toBeOnTheScreen();
    expect(queryByText('Merchant 6')).toBeNull();
    expect(queryByText('Merchant 7')).toBeNull();
  });

  it('hides See all when there is no history destination', () => {
    const { queryByTestId, getByText } = renderPanel({
      transactions: [buildTransaction()],
    });

    expect(getByText('Coffee Shop')).toBeOnTheScreen();
    expect(queryByTestId(CardHomeSelectors.RECENT_ACTIVITY_SEE_ALL)).toBeNull();
  });

  it('shows a spinner instead of the empty state while the first page loads', () => {
    const { getByTestId, queryByTestId } = renderPanel({
      transactions: [],
      isLoading: true,
      onSeeAll: jest.fn(),
    });

    expect(
      getByTestId(CardHomeSelectors.RECENT_ACTIVITY_LOADING),
    ).toBeOnTheScreen();
    expect(queryByTestId(CardHomeSelectors.RECENT_ACTIVITY_EMPTY)).toBeNull();
  });

  it('shows an error and retries instead of the empty state', () => {
    const onRetry = jest.fn();
    const { getByTestId, getByText, queryByTestId } = renderPanel({
      transactions: [],
      hasError: true,
      onRetry,
      onSeeAll: jest.fn(),
    });

    expect(getByText('card.transactions.load_error')).toBeOnTheScreen();
    expect(queryByTestId(CardHomeSelectors.RECENT_ACTIVITY_EMPTY)).toBeNull();
    expect(
      getByTestId(CardHomeSelectors.RECENT_ACTIVITY_SEE_ALL),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(CardHomeSelectors.RECENT_ACTIVITY_RETRY));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the Activity empty state when there are no transactions', () => {
    const onSeeAll = jest.fn();
    const { getByTestId, getByText } = renderPanel({
      transactions: [],
      onSeeAll,
    });

    const empty = getByTestId(CardHomeSelectors.RECENT_ACTIVITY_EMPTY);
    expect(empty).toBeOnTheScreen();
    expect(getByText('card.card_home.activity_empty_title')).toBeOnTheScreen();
    expect(
      getByText('card.card_home.activity_empty_description'),
    ).toBeOnTheScreen();
    expect(empty.findByProps({ name: IconName.Card })).toBeTruthy();
    expect(
      getByTestId(CardHomeSelectors.RECENT_ACTIVITY_SEE_ALL),
    ).toBeOnTheScreen();
  });

  it('hides See all on the empty state when there is no history destination', () => {
    const { queryByTestId } = renderPanel({ transactions: [] });

    expect(queryByTestId(CardHomeSelectors.RECENT_ACTIVITY_SEE_ALL)).toBeNull();
  });

  it('invokes onSeeAll when See all is pressed', () => {
    const onSeeAll = jest.fn();
    const { getByTestId } = renderPanel({
      transactions: [buildTransaction()],
      onSeeAll,
    });

    fireEvent.press(getByTestId(CardHomeSelectors.RECENT_ACTIVITY_SEE_ALL));

    expect(onSeeAll).toHaveBeenCalledTimes(1);
  });

  it('invokes onTransactionPress with the tapped transaction', () => {
    const onTransactionPress = jest.fn();
    const transaction = buildTransaction({ id: 'tx-press' });
    const { getByTestId } = renderPanel({
      transactions: [transaction],
      onTransactionPress,
    });

    fireEvent.press(getByTestId('card-home-tx-tx-press'));

    expect(onTransactionPress).toHaveBeenCalledTimes(1);
    expect(onTransactionPress).toHaveBeenCalledWith(transaction);
  });
});
