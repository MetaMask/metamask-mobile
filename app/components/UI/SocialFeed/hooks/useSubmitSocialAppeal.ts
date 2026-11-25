import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { buildSocialAppealSupportUrl } from '../../../../constants/urls';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Logger from '../../../../util/Logger';
import { getBetaSupportUrl } from '../../../../util/support/betaSupportUrl';
import { useSupportConsent } from '../../../hooks/useSupportConsent';

export interface SocialAppeal {
  /** Where the appeal outcome is emailed. */
  email: string;
  /** Why the user disagrees with the decision. */
  message: string;
  /** Which outcome is being appealed. */
  decision: string;
  /** Handle of the post's author or the profile the decision is about. */
  handle: string;
  /** Why the decision was made. */
  reason: string;
}

interface UseSubmitSocialAppealOptions {
  /** Called once support has opened with the appeal. */
  onSent: () => void;
  /** Called when support could not be opened. */
  onFailed: () => void;
}

/**
 * Hands a social moderation appeal to MetaMask support: the support consent
 * sheet first (unless the viewer saved a preference), then the in-app browser
 * on the help center, the way the Rewards contact-support flows open it. The
 * email, message and decision ride along as URL params.
 *
 * Neither callback fires when the viewer dismisses the consent sheet.
 */
export const useSubmitSocialAppeal = ({
  onSent,
  onFailed,
}: UseSubmitSocialAppealOptions): ((appeal: SocialAppeal) => void) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { openSupportWithConsent } = useSupportConsent();

  return useCallback(
    (appeal: SocialAppeal) => {
      const openWebview = (url: string): void => {
        try {
          navigation.navigate(Routes.WEBVIEW.MAIN, {
            screen: Routes.WEBVIEW.SIMPLE,
            params: {
              url,
              title: strings('app_settings.contact_support'),
            },
          });
        } catch (error) {
          Logger.error(
            error as Error,
            'useSubmitSocialAppeal: failed to open support',
          );
          onFailed();
          // The consent flow logs and swallows this, and skips `onSent`.
          throw error;
        }
      };

      const betaSupportUrl = getBetaSupportUrl();
      if (betaSupportUrl) {
        try {
          openWebview(buildSocialAppealSupportUrl(appeal, betaSupportUrl));
          onSent();
        } catch {
          // `openWebview` already reported the failure.
        }
        return;
      }

      openSupportWithConsent(
        openWebview,
        buildSocialAppealSupportUrl(appeal),
        onSent,
      );
    },
    [navigation, onFailed, onSent, openSupportWithConsent],
  );
};
