import { adaptFillFromLighterTrade } from '@metamask/perps-controller/utils/lighterAdapter';

type LighterTrade = Parameters<typeof adaptFillFromLighterTrade>[0];

const createTrade = (overrides: Partial<LighterTrade> = {}): LighterTrade => ({
  tradeId: 55657,
  marketId: 4095,
  size: '0.0021',
  price: '2672.85',
  askId: 281474977125945,
  bidId: 562949953001961,
  askAccountId: 124,
  bidAccountId: 64,
  isMakerAsk: true,
  timestamp: 1790739032604,
  takerPositionSizeBefore: '0.0054',
  makerPositionSizeBefore: '0',
  ...overrides,
});

// Exercise the installed controller using the additional opening fill
// observed on Lighter testnet. REST decoding is also covered by the live recipe.
describe('Lighter fill normalization', () => {
  it('reads an additional opening fill with omitted sign flags and PnL', () => {
    const trade = createTrade();

    const fill = adaptFillFromLighterTrade(trade, 'ETH', 64);

    expect(fill).toMatchObject({
      orderId: '562949953001961',
      fillId: '55657',
      providerId: 'lighter',
      size: '0.0021',
      direction: 'Buy',
    });
    expect(fill.startPosition).toBeUndefined();
    expect(fill).not.toHaveProperty('pnl');
  });

  it('retains an ambiguous sell without inventing a closing position', () => {
    const trade = createTrade({ makerPositionSizeBefore: '0.0054' });

    const fill = adaptFillFromLighterTrade(trade, 'ETH', 124);

    expect(fill).toMatchObject({ direction: 'Sell' });
    expect(fill.startPosition).toBeUndefined();
    expect(fill).not.toHaveProperty('pnl');
  });

  it.each([
    [true, 64, 'Open Long'],
    [false, 64, 'Open Long'],
    [true, 124, 'Open Short'],
    [false, 124, 'Open Short'],
  ])(
    'derives maker-ask %s / account %s as %s from a flat baseline',
    (isMakerAsk, accountIndex, direction) => {
      const trade = createTrade({
        isMakerAsk,
        takerPositionSizeBefore: '0',
        makerPositionSizeBefore: '0',
      });

      const fill = adaptFillFromLighterTrade(trade, 'ETH', accountIndex);

      expect(fill).toMatchObject({ direction, startPosition: '0' });
      expect(fill).not.toHaveProperty('pnl');
    },
  );

  it.each([
    [64, '0.001', 'Close Short', '-0.0054'],
    [64, '0.01', 'Short > Long', '-0.0054'],
    [124, '0.001', 'Close Long', '0.0054'],
    [124, '0.01', 'Long > Short', '0.0054'],
  ])(
    'uses realized PnL for account %s and size %s to derive %s',
    (accountIndex, size, direction, startPosition) => {
      const trade = createTrade({
        size,
        takerPositionSizeBefore: '0.0054',
        makerPositionSizeBefore: '0.0054',
        askAccountPnl: '-0.1',
        bidAccountPnl: '0.1',
      });

      const fill = adaptFillFromLighterTrade(trade, 'ETH', accountIndex);

      expect(fill).toMatchObject({ direction, startPosition });
      expect(fill.pnl).toBe(accountIndex === 64 ? '0.1' : '-0.1');
    },
  );

  it.each([
    [true, '0.0054', 'Close Short'],
    [true, '0.01', 'Short > Long'],
    [false, '0.001', 'Buy'],
  ])('preserves flag %s with size %s as %s', (flag, size, direction) => {
    const trade = createTrade({
      takerPositionSignChanged: flag,
      size,
      bidAccountPnl: '0',
    });

    const fill = adaptFillFromLighterTrade(trade, 'ETH', 64);

    expect(fill.direction).toBe(direction);
  });

  it.each([
    ['takerPositionSignChanged', null, 64],
    ['takerPositionSignChanged', 'false', 64],
    ['makerPositionSignChanged', 0, 124],
    ['bidAccountPnl', null, 64],
    ['bidAccountPnl', '', 64],
    ['bidAccountPnl', '1oops', 64],
    ['takerPositionSizeBefore', undefined, 64],
    ['takerPositionSizeBefore', '-1', 64],
  ])('rejects supplied %s value %s for account %s', (field, value, account) => {
    const trade = {
      ...createTrade(),
      [field]: value,
    } as unknown as LighterTrade;

    const normalize = () => adaptFillFromLighterTrade(trade, 'ETH', account);

    expect(normalize).toThrow('Invalid Lighter venue data');
  });
});
