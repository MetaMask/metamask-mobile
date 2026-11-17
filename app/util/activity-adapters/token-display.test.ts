import { createFormatters } from '@metamask/client-utils';
import { formatTokenDisplayAmount } from './token-display';

const formatters = createFormatters({ locale: 'en' });

describe('formatTokenDisplayAmount', () => {
  it('formats a numeric amount with the symbol appended', () => {
    const result = formatTokenDisplayAmount(formatters, '1.714557', 'USDC');

    expect(result).toBe('1.7146 USDC');
  });

  it('omits the trailing separator when there is no symbol', () => {
    const result = formatTokenDisplayAmount(formatters, '1.714557');

    expect(result).toBe('1.7146');
  });

  it('passes a non-numeric amount through verbatim with the symbol', () => {
    const result = formatTokenDisplayAmount(formatters, '1,500', 'USDC');

    expect(result).toBe('1,500 USDC');
  });

  it('passes a non-numeric amount through verbatim without a symbol', () => {
    const result = formatTokenDisplayAmount(formatters, 'NaN');

    expect(result).toBe('NaN');
  });

  it('labels amounts below the display threshold', () => {
    const result = formatTokenDisplayAmount(formatters, '0.000001', 'ETH');

    expect(result).toBe('<0.00001 ETH');
  });
});
