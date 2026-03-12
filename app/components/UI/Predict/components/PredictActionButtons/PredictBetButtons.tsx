import React from 'react';
import {
  Box,
  BoxFlexDirection,
  ButtonBaseSize,
} from '@metamask/design-system-react-native';
import PredictBetButton from './PredictBetButton';
import { PredictBetButtonsProps } from './PredictActionButtons.types';

const PredictBetButtons: React.FC<PredictBetButtonsProps> = ({
  yesLabel,
  yesPrice,
  onYesPress,
  noLabel,
  noPrice,
  onNoPress,
  yesTeamColor,
  noTeamColor,
  disabled = false,
  testID = 'predict-bet-buttons',
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
        testID={`${testID}-yes`}
        size={isCarousel ? ButtonBaseSize.Md : undefined}
      />
    </Box>
    <Box twClassName="flex-1">
      <PredictBetButton
        label={noLabel}
        price={noPrice}
        onPress={onNoPress}
        variant="no"
        teamColor={noTeamColor}
        disabled={disabled}
        testID={`${testID}-no`}
        size={isCarousel ? ButtonBaseSize.Md : undefined}
      />
    </Box>
  </Box>
);

export default PredictBetButtons;
