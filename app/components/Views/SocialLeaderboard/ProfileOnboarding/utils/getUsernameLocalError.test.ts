import { strings } from '../../../../../../locales/i18n';
import {
  applyXOnboardingProfile,
  createInitialOnboardingDraft,
  MIN_USERNAME_LENGTH,
  type ProfileOnboardingDraft,
} from '../profileOnboardingDraft';
import { MAX_USERNAME_LENGTH } from '../generateUsername';
import { getUsernameLocalError } from './getUsernameLocalError';

const manualDraft = (username: string): ProfileOnboardingDraft => ({
  ...createInitialOnboardingDraft(),
  username,
});

const xDraft = (username: string): ProfileOnboardingDraft =>
  applyXOnboardingProfile(createInitialOnboardingDraft(), {
    username,
    displayName: 'Bad Name',
    avatarUrl: null,
  });

describe('getUsernameLocalError', () => {
  it('asks for the minimum length below three characters', () => {
    expect(getUsernameLocalError(manualDraft('h'), 'tooShort')).toBe(
      strings('social_leaderboard.profile_onboarding.username_too_short', {
        min: MIN_USERNAME_LENGTH,
      }),
    );
  });

  it('asks for the allowed characters when the handle breaks the charset', () => {
    expect(getUsernameLocalError(manualDraft('bad-name'), 'invalid')).toBe(
      strings('social_leaderboard.profile_onboarding.username_invalid'),
    );
  });

  it('stays quiet for an empty handle and for one that already passes', () => {
    expect(getUsernameLocalError(manualDraft(''), 'empty')).toBeNull();
    expect(
      getUsernameLocalError(manualDraft('wen_cat'), 'available'),
    ).toBeNull();
  });

  it('stays quiet for an unedited X handle even when a rule would fail', () => {
    const draft = { ...xDraft('bad-name'), useXUsername: true };

    expect(getUsernameLocalError(draft, 'tooShort')).toBeNull();
    expect(getUsernameLocalError(draft, 'invalid')).toBeNull();
  });

  it('applies the rules once the X handle is edited instead of kept', () => {
    const draft = { ...xDraft('bad-name'), useXUsername: false };

    expect(getUsernameLocalError(draft, 'tooShort')).toBe(
      strings('social_leaderboard.profile_onboarding.username_too_short', {
        min: MIN_USERNAME_LENGTH,
      }),
    );
  });

  it('asks for the maximum length for a handle above sixteen characters', () => {
    expect(getUsernameLocalError(manualDraft('a'.repeat(17)), 'tooLong')).toBe(
      strings('social_leaderboard.profile_onboarding.username_too_long', {
        max: MAX_USERNAME_LENGTH,
      }),
    );
  });
});
