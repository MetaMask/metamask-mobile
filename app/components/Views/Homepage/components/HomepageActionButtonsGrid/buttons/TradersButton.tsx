import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { selectSocialLeaderboardEnabled } from '../../../../../../selectors/featureFlagController/socialLeaderboard';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { navigateToSocialLeaderboard } from '../../../../SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';
import {
  ActionButtonType,
  ActionLocation,
  trackActionButtonClick,
} from '../../../../../../util/analytics/actionButtonTracking';
import HomepageActionButton from '../HomepageActionButton';
import { HomepageActionButtonsGridTestIds } from '../HomepageActionButtonsGrid.testIds';
import type { HomepageActionButtonSlotProps } from '../types';

const TradersButton = ({ actionPosition }: HomepageActionButtonSlotProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const isSocialLeaderboardEnabled = useSelector(
    selectSocialLeaderboardEnabled,
  );
  const label = strings('homepage.action_buttons.traders');

  const handlePress = useCallback(() => {
    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.TRADERS,
      action_position: actionPosition,
      button_label: label,
      location: ActionLocation.HOME,
    });

    navigateToSocialLeaderboard(navigation.navigate, {
      source: 'home_carousel',
    });
  }, [actionPosition, createEventBuilder, label, navigation, trackEvent]);

  return (
    <HomepageActionButton
      iconName={IconName.User}
      isDisabled={!isSocialLeaderboardEnabled}
      label={label}
      onPress={handlePress}
      testID={HomepageActionButtonsGridTestIds.TRADERS_BUTTON}
    />
  );
};

export default TradersButton;
