import { strings } from '../../../../../../locales/i18n';
import { getUsernameFeedback } from './getUsernameFeedback';

const AVAILABLE = strings(
  'social_leaderboard.profile_onboarding.username_available',
);

describe('getUsernameFeedback', () => {
  it('prefers a local rule over a server verdict', () => {
    expect(
      getUsernameFeedback({
        localError: 'Use at least 3 characters.',
        claimError: 'This handle is unavailable. Choose another one.',
        status: 'tooShort',
      }),
    ).toEqual({ message: 'Use at least 3 characters.', tone: 'error' });
  });

  it('falls back to the claim error when no local rule fails', () => {
    expect(
      getUsernameFeedback({
        localError: null,
        claimError: 'This handle is unavailable. Choose another one.',
        status: 'available',
      }),
    ).toEqual({
      message: 'This handle is unavailable. Choose another one.',
      tone: 'error',
    });
  });

  it('reports available only when nothing else is wrong', () => {
    expect(
      getUsernameFeedback({
        localError: null,
        claimError: null,
        status: 'available',
      }),
    ).toEqual({ message: AVAILABLE, tone: 'success' });
  });

  it('renders nothing for a handle still being typed or already settled', () => {
    const quiet = { localError: null, claimError: null };

    expect(getUsernameFeedback({ ...quiet, status: 'empty' })).toBeNull();
    expect(getUsernameFeedback({ ...quiet, status: 'tooShort' })).toBeNull();
  });
});
