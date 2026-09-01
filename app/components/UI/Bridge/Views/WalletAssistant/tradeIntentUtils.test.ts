import {
  getTradeNetworkChainId,
  resolveTradeSourceAmount,
  resolveTradeToken,
  TradeTokenCandidate,
} from './tradeIntentUtils';

describe('getTradeNetworkChainId', () => {
  it('maps Robinhood Chain to its CAIP chain ID', () => {
    expect(getTradeNetworkChainId('Robinhood Chain')).toBe('eip155:4663');
  });
});

interface TestToken extends TradeTokenCandidate {
  name: string;
}

const TOKENS: TestToken[] = [
  {
    assetId: 'eip155:1/erc20:0xeth',
    name: 'Ethereum ETH',
    symbol: 'ETH',
  },
  {
    assetId: 'eip155:8453/erc20:0xeth',
    name: 'Base ETH',
    symbol: 'ETH',
  },
  {
    assetId: 'eip155:1/erc20:0xusdc',
    name: 'USD Coin',
    symbol: 'USDC',
  },
  {
    assetId: 'solana:mainnet/token:sol',
    name: 'Solana',
    symbol: 'SOL',
  },
  {
    assetId: 'eip155:4663/erc20:0x020b',
    name: 'CashCat',
    symbol: 'CASHCAT',
  },
];

describe('resolveTradeToken', () => {
  it('resolves a unique ticker', () => {
    const result = resolveTradeToken(TOKENS, 'usdc', '', '');

    expect(result).toEqual({
      asset: TOKENS[2],
      isAmbiguous: false,
    });
  });

  it('leaves a duplicated ticker unresolved without network context', () => {
    const result = resolveTradeToken(TOKENS, 'ETH', '', '');

    expect(result).toEqual({
      asset: undefined,
      isAmbiguous: true,
    });
  });

  it('uses an explicitly named network to disambiguate a ticker', () => {
    const result = resolveTradeToken(TOKENS, 'ETH', 'Base', '0x1');

    expect(result).toEqual({
      asset: TOKENS[1],
      isAmbiguous: false,
    });
  });

  it.each([
    ['0x1', TOKENS[0]],
    ['1', TOKENS[0]],
    ['eip155:8453', TOKENS[1]],
  ])('uses active chain %s when no network is named', (chainId, token) => {
    const result = resolveTradeToken(TOKENS, 'ETH', '', chainId);

    expect(result.asset).toBe(token);
    expect(result.isAmbiguous).toBe(false);
  });

  it('does not fall back to the active chain for an unknown network', () => {
    const result = resolveTradeToken(TOKENS, 'ETH', 'Unknown chain', '0x1');

    expect(result).toEqual({
      asset: undefined,
      isAmbiguous: false,
    });
  });

  it('resolves a Solana asset from explicit network context', () => {
    const result = resolveTradeToken(TOKENS, 'SOL', 'solana', '');

    expect(result.asset).toBe(TOKENS[3]);
  });

  it.each(['Robinhood', 'Robinhood Chain'])(
    'resolves a token on %s from explicit network context',
    (network) => {
      const result = resolveTradeToken(TOKENS, 'CASHCAT', network, '0x1');

      expect(result.asset).toBe(TOKENS[4]);
      expect(result.isAmbiguous).toBe(false);
    },
  );

  it('resolves a unique cross-chain destination without source-chain bias', () => {
    const result = resolveTradeToken(TOKENS, 'CASHCAT', '', '');

    expect(result.asset).toBe(TOKENS[4]);
    expect(result.isAmbiguous).toBe(false);
  });
});

describe('resolveTradeSourceAmount', () => {
  const sourceToken = {
    balance: '1.234567',
    currencyExchangeRate: 2000,
    decimals: 4,
  };

  it('normalizes and rounds down an exact token amount', () => {
    expect(
      resolveTradeSourceAmount(
        {
          amountType: 'exact',
          amountValue: '1.23459',
          sourceAmount: '1.23459',
        },
        sourceToken,
      ),
    ).toEqual({ amount: '1.2345', status: 'resolved' });
  });

  it('converts a percentage of balance and rounds down', () => {
    expect(
      resolveTradeSourceAmount(
        {
          amountType: 'percent',
          amountValue: '25',
        },
        sourceToken,
      ),
    ).toEqual({ amount: '0.3086', status: 'resolved' });
  });

  it('converts a fiat budget and rounds down', () => {
    expect(
      resolveTradeSourceAmount(
        {
          amountType: 'fiat',
          amountValue: '50',
        },
        sourceToken,
      ),
    ).toEqual({ amount: '0.025', status: 'resolved' });
  });

  it.each(['0', '-1', '101'])(
    'rejects an invalid percentage of %s',
    (amountValue) => {
      expect(
        resolveTradeSourceAmount(
          {
            amountType: 'percent',
            amountValue,
          },
          sourceToken,
        ),
      ).toEqual({ amount: undefined, status: 'invalid' });
    },
  );

  it('reports missing data when a fiat conversion has no price', () => {
    expect(
      resolveTradeSourceAmount(
        {
          amountType: 'fiat',
          amountValue: '50',
        },
        { decimals: 18 },
      ),
    ).toEqual({ amount: undefined, status: 'missing-data' });
  });

  it('reports missing data when a percentage has no token', () => {
    expect(
      resolveTradeSourceAmount(
        {
          amountType: 'percent',
          amountValue: '25',
        },
        undefined,
      ),
    ).toEqual({ amount: undefined, status: 'missing-data' });
  });

  it('rejects a calculated amount that rounds down to zero', () => {
    expect(
      resolveTradeSourceAmount(
        {
          amountType: 'percent',
          amountValue: '1',
        },
        { balance: '0.001', decimals: 2 },
      ),
    ).toEqual({ amount: undefined, status: 'invalid' });
  });

  it('leaves an unspecified amount unresolved', () => {
    expect(
      resolveTradeSourceAmount(
        {
          amountType: 'unspecified',
          amountValue: '',
        },
        sourceToken,
      ),
    ).toEqual({ amount: undefined, status: 'unspecified' });
  });
});
