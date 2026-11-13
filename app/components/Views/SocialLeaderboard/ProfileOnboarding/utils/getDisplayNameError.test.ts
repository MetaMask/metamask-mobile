import { strings } from '../../../../../../locales/i18n';
import { MAX_DISPLAY_NAME_LENGTH } from '../profileOnboardingDraft';
import { getDisplayNameError } from './getDisplayNameError';

const TOO_LONG = strings('social_leaderboard.errors.display_name_too_long', {
  max: MAX_DISPLAY_NAME_LENGTH,
});
const INVALID = strings('social_leaderboard.errors.display_name_invalid');
const CHECK_ERROR = strings(
  'social_leaderboard.errors.display_name_check_error',
);

describe('getDisplayNameError', () => {
  it('reports the length rule without asking the API past 50 characters', async () => {
    const checkDisplayNameValidity = jest.fn();

    const error = await getDisplayNameError(
      `  ${'A'.repeat(MAX_DISPLAY_NAME_LENGTH + 1)}  `,
      checkDisplayNameValidity,
    );

    expect(error).toBe(TOO_LONG);
    expect(checkDisplayNameValidity).not.toHaveBeenCalled();
  });

  it('asks the API with the trimmed name and stays quiet when it passes', async () => {
    const checkDisplayNameValidity = jest
      .fn()
      .mockResolvedValue({ valid: true });

    const error = await getDisplayNameError(
      '  Laser Gains  ',
      checkDisplayNameValidity,
    );

    expect(error).toBeNull();
    expect(checkDisplayNameValidity).toHaveBeenCalledWith('Laser Gains');
  });

  it('reports a name the API rejects', async () => {
    const checkDisplayNameValidity = jest
      .fn()
      .mockResolvedValue({ valid: false });

    const error = await getDisplayNameError(
      'Bad Name',
      checkDisplayNameValidity,
    );

    expect(error).toBe(INVALID);
  });

  it('reports a connection problem when the API cannot be reached', async () => {
    const checkDisplayNameValidity = jest
      .fn()
      .mockRejectedValue(new Error('offline'));

    const error = await getDisplayNameError(
      'Laser Gains',
      checkDisplayNameValidity,
    );

    expect(error).toBe(CHECK_ERROR);
  });
});
