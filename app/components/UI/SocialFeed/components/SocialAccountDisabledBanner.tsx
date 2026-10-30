import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { METAMASK_SUPPORT_URL } from '../../../../constants/urls';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { getBetaSupportUrl } from '../../../../util/support/betaSupportUrl';
import { useSupportConsent } from '../../../hooks/useSupportConsent';
import { useSocialModerationStatus } from '../hooks/useSocialModerationStatus';
import { SocialAccountDisabledBannerSelectorsIDs } from './SocialAccountDisabledBanner.testIds';

export const SOCIAL_SUPPORT_EMAIL = 'support@metamask.io';

interface SocialAccountDisabledBannerProps {
  /** Classes for the wrapper, which only renders while the viewer is banned. */
  twClassName?: string;
}

/**
 * Tells a viewer the moderation team banned them, with the reason when one was
 * given, and how to reach support. Renders nothing otherwise.
 */
const SocialAccountDisabledBanner: React.FC<
  SocialAccountDisabledBannerProps
> = ({ twClassName }) => {
  const { isBanned, reason } = useSocialModerationStatus();
  const navigation = useNavigation<AppNavigationProp>();
  const { openSupportWithConsent } = useSupportConsent();

  const handleContactSupport = useCallback(() => {
    const openWebview = (url: string) =>
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

  if (!isBanned) {
    return null;
  }

  return (
    <Box twClassName={twClassName}>
      <BannerAlert
        severity={BannerAlertSeverity.Danger}
        title={strings('social_leaderboard.account_disabled.title')}
        description={
          reason
            ? strings('social_leaderboard.account_disabled.reason', { reason })
            : undefined
        }
        descriptionProps={{
          testID: SocialAccountDisabledBannerSelectorsIDs.REASON,
        }}
        actionButtonLabel={strings(
          'social_leaderboard.account_disabled.contact_support',
        )}
        actionButtonOnPress={handleContactSupport}
        testID={SocialAccountDisabledBannerSelectorsIDs.BANNER}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
          {strings(
            'social_leaderboard.account_disabled.contact_support_description',
            { email: SOCIAL_SUPPORT_EMAIL },
          )}
        </Text>
      </BannerAlert>
    </Box>
  );
};

export default SocialAccountDisabledBanner;
