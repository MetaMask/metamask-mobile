import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';

export type CardOnboardingHeaderMode =
  | 'back'
  | 'close-with-confirmation'
  | 'close-direct'
  | 'none';

export const useCardOnboardingNavigationHandlers = (
  headerMode: CardOnboardingHeaderMode = 'none',
) => {
  const navigation = useNavigation();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCloseDirect = useCallback(() => {
    navigation.navigate(Routes.WALLET.HOME);
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

  switch (headerMode) {
    case 'back':
      return { onBack: handleBack };
    case 'close-with-confirmation':
      return {
        onClose: handleCloseWithConfirmation,
        closeButtonProps: { testID: 'exit-onboarding-button' },
      };
    case 'close-direct':
      return {
        onClose: handleCloseDirect,
        closeButtonProps: { testID: 'exit-onboarding-button' },
      };
    default:
      return {};
  }
};
