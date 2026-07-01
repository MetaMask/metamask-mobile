import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  IconName,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
  IconColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import PredictBetButton from '../PredictActionButtons/PredictBetButton';
import type { PredictBetButtonVariant } from '../PredictActionButtons/PredictActionButtons.types';
import { PredictSportLineSelector } from '../PredictSportLineSelector';
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
  lines?: number[];
  selectedLine?: number;
  selectedIndex?: number;
  onSelectLine?: (line: number, index: number) => void;
  buttonLayout?: 'inline' | 'inlineNoSeparator' | 'stacked';
  disabled?: boolean;
  showRegTimeTag?: boolean;
  onPressRegTimeInfo?: () => void;
  testID?: string;
}

const PredictSportOutcomeCard: React.FC<PredictSportOutcomeCardProps> = ({
  title,
  subtitle,
  buttons,
  lines,
  selectedLine,
  selectedIndex,
  onSelectLine,
  buttonLayout = 'inline',
  disabled = false,
  showRegTimeTag = false,
  onPressRegTimeInfo,
  testID = PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.CONTAINER,
}) => {
  const showLineSelector =
    lines &&
    lines.length > 1 &&
    selectedLine !== undefined &&
    onSelectLine !== undefined;

  return (
    <Box testID={testID} twClassName="w-full bg-muted rounded-2xl p-4 mb-4">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="justify-between mb-3"
      >
        <Box twClassName="flex-1">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="flex-wrap gap-1"
          >
            <Text
              testID={PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.TITLE}
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
            >
              {title}
            </Text>
            {showRegTimeTag ? (
              <Pressable
                onPress={onPressRegTimeInfo}
                accessibilityRole="button"
                accessibilityLabel={strings(
                  'predict.reg_time_info.accessibility_label',
                )}
                testID={
                  PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.REG_TIME_INFO_BUTTON
                }
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Tag
                  severity={TagSeverity.Neutral}
                  endIconName={IconName.Info}
                  endIconProps={{
                    color: IconColor.IconAlternative,
                  }}
                  testID={PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.REG_TIME_TAG}
                >
                  <Text
                    variant={TextVariant.BodyXs}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextAlternative}
                  >
                    {strings('predict.reg_time_info.tag')}
                  </Text>
                </Tag>
              </Pressable>
            ) : null}
          </Box>
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
              layout={buttonLayout}
              testID={`${testID}-button-${index}`}
            />
          </Box>
        ))}
      </Box>

      {showLineSelector && (
        <Box twClassName="mt-3">
          <PredictSportLineSelector
            lines={lines}
            selectedLine={selectedLine}
            selectedIndex={selectedIndex}
            onSelectLine={onSelectLine}
            testID={PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.LINE_SELECTOR}
          />
        </Box>
      )}
    </Box>
  );
};

export default PredictSportOutcomeCard;
