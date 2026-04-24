import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectFollowingProfileIds } from '../../../../selectors/socialController';
import type { TopTradersNotificationsSetupBottomSheetRef } from '../TraderProfileView/components/TopTradersNotificationsSetupBottomSheet';
import type { SocialAIPreference } from '../NotificationPreferencesView/hooks';

export interface UseFirstFollowSetupPromptArgs {
  sheetRef: React.RefObject<TopTradersNotificationsSetupBottomSheetRef>;
  preferences: SocialAIPreference;
  isLoadingPreferences: boolean;
}

/**
 * Opens the notifications setup bottom sheet exactly when the user follows
 * their very first trader (followingProfileIds transitions from 0 to 1) and
 * the global top-traders notification hasn't been enabled yet.
 *
 * Uses Redux state so it only reacts to committed (not optimistic) follows,
 * meaning a follow that is rolled back won't flash the sheet.
 */
export const useFirstFollowSetupPrompt = ({
  sheetRef,
  preferences,
  isLoadingPreferences,
}: UseFirstFollowSetupPromptArgs): void => {
  const followingProfileIds = useSelector(selectFollowingProfileIds);

  // Initialize to the current count so a user who is already following
  // traders on first mount does not trigger the prompt.
  const prevCountRef = useRef(followingProfileIds.length);

  useEffect(() => {
    const prev = prevCountRef.current;
    const next = followingProfileIds.length;
    prevCountRef.current = next;

    // Wait for preferences to load to avoid opening the sheet for users
    // who already have notifications enabled (their enabled flag starts
    // as false before the remote fetch resolves).
    if (isLoadingPreferences) return;

    // Don't nag users who have already completed setup.
    if (preferences.enabled) return;

    if (prev === 0 && next === 1) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [
    followingProfileIds.length,
    isLoadingPreferences,
    preferences.enabled,
    sheetRef,
  ]);
};
