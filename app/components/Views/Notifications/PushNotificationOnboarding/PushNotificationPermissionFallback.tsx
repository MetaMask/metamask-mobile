import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { usePushPrePromptVariant } from '../../../../util/notifications/hooks/usePushPrePromptVariant';
import { useEnableNotifications } from '../../../../util/notifications/hooks/useNotifications';
import { selectShouldShowWalletHomeOnboardingSteps } from '../../../../selectors/onboarding';

/**
 * Rendered when the `prePushPromptEnabled` flag is OFF. Suppresses the soft pre-prompt
 * sheets but preserves the normal behavior: an eligible new user is still asked for native
 * OS push permission via the canonical notifications enable path. Renders nothing.
 *
 * `usePushPrePromptVariant` is reused purely for eligibility resolution — the
 * `push_permission` variant means the user is eligible, OS push is not yet enabled, and the
 * OS dialog is still promptable. `markPrePromptShown` is NOT called here, so the soft prompt
 * remains available if the flag is later enabled.
 *
 * Held off while the wallet home onboarding checklist is active, which owns the notifications
 * ask in its own step — same guard as `useEnableNotificationsByDefaultEffect`. Without it this
 * auto-request would ask for OS push behind the checklist and drop its notifications step.
 */
const PushNotificationPermissionFallback = () => {
  const { variant } = usePushPrePromptVariant();
  const { enableNotifications } = useEnableNotifications(); // nudgeEnablePush: true
  const isWalletHomeOnboardingChecklistActive = useSelector(
    selectShouldShowWalletHomeOnboardingSteps,
  );
  const handledRef = useRef(false);

  useEffect(() => {
    // Only push_permission involves an OS prompt; marketing_consent needs none.
    if (
      variant !== 'push_permission' ||
      isWalletHomeOnboardingChecklistActive ||
      handledRef.current
    ) {
      return;
    }
    handledRef.current = true;
    enableNotifications().catch(() => undefined);
  }, [variant, enableNotifications, isWalletHomeOnboardingChecklistActive]);

  return null;
};

export default PushNotificationPermissionFallback;
