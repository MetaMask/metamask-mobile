import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { selectCardIntercomSupportEnabled } from '../../../../../../selectors/featureFlagController/card';
import { appendCardSupportParams } from '../../../../../../util/support';
import { getBetaSupportUrl } from '../../../../../../util/support/betaSupportUrl';
import { useSupportConsent } from '../../../../../hooks/useSupportConsent';

export const useCardIntercomSupport = (): (() => void) | undefined => {
  const isIntercomSupportEnabled = useSelector(
    selectCardIntercomSupportEnabled,
  );
  const navigation = useNavigation<AppNavigationProp>();
  const { openSupportWithConsent } = useSupportConsent();

  const openIntercomSupport = useCallback(() => {
    const openWebview = (url: string) =>
      navigation.navigate(Routes.WEBVIEW.MAIN, {
        screen: Routes.WEBVIEW.SIMPLE,
        params: {
          url,
          title: strings('card.card_home.contact_support'),
        },
      });

    const betaSupportUrl = getBetaSupportUrl();

    if (betaSupportUrl) {
      openWebview(appendCardSupportParams(betaSupportUrl));
      return;
    }

    openSupportWithConsent(openWebview);
  }, [navigation, openSupportWithConsent]);

  return isIntercomSupportEnabled ? openIntercomSupport : undefined;
};

export default useCardIntercomSupport;
