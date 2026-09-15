import { CardProviderIds } from '../provider-types';
import { decodeCardCursor, encodeCardCursor } from './transactionCursor';

describe('transactionCursor', () => {
  it('round-trips a payload for the issuing provider', () => {
    const payload = { pg: 3, f: 'tx-first-id' };

    const cursor = encodeCardCursor(CardProviderIds.Baanx, payload);
    const decoded = decodeCardCursor<typeof payload>(
      cursor,
      CardProviderIds.Baanx,
    );

    expect(decoded).toStrictEqual(payload);
  });

  it('produces a URL-safe string', () => {
    // Payload chosen so plain base64 would contain '+' and '/'.
    const cursor = encodeCardCursor(CardProviderIds.Baanx, {
      f: '\u00ff\u00fe\u00fd~~~???>>>',
    });

    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/u);
  });

  it('returns null when decoded with a different provider id', () => {
    const cursor = encodeCardCursor(CardProviderIds.Baanx, { pg: 1 });

    const decoded = decodeCardCursor(cursor, CardProviderIds.Immersve);

    expect(decoded).toBeNull();
  });

  it('returns null for a malformed cursor', () => {
    expect(decodeCardCursor('not-a-cursor', CardProviderIds.Baanx)).toBeNull();
  });

  it('returns null for valid base64 that is not a cursor envelope', () => {
    const cursor = Buffer.from(JSON.stringify({ foo: 'bar' }), 'utf8').toString(
      'base64',
    );

    expect(decodeCardCursor(cursor, CardProviderIds.Baanx)).toBeNull();
  });

  it('returns null when the envelope has no payload', () => {
    const cursor = encodeCardCursor(CardProviderIds.Baanx, undefined);

    expect(decodeCardCursor(cursor, CardProviderIds.Baanx)).toBeNull();
  });
});
