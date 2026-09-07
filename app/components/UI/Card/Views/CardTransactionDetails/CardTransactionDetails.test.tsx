import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  CardTransactionStatus,
  CardTransactionType,
  type CardTransaction,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import Routes from '../../../../../constants/navigation/Routes';
import { cardQueries } from '../../queries';
import CardTransactionDetails from './CardTransactionDetails';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockUseQuery = jest.fn();
const mockGetCardTransaction = jest.fn();
const mockUseSelector = jest.fn();
let mockRouteParams: {
  transactionId: string;
  transaction?: CardTransaction;
} = {
  transactionId: 'tx-1',
};

jest.mock('@tanstack/react-query', () => ({
  useQuery: (args: unknown) => mockUseQuery(args),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: mockNavigate,
    }),
    useRoute: () => ({
      params: mockRouteParams,
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../hooks/useCardHeaderHandlers', () => ({
  useCardHeaderHandlers: () => ({ onBack: mockGoBack }),
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

jest.mock('../../../../../core/Engine', () => ({
  context: {
    CardController: {
      getCardTransaction: (...args: unknown[]) =>
        mockGetCardTransaction(...args),
    },
  },
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  default: { locale: 'en-US' },
}));

jest.mock('../../../../../util/intl', () => ({
  getIntlDateTimeFormatter: () => ({
    format: () => 'Jul 10, 2026, 12:00 PM',
  }),
  getIntlNumberFormatter: (
    _locale: string,
    options?: Intl.NumberFormatOptions,
  ) => ({
    format: (value: number) => {
      if (options?.currency === 'USD') {
        return `$${value.toFixed(2)}`;
      }
      return `${value} ${options?.currency ?? ''}`;
    },
  }),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      icon: { alternative: 'var(--color-icon-alternative)' },
    },
  }),
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

describe('CardTransactionDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {
      transactionId: 'tx-1',
      transaction: createTransaction(),
    };
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mockUseSelector.mockReturnValue(undefined);
  });

  it('renders purchase hero copy from transaction type', () => {
    const { getByText } = render(<CardTransactionDetails />);

    expect(getByText('money.api_activity_details.you_spent')).toBeOnTheScreen();
  });

  it('renders refund hero copy for refund transactions', () => {
    mockRouteParams = {
      transactionId: 'tx-1',
      transaction: createTransaction({
        type: CardTransactionType.Refund,
        isDebit: false,
      }),
    };

    const { getByText } = render(<CardTransactionDetails />);

    expect(
      getByText('money.api_activity_details.you_were_refunded'),
    ).toBeOnTheScreen();
  });

  it('renders deposit hero copy for deposit transactions', () => {
    mockRouteParams = {
      transactionId: 'tx-1',
      transaction: createTransaction({
        type: CardTransactionType.Deposit,
        isDebit: false,
      }),
    };

    const { getByText } = render(<CardTransactionDetails />);

    expect(getByText('card.transactions.you_deposited')).toBeOnTheScreen();
  });

  it('falls back to received copy for credit adjustments', () => {
    mockRouteParams = {
      transactionId: 'tx-1',
      transaction: createTransaction({
        type: CardTransactionType.Adjustment,
        isDebit: false,
      }),
    };

    const { getByText } = render(<CardTransactionDetails />);

    expect(getByText('card.transactions.you_received')).toBeOnTheScreen();
  });

  it('renders pending status label', () => {
    mockRouteParams = {
      transactionId: 'tx-1',
      transaction: createTransaction({
        status: CardTransactionStatus.Pending,
      }),
    };

    const { getByText } = render(<CardTransactionDetails />);

    expect(getByText('card.transactions.pending')).toBeOnTheScreen();
  });

  it('renders reversed status label', () => {
    mockRouteParams = {
      transactionId: 'tx-1',
      transaction: createTransaction({
        status: CardTransactionStatus.Reversed,
      }),
    };

    const { getByText } = render(<CardTransactionDetails />);

    expect(getByText('card.transactions.reversed')).toBeOnTheScreen();
  });

  it('uses the cardQueries detail key and skips fetch when transaction is passed', () => {
    render(<CardTransactionDetails />);

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: cardQueries.transactions.keys.detail('tx-1'),
        enabled: false,
      }),
    );
  });

  it('fetches the transaction when only an id is provided', () => {
    mockRouteParams = { transactionId: 'tx-1' };
    mockUseQuery.mockReturnValue({
      data: createTransaction(),
      isLoading: false,
      error: null,
    });

    const { getByText } = render(<CardTransactionDetails />);

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: cardQueries.transactions.keys.detail('tx-1'),
        enabled: true,
      }),
    );
    expect(getByText('money.api_activity_details.you_spent')).toBeOnTheScreen();
  });

  it('shows the load error when the fetch fails without a route transaction', () => {
    mockRouteParams = { transactionId: 'tx-1' };
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
    });

    const { getByText } = render(<CardTransactionDetails />);

    expect(getByText('card.transactions.load_error')).toBeOnTheScreen();
  });

  it('navigates to the report screen when report is pressed', () => {
    const transaction = createTransaction();
    mockRouteParams = {
      transactionId: transaction.id,
      transaction,
    };

    const { getByTestId } = render(<CardTransactionDetails />);

    fireEvent.press(getByTestId('card-transaction-details-report-button'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.REPORT_TRANSACTION, {
      transactionId: transaction.id,
      transaction,
    });
  });
});
