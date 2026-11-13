import React from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useOpenSocialSupport } from '../hooks/useOpenSocialSupport';
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
  const handleContactSupport = useOpenSocialSupport();

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
        <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
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
