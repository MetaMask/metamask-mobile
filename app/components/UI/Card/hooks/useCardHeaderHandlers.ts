import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';

/**
 * Header modes shared across Card onboarding and main routes.
 *
 * `back` — back arrow that calls `navigation.goBack()`. Used for any screen
 * the user can step back from.
 *
 * `close-with-confirmation` — close (X) icon that shows a "leave onboarding?"
 * alert before navigating to `WALLET.HOME`. Used in the onboarding flow after
 * email entry.
 *
 * `close-direct` — close (X) icon that navigates straight to `WALLET.HOME`.
 * Used on KYC status screens.
 *
 * `close-reset-home` — close (X) icon that resets the navigator to
 * `CARD.HOME`. Used by SpendingLimit's onboarding flow where the user must
 * exit the linear flow without the ability to swipe back.
 *
 * `none` — no header chrome (caller renders something else, or the screen
 * intentionally has no header).
 *
 * Returns props that spread directly into `<HeaderStandard {...handlers} />`.
 */
export type CardHeaderMode =
  | 'back'
  | 'close-with-confirmation'
  | 'close-direct'
  | 'close-reset-home'
  | 'none';

export const useCardHeaderHandlers = (mode: CardHeaderMode = 'none') => {
  const navigation = useNavigation();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCloseDirect = useCallback(() => {
    navigation.navigate(Routes.WALLET.HOME);
  }, [navigation]);

  const handleCloseResetHome = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: Routes.CARD.HOME }],
    });
  }, [navigation]);

  const handleCloseWithConfirmation = useCallback(() => {
    Alert.alert(
      strings('card.card_onboarding.exit_confirmation.title'),
      strings('card.card_onboarding.exit_confirmation.message'),
      [
        {
          text: strings('card.card_onboarding.exit_confirmation.cancel_button'),
          style: 'cancel',
        },
        {
          text: strings('card.card_onboarding.exit_confirmation.exit_button'),
          onPress: () => navigation.navigate(Routes.WALLET.HOME),
          style: 'destructive',
        },
      ],
    );
  }, [navigation]);

  switch (mode) {
    case 'back':
      return { onBack: handleBack };
    case 'close-with-confirmation':
      return {
        onClose: handleCloseWithConfirmation,
        closeButtonProps: { testID: 'card-header-close-button' },
      };
    case 'close-direct':
      return {
        onClose: handleCloseDirect,
        closeButtonProps: { testID: 'card-header-close-button' },
      };
    case 'close-reset-home':
      return {
        onClose: handleCloseResetHome,
        closeButtonProps: { testID: 'card-header-close-button' },
      };
    default:
      return {};
  }
};
