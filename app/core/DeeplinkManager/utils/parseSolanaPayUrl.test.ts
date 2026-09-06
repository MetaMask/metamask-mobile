import {
  hasExcessiveSolanaPayDecimals,
  normalizeSolanaPayAmount,
  parseSolanaPayUrl,
} from './parseSolanaPayUrl';

const TRIPLE_A_RECIPIENT = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('normalizeSolanaPayAmount', () => {
  it('strips trailing zeros from decimal amounts', () => {
    expect(normalizeSolanaPayAmount('25.515000')).toBe('25.515');
    expect(normalizeSolanaPayAmount('25.5000')).toBe('25.5');
    expect(normalizeSolanaPayAmount('1.0')).toBe('1');
  });

  it('rejects scientific notation, negatives, and malformed values', () => {
    expect(normalizeSolanaPayAmount('1e5')).toBeNull();
    expect(normalizeSolanaPayAmount('-1')).toBeNull();
    expect(normalizeSolanaPayAmount('.5')).toBeNull();
    expect(normalizeSolanaPayAmount('01')).toBeNull();
    expect(normalizeSolanaPayAmount('1.')).toBeNull();
    expect(normalizeSolanaPayAmount('abc')).toBeNull();
  });

  it('accepts valid Solana Pay amounts including zero', () => {
    expect(normalizeSolanaPayAmount('0')).toBe('0');
    expect(normalizeSolanaPayAmount('0.01')).toBe('0.01');
    expect(normalizeSolanaPayAmount('1.5')).toBe('1.5');
  });
});

describe('hasExcessiveSolanaPayDecimals', () => {
  it('returns false when fractional digits fit the asset decimals', () => {
    expect(hasExcessiveSolanaPayDecimals('25.515000', 6)).toBe(false);
    expect(hasExcessiveSolanaPayDecimals('1.5', 9)).toBe(false);
  });

  it('returns true when fractional digits exceed the asset decimals', () => {
    expect(hasExcessiveSolanaPayDecimals('1.1234567', 6)).toBe(true);
  });
});

describe('parseSolanaPayUrl', () => {
  it('parses a Solana Pay transfer request with amount and USDC mint', () => {
    const url = `solana:${TRIPLE_A_RECIPIENT}?amount=25.515000&spl-token=${USDC_MINT}`;

    const result = parseSolanaPayUrl(url);

    expect(result).toEqual({
      type: 'transfer',
      recipient: TRIPLE_A_RECIPIENT,
      amount: '25.515',
      splToken: USDC_MINT,
      reference: undefined,
    });
  });

  it('parses a native SOL transfer request without spl-token', () => {
    const url = `solana:${TRIPLE_A_RECIPIENT}?amount=1.5`;

    const result = parseSolanaPayUrl(url);

    expect(result).toEqual({
      type: 'transfer',
      recipient: TRIPLE_A_RECIPIENT,
      amount: '1.5',
      splToken: undefined,
      reference: undefined,
    });
  });

  it('parses optional reference query params', () => {
    const url = `solana:${TRIPLE_A_RECIPIENT}?amount=1&reference=${TRIPLE_A_RECIPIENT}`;

    const result = parseSolanaPayUrl(url);

    expect(result).toEqual({
      type: 'transfer',
      recipient: TRIPLE_A_RECIPIENT,
      amount: '1',
      splToken: undefined,
      reference: TRIPLE_A_RECIPIENT,
    });
  });

  it('preserves the first reference when multiple reference params are present', () => {
    const secondReference = 'B43FvNLyahfDqEZD7erAnr5bXZsw58nmEKiaiAoJmXEr';
    const url = `solana:${TRIPLE_A_RECIPIENT}?amount=1&reference=${TRIPLE_A_RECIPIENT}&reference=${secondReference}`;

    const result = parseSolanaPayUrl(url);

    expect(result).toEqual(
      expect.objectContaining({
        type: 'transfer',
        reference: TRIPLE_A_RECIPIENT,
      }),
    );
  });

  it('returns null for a recipient that is not a Solana address', () => {
    const url = 'solana:not-a-solana-address?amount=1';

    const result = parseSolanaPayUrl(url);

    expect(result).toBeNull();
  });

  it('returns null for an spl-token that is not a Solana address', () => {
    const url = `solana:${TRIPLE_A_RECIPIENT}?amount=1&spl-token=not-a-mint`;

    const result = parseSolanaPayUrl(url);

    expect(result).toBeNull();
  });

  it('returns null for a malformed amount', () => {
    const url = `solana:${TRIPLE_A_RECIPIENT}?amount=1e5`;

    expect(parseSolanaPayUrl(url)).toBeNull();
  });

  it('returns null when the scheme is not solana', () => {
    const url = `ethereum:${TRIPLE_A_RECIPIENT}?amount=1`;

    const result = parseSolanaPayUrl(url);

    expect(result).toBeNull();
  });

  it('returns a transaction-request for solana HTTPS URLs', () => {
    const url = 'solana:https://api.triple-a.io/pay?id=abc';

    const result = parseSolanaPayUrl(url);

    expect(result).toEqual({
      type: 'transaction-request',
      link: 'https://api.triple-a.io/pay?id=abc',
    });
  });
});
