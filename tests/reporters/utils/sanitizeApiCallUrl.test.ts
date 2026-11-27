import { sanitizeApiCallUrl } from './sanitizeApiCallUrl';

describe('sanitizeApiCallUrl', () => {
  it('drops protocol, query and fragment and masks key-like segments', () => {
    expect(
      sanitizeApiCallUrl(
        'https://mainnet.infura.io/v3/0123456789abcdef0123456789abcdef?x=secret#frag',
      ),
    ).toBe('mainnet.infura.io/v3/***');
  });

  it('keeps EVM addresses readable', () => {
    expect(
      sanitizeApiCallUrl(
        'https://api.example.com/tokens/0x1234567890abcdef1234567890abcdef12345678',
      ),
    ).toBe('api.example.com/tokens/0x1234567890abcdef1234567890abcdef12345678');
  });

  it('clips very long URLs', () => {
    const sanitized = sanitizeApiCallUrl(
      `https://api.example.com/${'a/'.repeat(100)}`,
    );

    expect(sanitized).toHaveLength(120);
    expect(sanitized.endsWith('…')).toBe(true);
  });

  it('returns an empty string for missing input', () => {
    expect(sanitizeApiCallUrl(undefined)).toBe('');
    expect(sanitizeApiCallUrl(null)).toBe('');
  });
});
