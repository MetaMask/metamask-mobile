import React from 'react';
import { ActivityIndicator } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import {
  CardTransactionStatus,
  CardTransactionType,
  type CardTransaction,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import type { UseCardTransactionsResult } from '../../hooks/useCardTransactions';
import CardTransactionHistory from './CardTransactionHistory';

const mockLoadMore = jest.fn();
const mockRefetch = jest.fn(async () => undefined);
const mockUseCardTransactions = jest.fn();

jest.mock('../../hooks/useCardTransactions', () => ({
  useCardTransactions: () => mockUseCardTransactions(),
}));

jest.mock('../../hooks/useCardHeaderHandlers', () => ({
  useCardHeaderHandlers: () => ({ onBack: jest.fn() }),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: () => ({
      addProperties: () => ({ build: () => ({}) }),
      build: () => ({}),
    }),
  }),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: () => false,
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  default: { locale: 'en-US' },
}));

jest.mock('../../components/CardTransactionRow/CardTransactionRow', () => {
  const { Text } = jest.requireActual('react-native');
  return ({ transaction }: { transaction: CardTransaction }) => (
    <Text>{transaction.id}</Text>
  );
});

function createTransaction(
  overrides: Partial<CardTransaction> = {},
): CardTransaction {
  return {
    id: 'tx-1',
    providerId: 'baanx',
    timestamp: new Date('2026-07-10T12:00:00.000Z').getTime(),
    status: CardTransactionStatus.Completed,
    type: CardTransactionType.Purchase,
    isDebit: true,
    billingAmount: { value: '10.00', currency: 'USD' },
    fundingSources: [],
    merchant: { name: 'Coffee Shop' },
    ...overrides,
  };
}

function mockTransactions(
  overrides: Partial<UseCardTransactionsResult> = {},
): void {
  mockUseCardTransactions.mockReturnValue({
    items: [],
    hasMore: false,
    loadMore: mockLoadMore,
    isLoadingMore: false,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
    isFetching: false,
    ...overrides,
  });
}

describe('CardTransactionHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactions();
  });

  it('shows a single whole-list retry when the first page fails', () => {
    mockTransactions({
      items: [],
      error: new Error('failed'),
    });

    const { getByText, getByTestId, queryByTestId, queryByText } = render(
      <CardTransactionHistory />,
    );

    expect(getByText('card.transactions.load_error')).toBeOnTheScreen();
    expect(getByTestId('card-transaction-history-retry')).toBeOnTheScreen();
    expect(queryByText('card.transactions.load_error_more')).toBeNull();
    expect(
      queryByTestId('card-transaction-history-load-more-retry'),
    ).toBeNull();

    fireEvent.press(getByTestId('card-transaction-history-retry'));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('shows a single empty spinner while refetching with no rows', () => {
    mockTransactions({
      items: [],
      isFetching: true,
      error: new Error('failed'),
    });

    const { UNSAFE_getAllByType, queryByTestId } = render(
      <CardTransactionHistory />,
    );

    expect(UNSAFE_getAllByType(ActivityIndicator)).toHaveLength(1);
    expect(queryByTestId('card-transaction-history-retry')).toBeNull();
  });

  it('shows the load-more retry when a later page fails and rows already exist', () => {
    mockTransactions({
      items: [createTransaction()],
      hasMore: true,
      error: new Error('failed'),
    });

    const { getByText, getByTestId, queryByText, queryByTestId } = render(
      <CardTransactionHistory />,
    );

    expect(getByText('card.transactions.load_error_more')).toBeOnTheScreen();
    expect(
      getByTestId('card-transaction-history-load-more-retry'),
    ).toBeOnTheScreen();
    expect(queryByText('card.transactions.load_error')).toBeNull();
    expect(queryByTestId('card-transaction-history-retry')).toBeNull();

    fireEvent.press(getByTestId('card-transaction-history-load-more-retry'));

    expect(mockLoadMore).toHaveBeenCalledTimes(1);
  });

  it('shows a spinner instead of the load-more error while fetching the next page', () => {
    mockTransactions({
      items: [createTransaction()],
      hasMore: true,
      isLoadingMore: true,
      error: new Error('failed'),
    });

    const { UNSAFE_getByType, queryByText, queryByTestId } = render(
      <CardTransactionHistory />,
    );

    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    expect(queryByText('card.transactions.load_error_more')).toBeNull();
    expect(
      queryByTestId('card-transaction-history-load-more-retry'),
    ).toBeNull();
  });
});
