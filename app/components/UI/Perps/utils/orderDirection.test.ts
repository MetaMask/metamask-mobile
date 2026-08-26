import { resolveOrderDirection, isClosingOrder } from './orderDirection';

describe('isClosingOrder', () => {
  it.each([
    ['reduce-only', { reduceOnly: true }, true],
    ['trigger (TP/SL)', { isTrigger: true }, true],
    ['reduce-only trigger', { reduceOnly: true, isTrigger: true }, true],
    ['plain (flags absent)', {}, false],
    ['plain (flags false)', { reduceOnly: false, isTrigger: false }, false],
  ] as const)('classifies a %s order → %s', (_label, order, expected) => {
    expect(isClosingOrder(order)).toBe(expected);
  });
});

describe('resolveOrderDirection', () => {
  it.each([
    // Opening: buy enters a long, sell enters a short.
    ['buy', false, 'long'],
    ['sell', false, 'short'],
    // Closing: sell exits a long, buy exits a short.
    ['sell', true, 'long'],
    ['buy', true, 'short'],
  ] as const)(
    'resolves a %s order (closing: %s) → %s',
    (side, isClosing, expected) => {
      expect(resolveOrderDirection(side, isClosing)).toBe(expected);
    },
  );
});
