import { parseSolanaPayUrl } from './parseSolanaPayUrl';

const TRIPLE_A_RECIPIENT = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

describe('parseSolanaPayUrl', () => {
  it('parses a Solana Pay transfer request with amount and USDC mint', () => {
    const url = `solana:${TRIPLE_A_RECIPIENT}?amount=25.515000&spl-token=${USDC_MINT}`;

    const result = parseSolanaPayUrl(url);

    expect(result).toEqual({
      type: 'transfer',
      recipient: TRIPLE_A_RECIPIENT,
      amount: '25.515000',
      splToken: USDC_MINT,
      label: undefined,
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
      label: undefined,
      reference: undefined,
    });
  });

  it('parses optional label and reference query params', () => {
    const url = `solana:${TRIPLE_A_RECIPIENT}?amount=1&label=Emirates&reference=${TRIPLE_A_RECIPIENT}`;

    const result = parseSolanaPayUrl(url);

    expect(result).toEqual({
      type: 'transfer',
      recipient: TRIPLE_A_RECIPIENT,
      amount: '1',
      splToken: undefined,
      label: 'Emirates',
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
