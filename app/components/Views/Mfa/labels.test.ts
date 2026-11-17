import type { EnrolledCredential } from '@metamask/profile-sync-controller/sdk';
import { getCreatedOn, getLastUsedLine, getLastUsedValue } from './labels';

const passkey = (extra: Partial<EnrolledCredential> = {}) =>
  ({
    id: 'passkey',
    type: 'passkey',
    status: 'active',
    ...extra,
  }) as EnrolledCredential;

describe('passkey dates', () => {
  it.each([
    [
      new Date(2026, 10, 10, 8, 0).getTime(),
      'Last used Nov 10, 2026',
      'Nov 10, 2026',
    ],
    [
      new Date(2026, 9, 10, 9, 0).getTime(),
      'Last used Oct 10, 2026',
      'Oct 10, 2026',
    ],
    [undefined, 'Not used yet', 'Not used yet'],
  ])('describes a passkey last used at %s', (lastUsedAt, line, value) => {
    const credential = passkey({ lastUsedAt });

    expect(getLastUsedLine(credential)).toBe(line);
    expect(getLastUsedValue(credential)).toBe(value);
  });

  it('gives the day a passkey was created, when the server says', () => {
    expect(
      getCreatedOn(passkey({ enrolledAt: new Date(2026, 9, 10).getTime() })),
    ).toBe('Oct 10, 2026');
    expect(getCreatedOn(passkey())).toBeUndefined();
  });
});
