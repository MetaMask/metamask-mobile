import React, { useCallback, useState } from 'react';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './SocialLeaderboardDeveloperOptionsSection.styles';
import { SocialLeaderboardDeveloperOptionsSectionSelectorsIDs } from './SocialLeaderboardDeveloperOptionsSection.testIds';
import {
  hasSeenSocialLeaderboardOnboarding,
  resetSocialLeaderboardOnboardingSeen,
} from '../../Onboarding/socialLeaderboardOnboardingNavigation';

export default function SocialLeaderboardDeveloperOptionsSection() {
  const { styles } = useStyles(styleSheet, {});
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(
    hasSeenSocialLeaderboardOnboarding,
  );

  const handleResetOnboarding = useCallback(async () => {
    await resetSocialLeaderboardOnboardingSeen();
    setHasSeenOnboarding(hasSeenSocialLeaderboardOnboarding());
  }, []);

  return (
    <Box
      testID={SocialLeaderboardDeveloperOptionsSectionSelectorsIDs.CONTAINER}
    >
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingLg}
        style={styles.heading}
      >
        {strings('app_settings.developer_options.social_leaderboard.title')}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {strings(
          'app_settings.developer_options.social_leaderboard.description',
        )}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {strings(
          'app_settings.developer_options.social_leaderboard.onboarding_seen',
          { seen: String(hasSeenOnboarding) },
        )}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleResetOnboarding}
        isFullWidth
        style={styles.accessory}
        testID={
          SocialLeaderboardDeveloperOptionsSectionSelectorsIDs.RESET_ONBOARDING_BUTTON
        }
      >
        {strings(
          'app_settings.developer_options.social_leaderboard.reset_onboarding',
        )}
      </Button>
    </Box>
  );
}
