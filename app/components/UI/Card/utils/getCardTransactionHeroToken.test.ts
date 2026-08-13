import {
  CardTransactionStatus,
  CardTransactionType,
  type CardTransaction,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import { getCardTransactionHeroToken } from './getCardTransactionHeroToken';
import { MONEY_ACCOUNT_DISPLAY_SYMBOL } from '../util/vedaToken';

jest.mock('../util/buildTokenIconUrl', () => ({
  buildTokenIconUrl: () => 'https://example.com/token.png',
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

describe('getCardTransactionHeroToken', () => {
  it('returns mUSD when there is no funding source and no fallback', () => {
    const result = getCardTransactionHeroToken(createTransaction());

    expect(result.symbol).toBe(MONEY_ACCOUNT_DISPLAY_SYMBOL);
  });

  it('returns the fallback token when there is no funding source', () => {
    const result = getCardTransactionHeroToken(createTransaction(), {
      address: '0xusdc',
      caipChainId: 'eip155:8453',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      fundingStatus: 'enabled',
      spendableBalance: '10',
    } as never);

    expect(result.symbol).toBe('USDC');
    expect(result.iconSource).toEqual({
      uri: 'https://example.com/token.png',
    });
  });

  it('returns mUSD for veda funding currency', () => {
    const result = getCardTransactionHeroToken(
      createTransaction({
        fundingSources: [
          {
            currency: 'veda',
            address: '0xabc',
            chainId: 'eip155:143',
          },
        ],
      }),
    );

    expect(result.symbol).toBe(MONEY_ACCOUNT_DISPLAY_SYMBOL);
  });

  it('returns funding token symbol when address and chainId are present', () => {
    const result = getCardTransactionHeroToken(
      createTransaction({
        fundingSources: [
          {
            currency: 'usdc',
            address: '0xusdc',
            chainId: 'eip155:59144',
          },
        ],
      }),
    );

    expect(result.symbol).toBe('USDC');
    expect(result.iconSource).toEqual({
      uri: 'https://example.com/token.png',
    });
  });
});
