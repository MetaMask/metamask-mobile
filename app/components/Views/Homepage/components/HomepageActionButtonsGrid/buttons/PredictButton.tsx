import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import { selectCanSignTransactions } from '../../../../../../selectors/accountsController';
import { selectPredictEnabledFlag } from '../../../../../UI/Predict/selectors/featureFlags';
import { PredictEventValues } from '../../../../../UI/Predict/constants/eventNames';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import {
  ActionButtonType,
  ActionLocation,
  trackActionButtonClick,
} from '../../../../../../util/analytics/actionButtonTracking';
import HomepageActionButton from '../HomepageActionButton';
import { HomepageActionButtonsGridTestIds } from '../HomepageActionButtonsGrid.testIds';
import type { HomepageActionButtonSlotProps } from '../types';

const PredictButton = ({
  actionPosition,
  allowTwoLineLabel,
}: HomepageActionButtonSlotProps) => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const canSignTransactions = useSelector(selectCanSignTransactions);
  const label = strings('homepage.action_buttons.predict');
  const isDisabled = !isPredictEnabled || !canSignTransactions;

  const handlePress = useCallback(() => {
    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.PREDICT,
      action_position: actionPosition,
      button_label: label,
      location: ActionLocation.HOME,
    });

    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.HOMESCREEN_PILL,
      },
    });
  }, [actionPosition, createEventBuilder, label, navigation, trackEvent]);

  return (
    <HomepageActionButton
      allowTwoLineLabel={allowTwoLineLabel}
      iconName={IconName.Sparkle}
      isDisabled={isDisabled}
      label={label}
      onPress={handlePress}
      testID={HomepageActionButtonsGridTestIds.PREDICT_BUTTON}
    />
  );
};

export default PredictButton;
