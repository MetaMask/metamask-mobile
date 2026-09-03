import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectPushNotificationOsPromptRequested } from '../../../selectors/onboarding';
import {
  walletHomeOnboardingVisibleSteps,
  type WalletHomeOnboardingVisibleStep,
} from './walletHomeOnboardingStepsModel';

export interface WalletHomeOnboardingVisibleStepsResult {
  /** Ordered steps to show; `notifications` is omitted when the OS push request already happened. */
  steps: WalletHomeOnboardingVisibleStep[];
  includeNotificationsStep: boolean;
}

/**
 * Resolves the checklist steps for the current user.
 *
 * The notifications step only belongs in the checklist for users who have not been taken to
 * the OS push permission request — everyone else already answered that question (from the
 * push pre-prompt or another enable path) and must not be nudged twice.
 *
 * @see https://consensyssoftware.atlassian.net/browse/TMCU-924
 */
export function useWalletHomeOnboardingVisibleSteps(): WalletHomeOnboardingVisibleStepsResult {
  const pushNotificationOsPromptRequested = useSelector(
    selectPushNotificationOsPromptRequested,
  );
  const includeNotificationsStep = !pushNotificationOsPromptRequested;

  const steps = useMemo(
    () => walletHomeOnboardingVisibleSteps({ includeNotificationsStep }),
    [includeNotificationsStep],
  );

  return { includeNotificationsStep, steps };
}
