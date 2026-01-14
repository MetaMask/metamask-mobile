import React from 'react';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
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
  size = 'md',
  disabled = false,
  testID = 'predict-bet-buttons',
}) => (
  <Box flexDirection={BoxFlexDirection.Row} twClassName="w-full gap-3">
    <PredictBetButton
      label={yesLabel}
      price={yesPrice}
      onPress={onYesPress}
      variant="yes"
      teamColor={yesTeamColor}
      size={size}
      disabled={disabled}
      testID={`${testID}-yes`}
    />
    <PredictBetButton
      label={noLabel}
      price={noPrice}
      onPress={onNoPress}
      variant="no"
      teamColor={noTeamColor}
      size={size}
      disabled={disabled}
      testID={`${testID}-no`}
    />
  </Box>
);

export default PredictBetButtons;
