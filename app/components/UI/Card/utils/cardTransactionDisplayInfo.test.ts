import { IconName } from '@metamask/design-system-react-native';
import {
  CardTransactionStatus,
  CardTransactionType,
  type CardTransaction,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import {
  cardTransactionDisplayInfo,
  formatCardTransactionDate,
} from './cardTransactionDisplayInfo';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  default: { locale: 'en-US' },
}));

jest.mock('../../../../util/intl', () => ({
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
      if (options?.currency === 'USD') {
        return `$${value.toFixed(2)}`;
      }
      return `${value} ${options?.currency ?? ''}`;
    },
  }),
}));

function createTransaction(
  overrides: Partial<CardTransaction> = {},
): CardTransaction {
  return {
    id: 'tx-1',
    providerId: 'baanx',
    timestamp: Date.now(),
    status: CardTransactionStatus.Completed,
    type: CardTransactionType.Purchase,
    isDebit: true,
    billingAmount: { value: '10.00', currency: 'USD' },
    fundingSources: [],
    ...overrides,
  };
}

describe('cardTransactionDisplayInfo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-27T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('formatCardTransactionDate', () => {
    it('returns today label for timestamps on the current day', () => {
      const result = formatCardTransactionDate(
        new Date('2026-07-27T08:00:00.000Z').getTime(),
      );

      expect(result).toBe('card.transactions.today');
    });

    it('returns yesterday label for timestamps on the previous day', () => {
      const result = formatCardTransactionDate(
        new Date('2026-07-26T08:00:00.000Z').getTime(),
      );

      expect(result).toBe('card.transactions.yesterday');
    });

    it('returns an absolute date for older timestamps', () => {
      const result = formatCardTransactionDate(
        new Date('2026-07-10T08:00:00.000Z').getTime(),
      );

      expect(result).toBe('15 Jan');
    });
  });

  describe('cardTransactionDisplayInfo', () => {
    it('uses the purchase type label and merchant name as description', () => {
      const display = cardTransactionDisplayInfo(
        createTransaction({
          merchant: { name: 'Coffee Shop' },
        }),
      );

      expect(display.label).toBe('money.transaction.purchase');
      expect(display.description).toBe('Coffee Shop');
      expect(display.icon).toBe(IconName.Card);
    });

    it('formats debit amounts with a currency symbol and minus sign', () => {
      const display = cardTransactionDisplayInfo(
        createTransaction({
          isDebit: true,
          billingAmount: { value: '42.50', currency: 'USD' },
        }),
      );

      expect(display.primaryAmount).toBe('-$42.50');
      expect(display.isIncoming).toBe(false);
    });

    it('shows merchant original amount when currency differs from billing', () => {
      const display = cardTransactionDisplayInfo(
        createTransaction({
          billingAmount: { value: '11.95', currency: 'USD' },
          originalAmount: { value: '61.35', currency: 'BRL' },
        }),
      );

      expect(display.primaryAmount).toBe('-$11.95');
      expect(display.fiatAmount).toBe('-R$61.35');
    });

    it('omits secondary amount when original currency matches billing', () => {
      const display = cardTransactionDisplayInfo(
        createTransaction({
          billingAmount: { value: '10.00', currency: 'USD' },
          originalAmount: { value: '10.00', currency: 'USD' },
        }),
      );

      expect(display.fiatAmount).toBe('');
    });

    it('uses merchant name as description for pending transactions', () => {
      const display = cardTransactionDisplayInfo(
        createTransaction({
          status: CardTransactionStatus.Pending,
          merchant: { name: 'Pending Cafe' },
        }),
      );

      expect(display.description).toBe('Pending Cafe');
      expect(display.status).toBe('pending');
    });

    it('uses merchant name as description for failed transactions', () => {
      const display = cardTransactionDisplayInfo(
        createTransaction({
          status: CardTransactionStatus.Failed,
          merchant: { name: 'Failed Store' },
          declineReason: { message: 'Insufficient funds' },
        }),
      );

      expect(display.description).toBe('Failed Store');
      expect(display.status).toBe('failed');
    });

    it('falls back to formatted date when merchant name is missing', () => {
      const display = cardTransactionDisplayInfo(
        createTransaction({
          timestamp: new Date('2026-07-27T08:00:00.000Z').getTime(),
        }),
      );

      expect(display.description).toBe('card.transactions.today');
    });
  });
});
