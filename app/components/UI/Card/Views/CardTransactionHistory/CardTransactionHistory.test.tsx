import React from 'react';
import { SectionList } from 'react-native';
import { Spinner } from '@metamask/design-system-react-native';
import { fireEvent, render } from '@testing-library/react-native';
import {
  CardTransactionStatus,
  CardTransactionType,
  type CardTransaction,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import type { UseCardTransactionsResult } from '../../hooks/useCardTransactions';
import { MoneyActivityItemTestIds } from '../../../Money/components/MoneyActivityItem/MoneyActivityItem.testIds';
import CardTransactionHistory from './CardTransactionHistory';

const mockLoadMore = jest.fn();
const mockRefetch = jest.fn(async () => undefined);
const mockUseCardTransactions = jest.fn();
let mockPrivacyMode = false;

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
  useSelector: () => mockPrivacyMode,
}));

jest.mock('../../../../../util/intl', () => ({
  getIntlDateTimeFormatter: () => ({
    format: () => '15 Jan',
  }),
  getIntlNumberFormatter: (
    _locale: string,
    options?: Intl.NumberFormatOptions,
  ) => ({
    format: (value: number) => {
      if (options?.currency === 'BRL') {
        return `R$${value.toFixed(2)}`;
      }
      return `$${value.toFixed(2)}`;
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  default: { locale: 'en-US' },
}));

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
    isLoadMoreError: false,
    refetch: mockRefetch,
    isFetching: false,
    ...overrides,
  });
}

describe('CardTransactionHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrivacyMode = false;
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

    expect(UNSAFE_getAllByType(Spinner)).toHaveLength(1);
    expect(queryByTestId('card-transaction-history-retry')).toBeNull();
  });

  it('shows the load-more retry when a later page fails and rows already exist', () => {
    mockTransactions({
      items: [createTransaction()],
      hasMore: true,
      error: new Error('failed'),
      isLoadMoreError: true,
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

  it('does not auto-load more while a later-page error is showing', () => {
    mockTransactions({
      items: [createTransaction()],
      hasMore: true,
      error: new Error('failed'),
      isLoadMoreError: true,
    });

    const { UNSAFE_getByType } = render(<CardTransactionHistory />);
    const list = UNSAFE_getByType(SectionList);

    fireEvent(list, 'onEndReached');

    expect(mockLoadMore).not.toHaveBeenCalled();
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

    expect(UNSAFE_getByType(Spinner)).toBeTruthy();
    expect(queryByText('card.transactions.load_error_more')).toBeNull();
    expect(
      queryByTestId('card-transaction-history-load-more-retry'),
    ).toBeNull();
  });

  it('shows a list retry when pull-to-refresh fails and rows already exist', () => {
    mockTransactions({
      items: [createTransaction()],
      hasMore: true,
      error: new Error('failed'),
      isLoadMoreError: false,
    });

    const { getByText, getByTestId, queryByText, queryByTestId } = render(
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
    expect(mockLoadMore).not.toHaveBeenCalled();
  });

  it('shows the billing amount for a same-currency purchase', () => {
    mockTransactions({
      items: [createTransaction()],
    });

    const { getByTestId, queryByTestId } = render(<CardTransactionHistory />);

    expect(
      getByTestId(MoneyActivityItemTestIds.PRIMARY_AMOUNT),
    ).toHaveTextContent('-$10.00');
    expect(
      queryByTestId(MoneyActivityItemTestIds.FIAT_AMOUNT),
    ).not.toBeOnTheScreen();
  });

  it('shows the merchant amount and the billing amount when currencies differ', () => {
    mockTransactions({
      items: [
        createTransaction({
          billingAmount: { value: '11.95', currency: 'USD' },
          originalAmount: { value: '61.35', currency: 'BRL' },
        }),
      ],
    });

    const { getByTestId } = render(<CardTransactionHistory />);

    expect(
      getByTestId(MoneyActivityItemTestIds.PRIMARY_AMOUNT),
    ).toHaveTextContent('-R$61.35');
    expect(getByTestId(MoneyActivityItemTestIds.FIAT_AMOUNT)).toHaveTextContent(
      '-$11.95',
    );
  });

  it('masks a single amount line when privacy mode is on', () => {
    mockPrivacyMode = true;
    mockTransactions({
      items: [createTransaction()],
    });

    const { getByTestId, queryByTestId } = render(<CardTransactionHistory />);

    expect(
      getByTestId(MoneyActivityItemTestIds.PRIMARY_AMOUNT),
    ).toHaveTextContent('•'.repeat(6));
    expect(
      queryByTestId(MoneyActivityItemTestIds.FIAT_AMOUNT),
    ).not.toBeOnTheScreen();
  });
});
