import type { Position } from '@metamask/social-controllers';
import {
  resolveOwnerMismatchProfileId,
  resolvePositionAuthorProfileId,
  type PositionWithOwner,
} from './positionOwnership';

const buildPosition = (profileId?: string): Position =>
  ({ positionId: 'position-1', profileId }) as PositionWithOwner;

describe('resolveOwnerMismatchProfileId', () => {
  it('shows the position under its real owner', () => {
    expect(resolveOwnerMismatchProfileId('owner-profile')).toBe(
      'owner-profile',
    );
  });
});

describe('resolvePositionAuthorProfileId', () => {
  it('keeps the link trader when the position has no owner', () => {
    expect(
      resolvePositionAuthorProfileId(buildPosition(), 'trader-profile', {
        profileId: 'trader-profile',
      }),
    ).toBe('trader-profile');
  });

  it('keeps the link trader when its resolved profile owns the position', () => {
    expect(
      resolvePositionAuthorProfileId(buildPosition('trader-profile'), '0xabc', {
        profileId: 'trader-profile',
      }),
    ).toBe('0xabc');
  });

  it('returns the owner profile id when the link trader does not own the position', () => {
    expect(
      resolvePositionAuthorProfileId(
        buildPosition('owner-profile'),
        'trader-profile',
        { profileId: 'trader-profile' },
      ),
    ).toBe('owner-profile');
  });

  it('compares traderId itself when the profile could not be fetched', () => {
    expect(
      resolvePositionAuthorProfileId(
        buildPosition('trader-profile'),
        'trader-profile',
        null,
      ),
    ).toBe('trader-profile');
    expect(
      resolvePositionAuthorProfileId(
        buildPosition('owner-profile'),
        'trader-profile',
        null,
      ),
    ).toBe('owner-profile');
  });
});
