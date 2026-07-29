import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import { selectCanSignTransactions } from '../../../../../../selectors/accountsController';
import { selectPerpsEnabledFlag } from '../../../../../UI/Perps';
import { selectIsFirstTimePerpsUser } from '../../../../../UI/Perps/selectors/perpsController';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import {
  ActionButtonType,
  ActionLocation,
  trackActionButtonClick,
} from '../../../../../../util/analytics/actionButtonTracking';
import HomepageActionButton from '../HomepageActionButton';
import { HomepageActionButtonsGridTestIds } from '../HomepageActionButtonsGrid.testIds';
import type { HomepageActionButtonSlotProps } from '../types';

const PerpsButton = ({
  actionPosition,
  allowTwoLineLabel,
}: HomepageActionButtonSlotProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isFirstTimePerpsUser = useSelector(selectIsFirstTimePerpsUser);
  const canSignTransactions = useSelector(selectCanSignTransactions);
  const label = strings('homepage.action_buttons.perps');
  const isDisabled = !isPerpsEnabled || !canSignTransactions;

  const handlePress = useCallback(() => {
    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.PERPS,
      action_position: actionPosition,
      button_label: label,
      location: ActionLocation.HOME,
    });

    if (isFirstTimePerpsUser) {
      navigation.navigate(Routes.PERPS.TUTORIAL);
      return;
    }

    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
      params: {},
    });
  }, [
    actionPosition,
    createEventBuilder,
    isFirstTimePerpsUser,
    label,
    navigation,
    trackEvent,
  ]);

  return (
    <HomepageActionButton
      allowTwoLineLabel={allowTwoLineLabel}
      iconName={IconName.Candlestick}
      isDisabled={isDisabled}
      label={label}
      onPress={handlePress}
      testID={HomepageActionButtonsGridTestIds.PERPS_BUTTON}
    />
  );
};

export default PerpsButton;
