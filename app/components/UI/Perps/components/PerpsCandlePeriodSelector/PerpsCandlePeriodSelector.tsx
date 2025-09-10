import React from 'react';
import { Pressable } from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import { CandlePeriod } from '../../constants/chartConfig';
import { getPerpsCandlePeriodSelector } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { styleSheet } from './PerpsCandlePeriodSelector.styles';

// Default candle periods with preset values
const DEFAULT_CANDLE_PERIODS = [
  { label: '1min', value: CandlePeriod.ONE_MINUTE },
  { label: '3min', value: CandlePeriod.THREE_MINUTES },
  { label: '5min', value: CandlePeriod.FIVE_MINUTES },
  { label: '15min', value: CandlePeriod.FIFTEEN_MINUTES },
] as const;

interface PerpsCandlePeriodSelectorProps {
  selectedPeriod: CandlePeriod | string;
  onPeriodChange?: (period: CandlePeriod) => void;
  onMorePress?: () => void;
  testID?: string;
}

const PerpsCandlePeriodSelector: React.FC<PerpsCandlePeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
  onMorePress,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});

  // Check if the selected period is in the "More" category (not in default periods)
  const isMorePeriodSelected = !DEFAULT_CANDLE_PERIODS.some(
    (period) => period.value.toLowerCase() === selectedPeriod.toLowerCase(),
  );

  return (
    <Box style={styles.container} testID={testID}>
      {/* Candle Period Buttons */}
      {DEFAULT_CANDLE_PERIODS.map((period) => {
        const isSelected =
          selectedPeriod.toLowerCase() === period.value.toLowerCase();

        return (
          <Pressable
            key={period.value}
            style={({ pressed }) => [
              styles.periodButton,
              isSelected
                ? styles.periodButtonSelected
                : styles.periodButtonUnselected,
              pressed && styles.periodButtonPressed,
            ]}
            onPress={() => onPeriodChange?.(period.value)}
            testID={
              testID
                ? getPerpsCandlePeriodSelector.periodButton(
                    testID,
                    period.value,
                  )
                : undefined
            }
          >
            <Text
              variant={TextVariant.BodySm}
              style={[
                styles.periodText,
                isSelected
                  ? styles.periodTextSelected
                  : styles.periodTextUnselected,
              ]}
            >
              {period.label}
            </Text>
          </Pressable>
        );
      })}

      {/* More Button */}
      <Pressable
        style={({ pressed }) => [
          styles.moreButton,
          isMorePeriodSelected
            ? styles.moreButtonSelected
            : styles.moreButtonUnselected,
          pressed && styles.moreButtonPressed,
        ]}
        onPress={onMorePress}
        testID={
          testID ? getPerpsCandlePeriodSelector.moreButton(testID) : undefined
        }
      >
        <Text
          variant={TextVariant.BodySm}
          style={[
            styles.moreText,
            isMorePeriodSelected
              ? styles.moreTextSelected
              : styles.moreTextUnselected,
          ]}
        >
          {strings('perps.chart.candle_period_selector.show_more')}
        </Text>
      </Pressable>
    </Box>
  );
};

export default PerpsCandlePeriodSelector;
