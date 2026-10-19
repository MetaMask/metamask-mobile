import { formatFiat } from './fiat';
import { getIntlNumberFormatter } from '../../../../util/intl';
import Logger from '../../../../util/Logger';

jest.mock('../../../../util/intl', () => ({
  getIntlNumberFormatter: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  locale: 'en-US',
  strings: jest.fn((key: string) => key),
}));

const mockGetIntlNumberFormatter = jest.mocked(getIntlNumberFormatter);
const mockLogger = jest.mocked(Logger);

const mockFormatter = { format: jest.fn() };

describe('formatFiat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIntlNumberFormatter.mockReturnValue(
      mockFormatter as unknown as ReturnType<typeof getIntlNumberFormatter>,
    );
    mockFormatter.format.mockImplementation((n) => `formatted:${String(n)}`);
  });

  it('formats an amount in the given currency', () => {
    const output = formatFiat('100', 'eur');

    expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith(
      'en-US',
      expect.objectContaining({ style: 'currency', currency: 'eur' }),
    );
    expect(mockFormatter.format).toHaveBeenCalledWith('100');
    expect(output).toBe('formatted:100');
  });

  it('accepts a number as well as a string', () => {
    expect(formatFiat(42.5, 'usd')).toBe('formatted:42.5');
  });

  it('uses minimumFractionDigits=0 for integer amounts', () => {
    formatFiat('100', 'eur');

    expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith(
      'en-US',
      expect.objectContaining({ minimumFractionDigits: 0 }),
    );
  });

  it('uses minimumFractionDigits=2 for non-integer amounts', () => {
    formatFiat('100.5', 'eur');

    expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith(
      'en-US',
      expect.objectContaining({ minimumFractionDigits: 2 }),
    );
  });

  it('returns undefined when the amount is undefined', () => {
    // Callers pass a missing rate straight through as "hide fiat".
    expect(formatFiat(undefined, 'eur')).toBeUndefined();
    expect(mockFormatter.format).not.toHaveBeenCalled();
  });

  it('falls back to `${value} ${currency}` when Intl throws', () => {
    // Unsupported currency codes make Intl throw; the balance must still render.
    mockGetIntlNumberFormatter.mockImplementation(() => {
      throw new Error('boom');
    });

    expect(formatFiat('42', 'eur')).toBe('42 eur');
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
