import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { MINIMUM_DISPLAY_THRESHOLD } from '../../../../../../../util/number/bigint';
import { formatExchangeRate } from './formatExchangeRate';

// Jest runs in Node with the `en` locale by default, so Intl number output
// uses "." as decimal separator and "," as thousands separator.

const createToken = (
  symbol: string,
  currencyExchangeRate: number,
): BridgeToken =>
  ({
    symbol,
    currencyExchangeRate,
  }) as BridgeToken;

describe('formatExchangeRate', () => {
  it('returns undefined when exchange rates are missing', () => {
    expect(formatExchangeRate(undefined, createToken('ETH', 3000))).toBe(
      undefined,
    );
    expect(formatExchangeRate(createToken('PEPE', 1), undefined)).toBe(
      undefined,
    );
  });

  it('formats large rates with thousands grouping and at most 2 decimal places', () => {
    expect(
      formatExchangeRate(createToken('ETH', 3000), createToken('USDC', 1)),
    ).toBe('1 ETH = 3,000 USDC');

    expect(
      formatExchangeRate(createToken('ETH', 1862.12), createToken('USDC', 1)),
    ).toBe('1 ETH = 1,862.12 USDC');
  });

  it('uses the dust threshold for sub-micro meme-coin rates', () => {
    const destPepe = createToken('PEPE', 0.000008);
    const sourceEth = createToken('ETH', 3000);

    const result = formatExchangeRate(destPepe, sourceEth);

    expect(result).toBe(`1 PEPE = < ${MINIMUM_DISPLAY_THRESHOLD} ETH`);
  });

  it('formats mid-range rates (< 1) with 2–3 significant digits', () => {
    const dest = createToken('TOKEN', 0.05);
    const source = createToken('USDC', 1);

    expect(formatExchangeRate(dest, source)).toBe('1 TOKEN = 0.05 USDC');
  });

  it('uses subscript notation for small rates with many leading zeros', () => {
    const dest = createToken('GIGA', 0.006375);
    const source = createToken('SOL', 150);

    expect(formatExchangeRate(dest, source)).toBe('1 GIGA = 0.0₄425 SOL');
  });
});
