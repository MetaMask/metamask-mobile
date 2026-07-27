import { decodeCardCursor, encodeCardCursor } from './transactionCursor';

describe('transactionCursor', () => {
  it('round-trips a provider payload', () => {
    const payload = { pg: 2, f: 'tx-0' };
    const cursor = encodeCardCursor('baanx', payload);

    expect(decodeCardCursor<typeof payload>(cursor, 'baanx')).toEqual(payload);
  });

  it('returns null when the cursor belongs to a different provider', () => {
    const cursor = encodeCardCursor('baanx', { c: 'next' });

    expect(decodeCardCursor(cursor, 'immersve')).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(decodeCardCursor('not-valid-base64!!!', 'baanx')).toBeNull();
    expect(decodeCardCursor('', 'baanx')).toBeNull();
  });

  it('returns null when envelope fields are missing', () => {
    const bad = Buffer.from(
      JSON.stringify({ v: 1, p: 'baanx' }),
      'utf8',
    ).toString('base64url');

    expect(decodeCardCursor(bad, 'baanx')).toBeNull();
  });

  it('round-trips an Immersve cursor payload', () => {
    const payload = { c: 'dGhlIG5leHQgY3Vyc29y' };
    const cursor = encodeCardCursor('immersve', payload);

    expect(decodeCardCursor<typeof payload>(cursor, 'immersve')).toEqual(
      payload,
    );
  });
});
