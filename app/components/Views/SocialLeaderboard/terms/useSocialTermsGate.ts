import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import {
  SocialEvent,
  type SocialBlockedHandler,
  type SocialGate,
} from '../analytics/socialEvents';
import { ensureSocialTermsAccepted } from './socialTermsAcceptance';

export interface UseSocialTermsGateOptions {
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

export interface UseSocialTermsGateResult {
  /**
   * @param gate - The gated action the user tapped.
   * @param onAccepted - Runs the blocked action again once the terms-only
   * screen is accepted.
   */
  ensureSocialTermsAccepted: (
    gate: SocialGate,
    onAccepted?: () => void,
  ) => boolean;
}

/**
 * React wrapper around `ensureSocialTermsAccepted`. Reads storage only, so it
 * is safe to mount once per list row.
 */
export const useSocialTermsGate = ({
  runNavigation,
  onBlocked,
}: UseSocialTermsGateOptions = {}): UseSocialTermsGateResult => {
  const navigation = useNavigation<AppNavigationProp>();

  const ensure = useCallback(
    (gate: SocialGate, onAccepted?: () => void): boolean => {
      const isAccepted = ensureSocialTermsAccepted(navigation.navigate, {
        trigger: gate.trigger,
        onAccepted,
        runNavigation,
      });
      if (!isAccepted) {
        onBlocked?.({
          blocked_action: gate.trigger,
          blocked_reason: SocialEvent.BlockedReason.TERMS,
          ...(gate.tradeType ? { trade_type: gate.tradeType } : {}),
        });
      }
      return isAccepted;
    },
    [navigation, onBlocked, runNavigation],
  );

  return { ensureSocialTermsAccepted: ensure };
};

export default useSocialTermsGate;
