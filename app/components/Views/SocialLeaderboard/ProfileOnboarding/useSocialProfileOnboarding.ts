import type { UsernameAvailabilityResponse } from '@metamask/profile-controller';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import { getSessionProfileId } from '../../../../util/notifications/utils/get-session-profile-id';
import { saveLocalSocialProfile } from '../MyProfileView/hooks/localSocialProfileStore';
import {
  buildCreateProfileParams,
  buildOnboardedSocialProfile,
  getUsernameStatus,
  normalizeUsername,
  type ProfileOnboardingDraft,
} from './profileOnboardingDraft';

const USERNAME_CHECK_DEBOUNCE_MS = 300;

export type SocialUsernameStatus =
  | 'empty'
  | 'invalid'
  | 'checking'
  | 'available'
  | 'taken'
  | 'error';

/**
 * Reads `code` and `state` from an X OAuth redirect.
 *
 * @param url - The URL that opened the app.
 * @returns The callback params, or null when this URL is not an X redirect.
 */
export const parseXAuthCallback = (
  url: string,
): { code: string; state: string } | null => {
  try {
    const parsed = new URL(url);
    const code = parsed.searchParams.get('code');
    const state = parsed.searchParams.get('state');
    if (!code || !state) {
      return null;
    }
    return { code, state };
  } catch {
    return null;
  }
};

interface UsernameCheck {
  username: string;
  remote: UsernameAvailabilityResponse | null;
  didFail: boolean;
}

const availabilityStatus = (
  username: string,
  localStatus: ReturnType<typeof getUsernameStatus>,
  isChecking: boolean,
  check: UsernameCheck | null,
): SocialUsernameStatus => {
  if (localStatus === 'empty' || localStatus === 'invalid') {
    return localStatus;
  }
  const normalized = normalizeUsername(username);
  const isCurrent = check?.username === normalized;
  if (isChecking || !isCurrent || !check) {
    return 'checking';
  }
  if (check.didFail || !check.remote) {
    return 'error';
  }
  if (!check.remote.valid) {
    return 'invalid';
  }
  return check.remote.available ? 'available' : 'taken';
};

/**
 * Checks a locally valid username with ProfileController.
 * Empty and illegal handles never hit the API.
 *
 * @param username - The handle currently typed in onboarding.
 * @returns The status used to enable Continue and render the helper text.
 */
export const useSocialUsernameAvailability = (
  username: string,
): SocialUsernameStatus => {
  const localStatus = getUsernameStatus(username);
  const [isChecking, setIsChecking] = useState(false);
  const [check, setCheck] = useState<UsernameCheck | null>(null);

  useEffect(() => {
    if (localStatus !== 'available') {
      setIsChecking(false);
      return undefined;
    }

    const normalized = normalizeUsername(username);
    let cancelled = false;
    setIsChecking(true);
    const timeout = setTimeout(() => {
      void Engine.context.ProfileController.checkUsernameAvailability(
        normalized,
      )
        .then((result) => {
          if (!cancelled) {
            setCheck({ username: normalized, remote: result, didFail: false });
          }
        })
        .catch((error: unknown) => {
          Logger.error(
            error as Error,
            'Failed to check social username availability',
          );
          if (!cancelled) {
            setCheck({ username: normalized, remote: null, didFail: true });
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsChecking(false);
          }
        });
    }, USERNAME_CHECK_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [localStatus, username]);

  return availabilityStatus(username, localStatus, isChecking, check);
};

interface UseConnectSocialXOptions {
  onConnected: () => void;
}

/**
 * Starts the X PKCE flow and finishes it when the redirect returns.
 *
 * `connectX` does not write controller state. A follow-up
 * `fetchAndUpdateXAccount` stores `xProfile` when the API already has one.
 * Linking before the profile exists is allowed; `createProfile` copies
 * `x_profile` onto state in that case.
 *
 * @param options - Called after X is linked so onboarding can leave the intro step.
 * @returns Connect handler plus in-flight and error state.
 */
export const useConnectSocialX = ({
  onConnected,
}: UseConnectSocialXOptions) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingStateRef = useRef<string | null>(null);

  const completeCallback = useCallback(
    async (url: string) => {
      const callback = parseXAuthCallback(url);
      if (!callback) {
        return;
      }
      const pendingState = pendingStateRef.current;
      if (pendingState && callback.state !== pendingState) {
        return;
      }

      setIsConnecting(true);
      setError(null);
      try {
        await Engine.context.ProfileController.connectX(callback);
        try {
          await Engine.context.ProfileController.fetchAndUpdateXAccount();
        } catch (fetchError: unknown) {
          Logger.error(
            fetchError as Error,
            'X account linked before a profile existed',
          );
        }
        pendingStateRef.current = null;
        onConnected();
      } catch (connectError: unknown) {
        Logger.error(connectError as Error, 'Failed to connect X account');
        setError(
          strings('social_leaderboard.profile_onboarding.connect_x_failed'),
        );
      } finally {
        setIsConnecting(false);
      }
    },
    [onConnected],
  );

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      void completeCallback(url);
    });
    return () => subscription.remove();
  }, [completeCallback]);

  const connect = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    try {
      const { url, state } = await Engine.context.ProfileService.getXAuthUrl();
      pendingStateRef.current = state;
      await Linking.openURL(url);
    } catch (connectError: unknown) {
      Logger.error(connectError as Error, 'Failed to start X authentication');
      pendingStateRef.current = null;
      setError(
        strings('social_leaderboard.profile_onboarding.connect_x_failed'),
      );
    } finally {
      setIsConnecting(false);
    }
  }, []);

  return { connect, isConnecting, error };
};

interface UseCreateSocialProfileOptions {
  draft: ProfileOnboardingDraft;
  onCreated: () => void;
}

/**
 * Creates the profile from the onboarding draft.
 *
 * The session id is the client-supplied `profile_id`. After the API write,
 * the local store keeps fields the profile API does not have (avatar preset,
 * share URL, trader stats placeholders) so the current profile screen can
 * render them.
 *
 * @param options - Draft and the navigation to run after a successful create.
 * @returns Finish handler plus in-flight and error state.
 */
export const useCreateSocialProfile = ({
  draft,
  onCreated,
}: UseCreateSocialProfileOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = useCallback(async () => {
    if (isSubmitting) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const profileId = await getSessionProfileId();
      if (!profileId) {
        setError(
          strings('social_leaderboard.profile_onboarding.sign_in_required'),
        );
        return;
      }
      await Engine.context.ProfileController.createProfile(
        buildCreateProfileParams(draft, profileId),
      );
      saveLocalSocialProfile(buildOnboardedSocialProfile(draft, profileId));
      onCreated();
    } catch (createError: unknown) {
      Logger.error(createError as Error, 'Failed to create social profile');
      setError(
        strings('social_leaderboard.profile_onboarding.create_profile_failed'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [draft, isSubmitting, onCreated]);

  return { finish, isSubmitting, error };
};
