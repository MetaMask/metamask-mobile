import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { METAMASK_SUPPORT_URL } from '../../../../constants/urls';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { getBetaSupportUrl } from '../../../../util/support/betaSupportUrl';
import { useSupportConsent } from '../../../hooks/useSupportConsent';

/**
 * Opens MetaMask customer support in the in-app browser, after the support
 * consent sheet unless the viewer already saved a preference.
 */
export const useOpenSocialSupport = (): (() => void) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { openSupportWithConsent } = useSupportConsent();

  return useCallback(() => {
    const openWebview = (url: string): void =>
      navigation.navigate(Routes.WEBVIEW.MAIN, {
        screen: Routes.WEBVIEW.SIMPLE,
        params: {
          url,
          title: strings('app_settings.contact_support'),
        },
      });

    const betaSupportUrl = getBetaSupportUrl();
    if (betaSupportUrl) {
      openWebview(betaSupportUrl);
      return;
    }
    openSupportWithConsent(openWebview, METAMASK_SUPPORT_URL);
  }, [navigation, openSupportWithConsent]);
};
