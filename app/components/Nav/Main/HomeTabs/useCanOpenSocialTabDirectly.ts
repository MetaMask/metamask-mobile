import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { selectProfileControllerProfile } from '../../../../selectors/profileController';
import { canOpenSocialTabDirectly } from '../../../Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';

/**
 * Whether a Social tab tap would pass every entry gate. The terms acceptance
 * lives in MMKV, so this re-reads it whenever the tabs regain focus, which is
 * where the gate screens return to.
 *
 * @param isSocialV1Enabled - Only Social V1 has gates; re-reads when it turns on.
 */
export const useCanOpenSocialTabDirectly = (
  isSocialV1Enabled: boolean,
): boolean => {
  const navigation = useNavigation();
  const profileId = useSelector(selectProfileControllerProfile)?.profileId;
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
  }, [navigation, profileId, isSocialV1Enabled]);

  return !isSocialV1Enabled || canOpen;
};
