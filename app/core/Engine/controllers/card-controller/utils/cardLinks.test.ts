import type { CardLink } from '../types';
import { latestByUpdatedAt } from './cardLinks';

const link = (updatedAt: string): CardLink => ({
  provider: 'baanx',
  status: 'active',
  linkedAccountRef: null,
  closedReason: null,
  migratedToProvider: null,
  linkedAt: '2026-09-01T00:00:00.000Z',
  updatedAt,
});

describe('latestByUpdatedAt', () => {
  it('returns null for no rows', () => {
    expect(latestByUpdatedAt([])).toBeNull();
  });

  it('returns the row with the newest updatedAt', () => {
    const newest = link('2026-09-03T00:00:00.000Z');

    expect(
      latestByUpdatedAt([
        link('2026-09-01T00:00:00.000Z'),
        newest,
        link('2026-09-02T00:00:00.000Z'),
      ]),
    ).toBe(newest);
  });
});
