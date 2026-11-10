import {
  ProfileApiErrorCode,
  ProfileServiceError,
} from '@metamask/profile-controller';
import { strings } from '../../../../../../locales/i18n';
import { getLinkedAccountUpdateError } from './linkedAccountUpdateError';

const cooldown = (days = 30) =>
  strings('social_leaderboard.manage_profile.linked_account_cooldown', {
    days,
  });

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
    expect(getLinkedAccountUpdateError(cooldownError())).toBe(cooldown());
  });

  it('reads the window length from the server instead of assuming 30 days', () => {
    expect(getLinkedAccountUpdateError(cooldownError(403, 7))).toBe(
      cooldown(7),
    );
  });

  it('matches the message case-insensitively', () => {
    expect(
      getLinkedAccountUpdateError(
        httpError(
          403,
          'ProfileService: failed to update profile: 403: LINKED ADDRESSES CAN ONLY BE UPDATED ONCE EVERY 30 DAYS',
        ),
      ),
    ).toBe(cooldown());
  });

  it('explains the cooldown from the stable code', () => {
    const error = profileApiError(
      ProfileApiErrorCode.ProfileLinkedAddressesCooldown,
      'ProfileService: failed to update profile: 403: Linked addresses can only be updated once every 23 days',
    );

    expect(getLinkedAccountUpdateError(error)).toBe(cooldown(23));
  });

  it('reads the window from the retry detail when the message has no day count', () => {
    const error = profileApiError(
      ProfileApiErrorCode.ProfileLinkedAddressesCooldown,
      'ProfileService: failed to update profile: 403: Too soon',
      [
        {
          code: 'RETRY_AFTER',
          message: 'Too soon',
          meta: { retry_after_seconds: 7 * 86_400 },
        },
      ],
    );

    expect(getLinkedAccountUpdateError(error)).toBe(cooldown(7));
  });

  it('stays quiet for a different code even when the message matches', () => {
    const error = profileApiError(
      'PROFILE_NOT_FOUND',
      'Linked addresses can only be updated once every 30 days',
    );

    expect(getLinkedAccountUpdateError(error)).toBeNull();
  });

  it('stays quiet when the cooldown code has no day count or retry detail', () => {
    const error = profileApiError(
      ProfileApiErrorCode.ProfileLinkedAddressesCooldown,
      'ProfileService: failed to update profile: 403: Too soon',
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
