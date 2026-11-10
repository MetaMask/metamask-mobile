import {
  clearPortfolioTotalCache,
  nonTokenContribution,
  portfolioTotal,
  rememberPortfolioTotal,
  sumDefiPositionsUsd,
} from './portfolioBalance';

describe('nonTokenContribution', () => {
  it('sums ready perps, predictions, DeFi, and money', () => {
    const contribution = nonTokenContribution({
      perps: { status: 'ready', valueFiat: 10 },
      predict: { status: 'ready', valueFiat: 2.5 },
      defi: { status: 'ready', valueFiat: 1 },
      money: { status: 'ready', valueFiat: 4 },
    });

    expect(contribution).toEqual({ totalFiat: 17.5, isLoading: false });
  });

  it('skips ineligible and errored products', () => {
    const contribution = nonTokenContribution({
      perps: { status: 'ineligible', valueFiat: 10 },
      predict: { status: 'error', valueFiat: 8 },
      defi: { status: 'ready', valueFiat: 3 },
    });

    expect(contribution).toEqual({ totalFiat: 3, isLoading: false });
  });

  it('reports loading without treating a missing product as zero', () => {
    const contribution = nonTokenContribution({
      perps: { status: 'loading', valueFiat: 0 },
      predict: { status: 'ready', valueFiat: 2 },
    });

    expect(contribution).toEqual({ totalFiat: 2, isLoading: true });
  });
});

describe('portfolioTotal', () => {
  beforeEach(() => {
    clearPortfolioTotalCache();
  });

  it('adds non-token balances to the selected aggregated token total', () => {
    const total = portfolioTotal({
      isSelected: true,
      tokenTotal: 12.5,
      contribution: { totalFiat: 17.5, isLoading: false },
    });

    expect(total).toBe(30);
  });

  it('keeps the token total while another product is still loading', () => {
    const total = portfolioTotal({
      isSelected: true,
      tokenTotal: 12.5,
      contribution: { totalFiat: 2, isLoading: true },
    });

    expect(total).toBe(14.5);
  });

  it('keeps a previously selected full total after the account changes', () => {
    rememberPortfolioTotal('usd', 'group-1', 30);

    const total = portfolioTotal({
      isSelected: false,
      tokenTotal: 12.5,
      contribution: { totalFiat: 0, isLoading: false },
      cachedTotal: 30,
    });

    expect(total).toBe(30);
  });

  it('uses the aggregated token total for an account that was never selected', () => {
    const total = portfolioTotal({
      isSelected: false,
      tokenTotal: 5,
      contribution: { totalFiat: 17.5, isLoading: false },
    });

    expect(total).toBe(5);
  });
});

describe('sumDefiPositionsUsd', () => {
  it('adds aggregated market value across chains and protocols', () => {
    expect(
      sumDefiPositionsUsd({
        '0x1': {
          protocols: {
            aave: { aggregatedMarketValue: '12.5' },
            morpho: { aggregatedMarketValue: 2 },
          },
        },
        '0x2': { protocols: { lido: { aggregatedMarketValue: '1' } } },
      } as Parameters<typeof sumDefiPositionsUsd>[0]),
    ).toBe(15.5);
  });

  it('skips empty chains and non-numeric values', () => {
    expect(
      sumDefiPositionsUsd({
        '0x1': undefined,
        '0x2': { protocols: { bad: { aggregatedMarketValue: 'nope' } } },
      } as Parameters<typeof sumDefiPositionsUsd>[0]),
    ).toBe(0);
  });
});
