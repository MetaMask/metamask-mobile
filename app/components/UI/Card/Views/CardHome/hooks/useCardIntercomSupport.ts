import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import { buildCardSupportUrl } from '../../../../../../constants/urls';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import {
  selectCardActiveProviderId,
  selectCardProviderUserId,
} from '../../../../../../selectors/cardController';
import { selectCardIntercomSupportEnabled } from '../../../../../../selectors/featureFlagController/card';
import { getBetaSupportUrl } from '../../../../../../util/support/betaSupportUrl';
import { useSupportConsent } from '../../../../../hooks/useSupportConsent';

export const useCardIntercomSupport = (): (() => void) | undefined => {
  const isIntercomSupportEnabled = useSelector(
    selectCardIntercomSupportEnabled,
  );
  const providerUserId = useSelector(selectCardProviderUserId);
  const providerName = useSelector(selectCardActiveProviderId);
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
      openWebview(
        buildCardSupportUrl({ providerUserId, providerName }, betaSupportUrl),
      );
      return;
    }

    openSupportWithConsent(
      openWebview,
      buildCardSupportUrl({ providerUserId, providerName }),
    );
  }, [navigation, openSupportWithConsent, providerName, providerUserId]);

  return isIntercomSupportEnabled ? openIntercomSupport : undefined;
};

export default useCardIntercomSupport;
