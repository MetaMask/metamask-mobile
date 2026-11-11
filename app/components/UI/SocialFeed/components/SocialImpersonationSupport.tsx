import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../locales/i18n';
import { useOpenSocialSupport } from '../hooks/useOpenSocialSupport';
import { SocialEntryOptionsBottomSheetSelectorsIDs } from './SocialEntryOptionsBottomSheet.testIds';

/**
 * Shown instead of a social-API report when the chosen reason is
 * impersonation. Customer support collects an email and follows up.
 */
const SocialImpersonationSupport: React.FC = () => {
  const openSocialSupport = useOpenSocialSupport();

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
        onPress={openSocialSupport}
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
