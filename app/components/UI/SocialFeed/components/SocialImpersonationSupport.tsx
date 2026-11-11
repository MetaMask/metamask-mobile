import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback } from 'react';
import { strings } from '../../../../../locales/i18n';
import { useOpenSocialSupport } from '../hooks/useOpenSocialSupport';
import { SocialEntryOptionsBottomSheetSelectorsIDs } from './SocialEntryOptionsBottomSheet.testIds';

export interface SocialImpersonationSupportProps {
  /**
   * Closes the hosting sheet first. Post options sit in a modal or
   * full-window overlay, which would cover the support screen otherwise.
   */
  onDismiss: () => void;
}

/**
 * Shown instead of a social-API report when the chosen reason is
 * impersonation. Customer support collects an email and follows up.
 */
const SocialImpersonationSupport: React.FC<SocialImpersonationSupportProps> = ({
  onDismiss,
}) => {
  const openSocialSupport = useOpenSocialSupport();
  const handleContactSupport = useCallback(() => {
    onDismiss();
    openSocialSupport();
  }, [onDismiss, openSocialSupport]);

  return (
    <Box twClassName="px-4 pb-10" gap={4}>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextDefault}
        testID={
          SocialEntryOptionsBottomSheetSelectorsIDs.IMPERSONATION_SUPPORT_DESCRIPTION
        }
      >
        {strings(
          'social_leaderboard.entry_options.impersonation_support_description',
        )}
      </Text>
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={handleContactSupport}
        testID={
          SocialEntryOptionsBottomSheetSelectorsIDs.IMPERSONATION_SUPPORT_CONTACT
        }
      >
        {strings('social_leaderboard.account_disabled.contact_support')}
      </Button>
    </Box>
  );
};

export default SocialImpersonationSupport;
