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

/**
 * Opens the card "Contact support" entry as an Intercom conversation in the
 * in-app WebView, carrying the provider identity so our agents own the first
 * contact and can escalate to the card provider without interrogating the user.
 *
 * Returns `undefined` while the `cardIntercomSupport` flag is off, which is the
 * signal for the caller to keep the legacy `mailto:` routing. That keeps the
 * flag a pure routing switch, with no release needed to go back.
 */
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

    // The consent sheet decides whether device details (app version, customer
    // service token) are appended; the provider params are part of the base URL
    // either way, since support cannot route a card request without them.
    openSupportWithConsent(
      openWebview,
      buildCardSupportUrl({ providerUserId, providerName }),
    );
  }, [navigation, openSupportWithConsent, providerName, providerUserId]);

  return isIntercomSupportEnabled ? openIntercomSupport : undefined;
};

export default useCardIntercomSupport;
