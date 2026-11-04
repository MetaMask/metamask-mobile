import { readOrderCommitDisplay } from './orderCommit';
import { TemplateError } from './venueTemplates';

const KEY = 'a1b2c3d4-1111-4222-8333-444455556666';

describe('readOrderCommitDisplay', () => {
  it('returns the buy cap rounded up to the cent', () => {
    const display = readOrderCommitDisplay(
      {
        action: 'buy',
        outcome: 'yes',
        marketId: 'MKT',
        idempotencyKey: KEY,
        amountCents: 52,
      },
      { count: '1.00', price: '0.5000' },
    );

    expect(display).toEqual({
      maxCost: '0.52',
      contracts: '1.00',
      minProceeds: '0.50',
    });
  });

  it('refuses a buy one cent under the cap', () => {
    expect(() =>
      readOrderCommitDisplay(
        {
          action: 'buy',
          outcome: 'yes',
          marketId: 'MKT',
          idempotencyKey: KEY,
          amountCents: 51,
        },
        { count: '1.00', price: '0.5000' },
      ),
    ).toThrow(TemplateError);
  });

  it('prices a NO outcome as one minus the yes-leg price', () => {
    const display = readOrderCommitDisplay(
      {
        action: 'buy',
        outcome: 'no',
        marketId: 'MKT',
        idempotencyKey: KEY,
        amountCents: 42,
      },
      { count: '1.00', price: '0.6000' },
    );

    expect(display.maxCost).toBe('0.42');
    expect(display.minProceeds).toBe('0.40');
  });

  it('rounds sell proceeds down and requires the typed contract count', () => {
    const display = readOrderCommitDisplay(
      {
        action: 'sell',
        outcome: 'yes',
        marketId: 'MKT',
        idempotencyKey: KEY,
        contracts: '75',
      },
      { count: '75.00', price: '0.4000' },
    );

    expect(display.minProceeds).toBe('30.00');
    expect(() =>
      readOrderCommitDisplay(
        {
          action: 'sell',
          outcome: 'yes',
          marketId: 'MKT',
          idempotencyKey: KEY,
          contracts: '1',
        },
        { count: '75.00', price: '0.4000' },
      ),
    ).toThrow(TemplateError);
  });
});
