import { latestByUpdatedAt, pickRoutableCardLink } from './cardLinks';
import type { CardLink } from '../types';

const link = (
  provider: CardLink['provider'],
  status: CardLink['status'],
  updatedAt = '2026-09-01T00:00:00.000Z',
): CardLink => ({
  provider,
  status,
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
    const newest = link('baanx', 'active', '2026-09-03T00:00:00.000Z');

    expect(
      latestByUpdatedAt([
        link('baanx', 'active', '2026-09-01T00:00:00.000Z'),
        newest,
        link('baanx', 'active', '2026-09-02T00:00:00.000Z'),
      ]),
    ).toBe(newest);
  });
});

describe('pickRoutableCardLink', () => {
  it('returns null for no links', () => {
    expect(pickRoutableCardLink(null)).toBeNull();
    expect(pickRoutableCardLink([])).toBeNull();
  });

  it('prefers an active row over an onboarding row', () => {
    expect(
      pickRoutableCardLink([
        link('baanx', 'onboarding'),
        link('immersve', 'active'),
      ]),
    ).toStrictEqual(link('immersve', 'active'));
  });

  it('breaks a tie with the newest row', () => {
    expect(
      pickRoutableCardLink([
        link('baanx', 'active', '2026-09-01T00:00:00.000Z'),
        link('immersve', 'active', '2026-09-02T00:00:00.000Z'),
      ]),
    ).toStrictEqual(link('immersve', 'active', '2026-09-02T00:00:00.000Z'));
  });

  it('ignores closed rows', () => {
    expect(pickRoutableCardLink([link('baanx', 'closed')])).toBeNull();
  });
});
