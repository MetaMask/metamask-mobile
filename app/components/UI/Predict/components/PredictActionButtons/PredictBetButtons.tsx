import React from 'react';
import {
  Box,
  BoxFlexDirection,
  ButtonBaseSize,
} from '@metamask/design-system-react-native';
import PredictBetButton from './PredictBetButton';
import { PredictBetButtonsProps } from './PredictActionButtons.types';
import {
  BASE_PREDICT_BET_BUTTONS_TEST_IDS,
  PREDICT_BET_BUTTONS_TEST_IDS,
} from './PredictBetButtons.testIds';

const PredictBetButtons: React.FC<PredictBetButtonsProps> = ({
  yesLabel,
  yesPrice,
  onYesPress,
  drawLabel,
  drawPrice,
  onDrawPress,
  noLabel,
  noPrice,
  onNoPress,
  yesTeamColor,
  noTeamColor,
  disabled = false,
  testID = BASE_PREDICT_BET_BUTTONS_TEST_IDS.PREDICT_BET_BUTTON,
  isCarousel,
}) => (
  <Box flexDirection={BoxFlexDirection.Row} twClassName="w-full gap-3">
    <Box twClassName="flex-1">
      <PredictBetButton
        label={yesLabel}
        price={yesPrice}
        onPress={onYesPress}
        variant="yes"
        teamColor={yesTeamColor}
        disabled={disabled}
        testID={`${testID}${PREDICT_BET_BUTTONS_TEST_IDS.PREDICT_BET_BUTTON_YES}`}
        size={isCarousel ? ButtonBaseSize.Md : undefined}
      />
    </Box>
    {drawLabel !== undefined && drawPrice !== undefined && onDrawPress && (
      <Box twClassName="flex-1">
        <PredictBetButton
          label={drawLabel}
          price={drawPrice}
          onPress={onDrawPress}
          variant="draw"
          disabled={disabled}
          testID={`${testID}${PREDICT_BET_BUTTONS_TEST_IDS.PREDICT_BET_BUTTON_DRAW}`}
          size={isCarousel ? ButtonBaseSize.Md : undefined}
        />
      </Box>
    )}
    <Box twClassName="flex-1">
      <PredictBetButton
        label={noLabel}
        price={noPrice}
        onPress={onNoPress}
        variant="no"
        teamColor={noTeamColor}
        disabled={disabled}
        testID={`${testID}${PREDICT_BET_BUTTONS_TEST_IDS.PREDICT_BET_BUTTON_NO}`}
        size={isCarousel ? ButtonBaseSize.Md : undefined}
      />
    </Box>
  </Box>
);

export default PredictBetButtons;
