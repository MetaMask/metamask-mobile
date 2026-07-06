import { canonicalizeRampId, rampIdsEqual, rampIdInList } from './rampIdMatch';

describe('canonicalizeRampId', () => {
  it('strips a leading collection prefix for each entity type', () => {
    expect(canonicalizeRampId('/providers/transak')).toBe('transak');
    expect(canonicalizeRampId('/payments/debit-credit-card')).toBe(
      'debit-credit-card',
    );
    expect(canonicalizeRampId('/regions/us-ca')).toBe('us-ca');
  });

  it('preserves nested currency structure', () => {
    expect(canonicalizeRampId('/currencies/crypto/1/eth')).toBe('crypto/1/eth');
  });

  it('is idempotent on already-canonical ids', () => {
    expect(canonicalizeRampId('transak')).toBe('transak');
    expect(canonicalizeRampId('transak-native')).toBe('transak-native');
  });

  it('leaves unknown prefixes untouched', () => {
    expect(canonicalizeRampId('/unknown/x')).toBe('/unknown/x');
  });
});

describe('rampIdsEqual', () => {
  it('matches the legacy path form against the canonical form (provider)', () => {
    expect(rampIdsEqual('/providers/transak', 'transak')).toBe(true);
    expect(rampIdsEqual('transak', '/providers/transak')).toBe(true);
  });

  it('matches payment method ids across forms', () => {
    expect(
      rampIdsEqual('/payments/debit-credit-card', 'debit-credit-card'),
    ).toBe(true);
  });

  it('matches nested currency ids across forms', () => {
    expect(rampIdsEqual('/currencies/crypto/1/eth', 'crypto/1/eth')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(rampIdsEqual('/providers/Transak', 'transak')).toBe(true);
  });

  it('returns true for identical canonical ids', () => {
    expect(rampIdsEqual('transak', 'transak')).toBe(true);
  });

  it('does not over-match distinct ids that share a prefix', () => {
    expect(rampIdsEqual('transak-native', 'transak')).toBe(false);
    expect(rampIdsEqual('/providers/transak', 'moonpay')).toBe(false);
  });

  it('returns false when either id is nullish', () => {
    expect(rampIdsEqual(undefined, 'transak')).toBe(false);
    expect(rampIdsEqual('transak', null)).toBe(false);
    expect(rampIdsEqual(null, undefined)).toBe(false);
  });
});

describe('rampIdInList', () => {
  it('finds a canonical id in a mixed legacy + canonical list', () => {
    const list = ['/providers/transak', 'moonpay'];
    expect(rampIdInList(list, 'transak')).toBe(true);
    expect(rampIdInList(list, '/providers/moonpay')).toBe(true);
  });

  it('returns false when no entry matches', () => {
    expect(rampIdInList(['/providers/transak', 'moonpay'], 'banxa')).toBe(
      false,
    );
  });

  it('returns false for a nullish id or empty list', () => {
    expect(rampIdInList(['/providers/transak'], null)).toBe(false);
    expect(rampIdInList([], 'transak')).toBe(false);
  });

  it('tolerates nullish entries in the list', () => {
    expect(
      rampIdInList([null, undefined, '/providers/transak'], 'transak'),
    ).toBe(true);
  });
});
