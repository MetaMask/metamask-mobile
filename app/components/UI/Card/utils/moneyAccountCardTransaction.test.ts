import {
  CardTransactionStatus,
  CardTransactionType,
  type CardTransaction,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import {
  getCardDeclineReasonLabel,
  isMoneyAccountCardTransaction,
  isMoneyAccountDecline,
  parseDeclineAttempt,
} from './moneyAccountCardTransaction';
import {
  MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID,
  MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
} from '../util/vedaToken';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

function createTransaction(
  overrides: Partial<CardTransaction> = {},
): CardTransaction {
  return {
    id: 'tx-1',
    providerId: 'baanx',
    timestamp: Date.now(),
    status: CardTransactionStatus.Failed,
    type: CardTransactionType.Purchase,
    isDebit: true,
    billingAmount: { value: '10.00', currency: 'USD' },
    fundingSources: [],
    ...overrides,
  };
}

describe('parseDeclineAttempt', () => {
  it('extracts network and symbol from a Baanx insufficient-funds message', () => {
    expect(
      parseDeclineAttempt(
        'You attempted this MONAD transaction with a balance of 0.500000 USDC. The total transaction cost was $11.95.',
      ),
    ).toEqual({ network: 'MONAD', symbol: 'USDC' });
  });

  it('returns undefined for unmatched messages', () => {
    expect(parseDeclineAttempt('Card blocked')).toBeUndefined();
    expect(parseDeclineAttempt(undefined)).toBeUndefined();
  });
});

describe('isMoneyAccountDecline', () => {
  it('returns true only for MONAD + VEDA declines', () => {
    expect(
      isMoneyAccountDecline(
        createTransaction({
          declineReason: {
            message:
              'You attempted this MONAD transaction with a balance of 0.500000 VEDA. The total transaction cost was $11.95.',
          },
        }),
      ),
    ).toBe(true);
  });

  it('returns false for MONAD + USDC declines', () => {
    expect(
      isMoneyAccountDecline(
        createTransaction({
          declineReason: {
            message:
              'You attempted this MONAD transaction with a balance of 0.500000 USDC. The total transaction cost was $11.95.',
          },
        }),
      ),
    ).toBe(false);
  });

  it('returns false for LINEA declines', () => {
    expect(
      isMoneyAccountDecline(
        createTransaction({
          declineReason: {
            message:
              'You attempted this LINEA transaction with a balance of 0.842067 MUSD. The total transaction cost was $10.04.',
          },
        }),
      ),
    ).toBe(false);
  });
});

describe('isMoneyAccountCardTransaction', () => {
  it('returns true for settled veda funding on the Money Account chain', () => {
    expect(
      isMoneyAccountCardTransaction(
        createTransaction({
          status: CardTransactionStatus.Completed,
          fundingSources: [
            {
              currency: MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
              chainId: MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID,
              txHash: '0xabc',
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  it('returns false for settled funding on a different chain', () => {
    expect(
      isMoneyAccountCardTransaction(
        createTransaction({
          status: CardTransactionStatus.Completed,
          fundingSources: [
            {
              currency: MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
              chainId: 'eip155:59144',
              txHash: '0xabc',
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it('falls back to decline classification when there are no funding sources', () => {
    expect(
      isMoneyAccountCardTransaction(
        createTransaction({
          declineReason: {
            message:
              'You attempted this MONAD transaction with a balance of 0.500000 VEDA. The total transaction cost was $11.95.',
          },
        }),
      ),
    ).toBe(true);
  });

  it('returns false when funding sources omit currency', () => {
    expect(
      isMoneyAccountCardTransaction(
        createTransaction({
          status: CardTransactionStatus.Completed,
          fundingSources: [
            {
              chainId: MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID,
              txHash: '0xabc',
            },
          ],
        }),
      ),
    ).toBe(false);
  });
});

describe('getCardDeclineReasonLabel', () => {
  it('maps the insufficient-funds pattern to a short label', () => {
    expect(
      getCardDeclineReasonLabel(
        createTransaction({
          declineReason: {
            message:
              'You attempted this LINEA transaction with a balance of 0.000000 EURE. The total transaction cost was $2.24.',
          },
        }),
      ),
    ).toBe('card.transactions.decline_reasons.insufficient_funds');
  });

  it('returns the raw message when the pattern does not match', () => {
    expect(
      getCardDeclineReasonLabel(
        createTransaction({
          declineReason: { message: 'Card blocked by issuer' },
        }),
      ),
    ).toBe('Card blocked by issuer');
  });

  it('returns undefined when there is no decline reason', () => {
    expect(getCardDeclineReasonLabel(createTransaction())).toBeUndefined();
    expect(getCardDeclineReasonLabel(undefined)).toBeUndefined();
  });
});
