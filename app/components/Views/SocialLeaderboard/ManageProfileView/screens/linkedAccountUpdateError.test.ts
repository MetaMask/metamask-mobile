import {
  ProfileApiErrorCode,
  ProfileServiceError,
} from '@metamask/profile-controller';
import { strings } from '../../../../../../locales/i18n';
import { getLinkedAccountUpdateError } from './linkedAccountUpdateError';

const windowCopy = (days = 30) =>
  strings('social_leaderboard.manage_profile.linked_account_cooldown', {
    days,
  });

const windowCopyFallback = () =>
  strings('social_leaderboard.manage_profile.linked_account_cooldown_default');

/**
 * The shape `HttpError` from @metamask/controller-utils carries. The preview
 * profile controller appends the API's own message to it.
 */
const httpError = (httpStatus: number, message: string): Error =>
  Object.assign(new Error(message), { httpStatus });

const cooldownError = (httpStatus = 403, days = 30) =>
  httpError(
    httpStatus,
    `ProfileService: failed to update profile: ${httpStatus}: Linked addresses can only be updated once every ${days} days`,
  );

const profileApiError = (
  code: string,
  message: string,
  details?: {
    code: string;
    message: string;
    meta?: Record<string, unknown>;
  }[],
): ProfileServiceError =>
  new ProfileServiceError(403, message, {
    code,
    ...(details ? { details } : {}),
  });

describe('getLinkedAccountUpdateError', () => {
  it('explains the cooldown when the server refuses the change', () => {
    expect(getLinkedAccountUpdateError(cooldownError())).toBe(windowCopy());
  });

  it('reads the window length from the server instead of assuming 30 days', () => {
    expect(getLinkedAccountUpdateError(cooldownError(403, 7))).toBe(
      windowCopy(7),
    );
  });

  it('states a one-day window with the plural key rather than the fallback', () => {
    expect(getLinkedAccountUpdateError(cooldownError(403, 1))).toBe(
      windowCopy(1),
    );
  });

  it('states a one-day window from the message with the plural key', () => {
    const error = profileApiError(
      ProfileApiErrorCode.ProfileLinkedAddressesCooldown,
      'ProfileService: failed to update profile: 403: Linked addresses can only be updated once every 1 day',
    );

    expect(getLinkedAccountUpdateError(error)).toBe(windowCopy(1));
  });

  it('matches the message case-insensitively', () => {
    expect(
      getLinkedAccountUpdateError(
        httpError(
          403,
          'ProfileService: failed to update profile: 403: LINKED ADDRESSES CAN ONLY BE UPDATED ONCE EVERY 30 DAYS',
        ),
      ),
    ).toBe(windowCopy());
  });

  it('states the window from the stable code rather than the time left', () => {
    const error = profileApiError(
      ProfileApiErrorCode.ProfileLinkedAddressesCooldown,
      'ProfileService: failed to update profile: 403: Linked addresses can only be updated once every 23 days',
    );

    expect(getLinkedAccountUpdateError(error)).toBe(windowCopy(23));
  });

  it('keeps stating the window when the refusal also reports the time left', () => {
    const error = profileApiError(
      ProfileApiErrorCode.ProfileLinkedAddressesCooldown,
      'ProfileService: failed to update profile: 403: Linked addresses can only be updated once every 30 days',
      [
        {
          code: 'RETRY_AFTER',
          message: 'Too soon',
          meta: { retry_after_seconds: 3 * 86_400 },
        },
      ],
    );

    expect(getLinkedAccountUpdateError(error)).toBe(windowCopy());
  });

  it('explains the cooldown with the fallback copy when the code has no day count', () => {
    const error = profileApiError(
      ProfileApiErrorCode.ProfileLinkedAddressesCooldown,
      'ProfileService: failed to update profile: 403: Too soon',
    );

    expect(getLinkedAccountUpdateError(error)).toBe(windowCopyFallback());
  });

  it('explains the cooldown with the fallback copy when only the time left is reported', () => {
    const error = profileApiError(
      ProfileApiErrorCode.ProfileLinkedAddressesCooldown,
      'ProfileService: failed to update profile: 403: Too soon',
      [
        {
          code: 'RETRY_AFTER',
          message: 'Too soon',
          meta: { retry_after_seconds: 3_600 },
        },
      ],
    );

    expect(getLinkedAccountUpdateError(error)).toBe(windowCopyFallback());
  });

  it('stays quiet for a different code even when the message matches', () => {
    const error = profileApiError(
      'PROFILE_NOT_FOUND',
      'Linked addresses can only be updated once every 30 days',
    );

    expect(getLinkedAccountUpdateError(error)).toBeNull();
  });

  it('stays quiet for a 403 that is not the cooldown', () => {
    expect(
      getLinkedAccountUpdateError(
        httpError(
          403,
          'ProfileService: failed to update profile: 403: Forbidden',
        ),
      ),
    ).toBeNull();
  });

  it('stays quiet for a 403 whose body was dropped', () => {
    expect(
      getLinkedAccountUpdateError(
        httpError(403, 'ProfileService: failed to update profile: 403'),
      ),
    ).toBeNull();
  });

  it('stays quiet when the cooldown message arrives without a 403', () => {
    expect(getLinkedAccountUpdateError(cooldownError(500))).toBeNull();
  });

  it('stays quiet for a dropped connection', () => {
    expect(
      getLinkedAccountUpdateError(new Error('Network request failed')),
    ).toBeNull();
  });

  it('stays quiet for a payload that is not an error object', () => {
    expect(getLinkedAccountUpdateError(undefined)).toBeNull();
    expect(getLinkedAccountUpdateError('403')).toBeNull();
    expect(getLinkedAccountUpdateError(null)).toBeNull();
    expect(
      getLinkedAccountUpdateError({
        httpStatus: 403,
        message: 'Linked addresses can only be updated once every 30 days',
      }),
    ).toBeNull();
  });

  it('stays quiet for statuses other than the cooldown', () => {
    expect(getLinkedAccountUpdateError(cooldownError(400))).toBeNull();
    expect(getLinkedAccountUpdateError(cooldownError(401))).toBeNull();
    expect(getLinkedAccountUpdateError(cooldownError(503))).toBeNull();
  });
});
