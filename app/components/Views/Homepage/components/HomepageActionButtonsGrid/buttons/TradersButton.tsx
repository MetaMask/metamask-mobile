import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { selectSocialLeaderboardEnabled } from '../../../../../../selectors/featureFlagController/socialLeaderboard';
import { selectAiSocialBundleV1Enabled } from '../../../../../../selectors/featureFlagController/socialBundleV1';
import Routes from '../../../../../../constants/navigation/Routes';
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

const TradersButton = ({
  actionPosition,
  allowTwoLineLabel,
}: HomepageActionButtonSlotProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const isSocialLeaderboardEnabled = useSelector(
    selectSocialLeaderboardEnabled,
  );
  const isSocialBundleV1Enabled = useSelector(selectAiSocialBundleV1Enabled);
  const label = strings('homepage.action_buttons.traders');

  const handlePress = useCallback(() => {
    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.TRADERS,
      action_position: actionPosition,
      button_label: label,
      location: ActionLocation.HOME,
    });

    // Social Bundle V1 prototype takes precedence when its FF is on (TSA-1121).
    // See `app/components/Views/SocialBundleV1/` — a fully isolated tree that
    // ships behind `aiSocialBundleV1Enabled` for Product + Design validation.
    if (isSocialBundleV1Enabled) {
      navigation.navigate(Routes.SOCIAL_BUNDLE_V1.HOME, undefined);
      return;
    }

    navigateToSocialLeaderboard(navigation.navigate, {
      source: 'home_carousel',
    });
  }, [
    actionPosition,
    createEventBuilder,
    isSocialBundleV1Enabled,
    label,
    navigation,
    trackEvent,
  ]);

  return (
    <HomepageActionButton
      allowTwoLineLabel={allowTwoLineLabel}
      iconName={IconName.People}
      isDisabled={!(isSocialLeaderboardEnabled || isSocialBundleV1Enabled)}
      label={label}
      onPress={handlePress}
      testID={HomepageActionButtonsGridTestIds.TRADERS_BUTTON}
    />
  );
};

export default TradersButton;
