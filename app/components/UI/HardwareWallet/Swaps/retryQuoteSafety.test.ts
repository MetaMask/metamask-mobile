import { isRetryQuoteAcceptable } from './retryQuoteSafety';

function makeQuote(overrides: {
  srcChainId?: number;
  destChainId?: number;
  srcAddress?: string;
  destAddress?: string;
  minDestTokenAmount?: string;
}) {
  return {
    quote: {
      srcChainId: overrides.srcChainId ?? 1,
      destChainId: overrides.destChainId ?? 1,
      srcAsset: { address: overrides.srcAddress ?? '0xSrc' },
      destAsset: { address: overrides.destAddress ?? '0xDest' },
      minDestTokenAmount: overrides.minDestTokenAmount ?? '1000',
    },
  } as unknown as Parameters<typeof isRetryQuoteAcceptable>[0];
}

describe('isRetryQuoteAcceptable', () => {
  it('accepts when fresh min-out exactly equals cached', () => {
    const cached = makeQuote({ minDestTokenAmount: '1000' });
    const fresh = makeQuote({ minDestTokenAmount: '1000' });
    expect(isRetryQuoteAcceptable(cached, fresh)).toBe(true);
  });

  it('accepts when fresh min-out is greater than cached', () => {
    const cached = makeQuote({ minDestTokenAmount: '1000' });
    const fresh = makeQuote({ minDestTokenAmount: '1500' });
    expect(isRetryQuoteAcceptable(cached, fresh)).toBe(true);
  });

  it('rejects when fresh min-out is less than cached', () => {
    const cached = makeQuote({ minDestTokenAmount: '1000' });
    const fresh = makeQuote({ minDestTokenAmount: '999' });
    expect(isRetryQuoteAcceptable(cached, fresh)).toBe(false);
  });

  it('rejects when src chain differs', () => {
    const cached = makeQuote({ srcChainId: 1 });
    const fresh = makeQuote({ srcChainId: 137 });
    expect(isRetryQuoteAcceptable(cached, fresh)).toBe(false);
  });

  it('rejects when dest chain differs', () => {
    const cached = makeQuote({ destChainId: 1 });
    const fresh = makeQuote({ destChainId: 10 });
    expect(isRetryQuoteAcceptable(cached, fresh)).toBe(false);
  });

  it('rejects when src asset address differs', () => {
    const cached = makeQuote({ srcAddress: '0xAAA' });
    const fresh = makeQuote({ srcAddress: '0xBBB' });
    expect(isRetryQuoteAcceptable(cached, fresh)).toBe(false);
  });

  it('rejects when dest asset address differs', () => {
    const cached = makeQuote({ destAddress: '0xAAA' });
    const fresh = makeQuote({ destAddress: '0xBBB' });
    expect(isRetryQuoteAcceptable(cached, fresh)).toBe(false);
  });

  it('handles 256-bit min-out values without precision loss', () => {
    const big = '115792089237316195423570985008687907853269984665640564039457';
    const cached = makeQuote({ minDestTokenAmount: big });
    const fresh = makeQuote({ minDestTokenAmount: big });
    expect(isRetryQuoteAcceptable(cached, fresh)).toBe(true);
  });

  it('is case-insensitive on asset addresses', () => {
    const cached = makeQuote({ srcAddress: '0xAbC' });
    const fresh = makeQuote({ srcAddress: '0xABC' });
    expect(isRetryQuoteAcceptable(cached, fresh)).toBe(true);
  });
});
