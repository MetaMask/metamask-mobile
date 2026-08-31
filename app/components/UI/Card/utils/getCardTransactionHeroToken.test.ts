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
            walletAddress: '0xabc',
            chainId: 'eip155:143',
          },
        ],
      }),
    );

    expect(result.symbol).toBe(MONEY_ACCOUNT_DISPLAY_SYMBOL);
  });

  it('returns the resolved funding token when currency is present', () => {
    const result = getCardTransactionHeroToken(
      createTransaction({
        fundingSources: [
          {
            currency: 'usdc',
            walletAddress: '0xwallet',
            chainId: 'eip155:59144',
          },
        ],
      }),
      {
        address: '0xusdc',
        caipChainId: 'eip155:59144',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        fundingStatus: 'enabled',
        spendableBalance: '10',
      } as never,
    );

    expect(result.symbol).toBe('USDC');
    expect(result.iconSource).toEqual({
      uri: 'https://example.com/token.png',
    });
  });

  it('returns mUSD for musd funding currency', () => {
    const result = getCardTransactionHeroToken(
      createTransaction({
        fundingSources: [{ currency: 'musd' }],
      }),
    );

    expect(result.symbol).toBe(MONEY_ACCOUNT_DISPLAY_SYMBOL);
  });

  it('returns the fallback token when funding has currency but no resolved token', () => {
    const result = getCardTransactionHeroToken(
      createTransaction({
        fundingSources: [{ currency: 'eure' }],
      }),
      {
        address: '0xusdc',
        caipChainId: 'eip155:8453',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        fundingStatus: 'enabled',
        spendableBalance: '10',
      } as never,
    );

    expect(result.symbol).toBe('USDC');
  });

  it('uppercases funding currency when there is no resolved token or fallback', () => {
    const result = getCardTransactionHeroToken(
      createTransaction({
        fundingSources: [{ currency: 'eure' }],
      }),
    );

    expect(result.symbol).toBe('EURE');
  });

  it('returns mUSD when the transaction is undefined and no fallback is provided', () => {
    const result = getCardTransactionHeroToken(undefined);

    expect(result.symbol).toBe(MONEY_ACCOUNT_DISPLAY_SYMBOL);
  });
});
