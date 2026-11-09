import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { selectCanSignTransactions } from '../../../../../../selectors/accountsController';
import {
  PredictEventValues,
  selectPredictAvailability,
  usePredictEntryActions,
} from '../../../../../UI/PredictNext';
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
  const { openPredict } = usePredictEntryActions();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const isPredictEnabled = useSelector(selectPredictAvailability);
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

    openPredict({
      type: 'home',
      entryPoint: PredictEventValues.ENTRY_POINT.HOMESCREEN_PILL,
    });
  }, [actionPosition, createEventBuilder, label, openPredict, trackEvent]);

  return (
    <HomepageActionButton
      allowTwoLineLabel={allowTwoLineLabel}
      iconName={IconName.Predictions}
      isDisabled={isDisabled}
      label={label}
      onPress={handlePress}
      testID={HomepageActionButtonsGridTestIds.PREDICT_BUTTON}
    />
  );
};

export default PredictButton;
