import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { selectAiSocialLeaderboardOnboardingEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { canOpenSocialTabDirectly } from '../../../Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';

/**
 * Whether a Social tab tap would open the tab rather than the first-time
 * onboarding. The onboarding flag lives in MMKV, so this re-reads it whenever
 * the tabs regain focus, which is where the onboarding screen returns to.
 *
 * @param isSocialV1Enabled - Only Social V1 has the gate; re-reads when it turns on.
 */
export const useCanOpenSocialTabDirectly = (
  isSocialV1Enabled: boolean,
): boolean => {
  const navigation = useNavigation();
  const isOnboardingEnabled = useSelector(
    selectAiSocialLeaderboardOnboardingEnabled,
  );
  // Starts closed so a late Social V1 assignment can only cost a bounce.
  const [canOpen, setCanOpen] = useState(
    () => isSocialV1Enabled && canOpenSocialTabDirectly(),
  );

  useEffect(() => {
    if (!isSocialV1Enabled) {
      return;
    }
    const refresh = () => setCanOpen(canOpenSocialTabDirectly());
    refresh();
    return navigation.addListener('focus', refresh);
  }, [navigation, isOnboardingEnabled, isSocialV1Enabled]);

  return !isSocialV1Enabled || canOpen;
};
