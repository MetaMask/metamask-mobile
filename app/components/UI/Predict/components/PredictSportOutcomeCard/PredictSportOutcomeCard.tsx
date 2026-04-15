import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import PredictBetButton from '../PredictActionButtons/PredictBetButton';
import type { PredictBetButtonVariant } from '../PredictActionButtons/PredictActionButtons.types';
import { PREDICT_SPORT_OUTCOME_CARD_TEST_IDS } from './PredictSportOutcomeCard.testIds';

export interface PredictSportOutcomeButton {
  label: string;
  price: number;
  onPress: () => void;
  variant: PredictBetButtonVariant;
  teamColor?: string;
}

interface PredictSportOutcomeCardProps {
  title: string;
  subtitle?: string;
  buttons: PredictSportOutcomeButton[];
  disabled?: boolean;
  testID?: string;
}

const PredictSportOutcomeCard: React.FC<PredictSportOutcomeCardProps> = ({
  title,
  subtitle,
  buttons,
  disabled = false,
  testID = PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.CONTAINER,
}) => (
  <Box testID={testID} twClassName="w-full bg-muted rounded-2xl p-4 mb-4">
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="justify-between mb-3"
    >
      <Box twClassName="flex-1">
        <Text
          testID={PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.TITLE}
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            testID={PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.SUBTITLE}
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
          >
            {subtitle}
          </Text>
        ) : null}
      </Box>
    </Box>

    <Box flexDirection={BoxFlexDirection.Row} twClassName="w-full gap-3">
      {buttons.map((button, index) => (
        <Box key={`${button.label}-${button.variant}`} twClassName="flex-1">
          <PredictBetButton
            label={button.label}
            price={button.price}
            onPress={button.onPress}
            variant={button.variant}
            teamColor={button.teamColor}
            disabled={disabled}
            layout="inline"
            testID={`${testID}-button-${index}`}
          />
        </Box>
      ))}
    </Box>
  </Box>
);

export default PredictSportOutcomeCard;
