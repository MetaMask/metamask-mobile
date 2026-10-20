import Routes from '../../../../../constants/navigation/Routes';
import type { ApplePayHomePromptMode } from './resolveApplePayHomePrompt';

interface ApplePayNavigation {
  goBack: () => void;
  navigate: (route: string, params?: object) => void;
}

/**
 * Opens Card so provisioning can start.
 * A valid session goes to Card Home, which opens PassKit.
 * Otherwise it opens Card sign-in and signs the wallet in automatically.
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
      params: { autoSignIn: true, startProvisioning: true },
    },
  });
}
