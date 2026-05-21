import { useSelector } from 'react-redux';
import { selectIsUnlocked } from '../../../selectors/keyringController';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import { selectIsSignedIn } from '../../../selectors/identity';
import { isNotificationsFeatureEnabled } from '../constants';

/**
 * Returns true when the four universal preconditions for any AUS notification
 * call are met: wallet unlocked, user signed in to MetaMask identity services,
 * basic functionality enabled, and the notifications feature flag on.
 *
 * This gate does NOT include prompt-specific conditions such as
 * `completedOnboarding` or the default-on feature flag — those belong at the
 * call site that needs them.
 */
export const useNotificationsRuntimeGate = (): boolean => {
  const isUnlocked = Boolean(useSelector(selectIsUnlocked));
  const isSignedIn = useSelector(selectIsSignedIn);
  const isBasicFunctionalityEnabled = Boolean(
    useSelector(selectBasicFunctionalityEnabled),
  );
  const notificationsFlagEnabled = isNotificationsFeatureEnabled();
  return (
    isUnlocked &&
    isSignedIn &&
    isBasicFunctionalityEnabled &&
    notificationsFlagEnabled
  );
};
