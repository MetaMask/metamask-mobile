import { renderHook } from '@testing-library/react-native';
import type { CardTransaction } from '../../../../core/Engine/controllers/card-controller/provider-types';
import {
  CardTransactionStatus,
  CardTransactionType,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import {
  CARD_RECENT_TRANSACTIONS_LIMIT,
  useCardRecentTransactions,
} from './useCardRecentTransactions';
import { useCardTransactions } from '../hooks/useCardTransactions';

jest.mock('../hooks/useCardTransactions', () => ({
  useCardTransactions: jest.fn(),
}));

const mockUseCardTransactions = jest.mocked(useCardTransactions);

const buildTransaction = (id: string): CardTransaction => ({
  id,
  providerId: 'baanx',
  timestamp: Date.now(),
  status: CardTransactionStatus.Completed,
  type: CardTransactionType.Purchase,
  isDebit: true,
  billingAmount: { value: '1.00', currency: 'USD' },
  fundingSources: [],
});

describe('useCardRecentTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the newest transactions first, capped at the limit', () => {
    const transactions = Array.from({ length: 8 }, (_, index) =>
      buildTransaction(`tx-${index}`),
    );
    mockUseCardTransactions.mockReturnValue({ items: transactions } as never);

    const { result } = renderHook(() => useCardRecentTransactions());

    expect(result.current).toHaveLength(CARD_RECENT_TRANSACTIONS_LIMIT);
    expect(result.current.map((transaction) => transaction.id)).toEqual([
      'tx-0',
      'tx-1',
      'tx-2',
      'tx-3',
      'tx-4',
    ]);
  });

  it('returns everything when there are fewer transactions than the limit', () => {
    mockUseCardTransactions.mockReturnValue({
      items: [buildTransaction('tx-0'), buildTransaction('tx-1')],
    } as never);

    const { result } = renderHook(() => useCardRecentTransactions());

    expect(result.current.map((transaction) => transaction.id)).toEqual([
      'tx-0',
      'tx-1',
    ]);
  });

  it('returns an empty list when there is no history', () => {
    mockUseCardTransactions.mockReturnValue({ items: [] } as never);

    const { result } = renderHook(() => useCardRecentTransactions());

    expect(result.current).toEqual([]);
  });
});
