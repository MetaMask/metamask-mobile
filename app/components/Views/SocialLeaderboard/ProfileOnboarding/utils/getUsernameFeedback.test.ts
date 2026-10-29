import { strings } from '../../../../../../locales/i18n';
import { getUsernameFeedback } from './getUsernameFeedback';

const AVAILABLE = strings(
  'social_leaderboard.profile_onboarding.username_available',
);

/** A handle that passed the local rules, so only the server verdict is open. */
const checked = {
  localError: null,
  claimError: null,
  status: 'available',
  showAvailable: true,
} as const;

describe('getUsernameFeedback', () => {
  it('prefers a local rule over a server verdict', () => {
    expect(
      getUsernameFeedback({
        ...checked,
        localError: 'Use at least 3 characters.',
        claimError: 'This handle is unavailable. Choose another one.',
        status: 'tooShort',
      }),
    ).toEqual({ message: 'Use at least 3 characters.', tone: 'error' });
  });

  it('falls back to the claim error when no local rule fails', () => {
    expect(
      getUsernameFeedback({
        ...checked,
        claimError: 'This handle is unavailable. Choose another one.',
      }),
    ).toEqual({
      message: 'This handle is unavailable. Choose another one.',
      tone: 'error',
    });
  });

  it('reports available only when nothing else is wrong', () => {
    expect(getUsernameFeedback(checked)).toEqual({
      message: AVAILABLE,
      tone: 'success',
    });
  });

  it('renders nothing for a handle still being typed or already settled', () => {
    expect(getUsernameFeedback({ ...checked, status: 'empty' })).toBeNull();
    expect(getUsernameFeedback({ ...checked, status: 'tooShort' })).toBeNull();
  });

  it('renders nothing when the handle was never checked', () => {
    expect(
      getUsernameFeedback({ ...checked, showAvailable: false }),
    ).toBeNull();
  });

  it('still reports a claim error when availability is not announced', () => {
    expect(
      getUsernameFeedback({
        ...checked,
        claimError: 'This handle is unavailable. Choose another one.',
        showAvailable: false,
      }),
    ).toEqual({
      message: 'This handle is unavailable. Choose another one.',
      tone: 'error',
    });
  });
});
