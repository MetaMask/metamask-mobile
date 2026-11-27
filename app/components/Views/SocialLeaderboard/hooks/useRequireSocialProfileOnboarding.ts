import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { selectProfileControllerLinkedEvmAddress } from '../../../../selectors/profileController';
import {
  SocialEvent,
  type SocialBlockedHandler,
  type SocialGate,
} from '../analytics/socialEvents';
import { setPendingOnboardingTrigger } from '../ProfileOnboarding/pendingOnboardingTrigger';
import { isSocialProfileOnboardingRequired } from '../navigation/resolveSocialPostComposerWallet';

export interface UseRequireSocialProfileOnboardingOptions {
  /**
   * Runs the onboarding navigation. A bottom sheet passes one that closes the
   * sheet first, so onboarding opens full screen instead of inside the sheet.
   * Defaults to navigating immediately.
   */
  runNavigation?: (navigate: () => void) => void;
  /**
   * Reports `action_blocked` when the gate redirects a tap. Build it with
   * `useTrackSocialActionBlocked` for the surface that owns the tap. Omit it
   * on a surface that has no Social analytics.
   */
  onBlocked?: SocialBlockedHandler;
}

export interface UseRequireSocialProfileOnboardingResult {
  /**
   * @param gate - The gated action the user tapped. Passed to onboarding so
   * analytics knows what opened it.
   * @returns `true` when the caller may continue.
   */
  ensureSocialProfileOnboarding: (gate: SocialGate) => boolean;
}

/**
 * Redirects users without an onboarding-linked wallet to social profile
 * onboarding before they can perform a profile-gated action.
 *
 * Reads the linked wallet from ProfileController state and never fetches, so
 * it is safe to mount once per list row.
 */
export const useRequireSocialProfileOnboarding = ({
  runNavigation,
  onBlocked,
}: UseRequireSocialProfileOnboardingOptions = {}): UseRequireSocialProfileOnboardingResult => {
  const navigation = useNavigation<AppNavigationProp>();
  const linkedAccountAddress = useSelector(
    selectProfileControllerLinkedEvmAddress,
  );

  const ensureSocialProfileOnboarding = useCallback(
    (gate: SocialGate) => {
      if (!isSocialProfileOnboardingRequired(linkedAccountAddress)) {
        return true;
      }

      // Before navigating, so it always precedes the onboarding screen view.
      onBlocked?.({
        blocked_action: gate.trigger,
        blocked_reason: SocialEvent.BlockedReason.PROFILE_ONBOARDING,
        ...(gate.tradeType ? { trade_type: gate.tradeType } : {}),
      });
      const navigate = (): void => {
        setPendingOnboardingTrigger(gate.trigger);
        navigation.navigate(Routes.SOCIAL.PROFILE_ONBOARDING);
      };
      if (runNavigation) {
        runNavigation(navigate);
      } else {
        navigate();
      }
      return false;
    },
    [linkedAccountAddress, navigation, onBlocked, runNavigation],
  );

  return { ensureSocialProfileOnboarding };
};

export default useRequireSocialProfileOnboarding;
