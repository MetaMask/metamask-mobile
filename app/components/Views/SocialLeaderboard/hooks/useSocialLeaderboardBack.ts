import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';

/**
 * Centralizes back navigation for the follow-trading (SocialLeaderboard) flow so
 * the app never exits from one of these screens.
 *
 * SocialLeaderboard screens are registered directly on the root native stack.
 * On a cold-start notification/deeplink (e.g. handleSocialTraderPositionUrl ->
 * SOCIAL_LEADERBOARD.POSITION) the feature screen can be the stack root with
 * nothing beneath it. In that state a plain `goBack()` is a no-op for the header
 * back button, and on Android the hardware back event falls through to the OS,
 * which closes the app.
 *
 * `handleBack` resolves to the previous screen when one exists, otherwise to
 * Wallet Home. A focus-scoped `hardwareBackPress` listener runs the same logic
 * and returns `true` to consume the event so Android never exits the app. The
 * listener is registered via `useFocusEffect` so only the focused screen owns
 * hardware back — nested modals/bottom sheets presented on top keep handling
 * their own back (mirrors the ActivityView cold-start-push precedent).
 */
export const useSocialLeaderboardBack = (): (() => void) => {
  const navigation = useNavigation<AppNavigationProp>();

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(Routes.HOME_TABS);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          handleBack();
          return true;
        },
      );

      return () => subscription.remove();
    }, [handleBack]),
  );

  return handleBack;
};

export default useSocialLeaderboardBack;
