import { pickLatestTransaction } from './pickLatestTransaction';

describe('pickLatestTransaction', () => {
  it('returns undefined for an empty list', () => {
    expect(pickLatestTransaction([])).toBeUndefined();
  });

  it('prefers the newest createdAt over array order', () => {
    const latest = pickLatestTransaction([
      { id: 'old', status: 'Completed', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'new', status: 'Pending', createdAt: '2026-06-01T00:00:00Z' },
    ]);

    expect(latest?.id).toBe('new');
  });

  it('prefers an in-flight status when timestamps are missing', () => {
    const latest = pickLatestTransaction([
      { id: 'done', status: 'Completed' },
      { id: 'pending', status: 'Pending' },
    ]);

    expect(latest?.id).toBe('pending');
  });

  it('falls back to the last terminal transaction when all are terminal', () => {
    const latest = pickLatestTransaction([
      { id: 'first', status: 'Failed' },
      { id: 'last', status: 'Completed' },
    ]);

    expect(latest?.id).toBe('last');
  });

  it('ignores invalid createdAt values', () => {
    const latest = pickLatestTransaction([
      { id: 'bad', status: 'Completed', createdAt: 'not-a-date' },
      { id: 'pending', status: 'Pending' },
    ]);

    expect(latest?.id).toBe('pending');
  });
});
