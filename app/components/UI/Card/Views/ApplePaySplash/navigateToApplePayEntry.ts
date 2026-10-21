import Routes from '../../../../../constants/navigation/Routes';
import type { ApplePayHomePromptMode } from './resolveApplePayHomePrompt';

interface ApplePayNavigation {
  goBack: () => void;
  navigate: (route: string, params?: object) => void;
}

/**
 * Opens Card so the user can add the card to Apple Wallet.
 * A valid session goes to Card Home, which opens PassKit.
 * Otherwise it opens Card sign-in. After sign-in the user lands on Card Home
 * and starts provisioning from the Add to Apple Wallet button there.
 */
export function navigateToApplePayEntry(
  navigation: ApplePayNavigation,
  mode: Exclude<ApplePayHomePromptMode, 'none'>,
  options?: { dismissCurrentScreen?: boolean },
): void {
  if (options?.dismissCurrentScreen) {
    navigation.goBack();
  }

  if (mode === 'provision') {
    navigation.navigate(Routes.CARD.ROOT, {
      screen: Routes.CARD.HOME,
      params: {
        screen: Routes.CARD.HOME,
        params: { startProvisioning: true },
      },
    });
    return;
  }

  navigation.navigate(Routes.CARD.ROOT, {
    screen: Routes.CARD.HOME,
    params: {
      screen: Routes.CARD.AUTHENTICATION,
      params: { autoSignIn: true },
    },
  });
}
