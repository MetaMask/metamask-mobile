import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { MINIMUM_DISPLAY_THRESHOLD } from '../../../../../../../util/number/bigint';
import { formatExchangeRate } from './formatExchangeRate';

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

  it('formats large rates without spurious fraction digits', () => {
    const result = formatExchangeRate(
      createToken('ETH', 3000),
      createToken('USDC', 1),
    );

    expect(result).toBe('1 ETH = 3000 USDC');
  });

  it('uses the dust threshold for sub-micro meme-coin rates', () => {
    const destPepe = createToken('PEPE', 0.000008);
    const sourceEth = createToken('ETH', 3000);

    const result = formatExchangeRate(destPepe, sourceEth);

    expect(result).toBe(`1 PEPE = < ${MINIMUM_DISPLAY_THRESHOLD} ETH`);
  });

  it('formats mid-range rates up to five decimal places', () => {
    const dest = createToken('TOKEN', 0.05);
    const source = createToken('USDC', 1);

    expect(formatExchangeRate(dest, source)).toBe('1 TOKEN = 0.05 USDC');
  });
});
