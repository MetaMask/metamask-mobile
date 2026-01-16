import React from 'react';
import { Pressable } from 'react-native-gesture-handler';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../component-library/hooks';
import { TIME_DURATIONS, TimeDuration } from '../../constants/chartConfig';
import { getPerpsTimeDurationSelector } from '../../Perps.testIds';
import { timeDurationSelectorStyleSheet } from './PerpsTimeDurationSelector.styles';

interface PerpsTimeDurationSelectorProps {
  selectedDuration: TimeDuration | string;
  onDurationChange?: (duration: TimeDuration) => void;
  onGearPress?: () => void;
  testID?: string;
}

const PerpsTimeDurationSelector: React.FC<PerpsTimeDurationSelectorProps> = ({
  selectedDuration,
  onDurationChange,
  onGearPress,
  testID,
}) => {
  const { styles } = useStyles(timeDurationSelectorStyleSheet, {});

  return (
    <Box style={styles.container} testID={testID}>
      {/* Time Duration Buttons */}
      <Box style={styles.durationButtonsContainer}>
        {TIME_DURATIONS.map((duration) => {
          const isSelected =
            selectedDuration.toLowerCase() === duration.value.toLowerCase();

          return (
            <Pressable
              key={duration.value}
              style={({ pressed }) => [
                styles.durationButton,
                isSelected
                  ? styles.durationButtonActive
                  : styles.durationButtonInactive,
                pressed && styles.durationButtonPressed,
              ]}
              onPress={() => onDurationChange?.(duration.value)}
              testID={
                testID
                  ? getPerpsTimeDurationSelector.durationButton(
                      testID,
                      duration.value,
                    )
                  : undefined
              }
            >
              <Text
                variant={TextVariant.BodySm}
                style={[
                  styles.durationButtonText,
                  isSelected
                    ? styles.durationButtonTextActive
                    : styles.durationButtonTextInactive,
                ]}
              >
                {duration.label}
              </Text>
            </Pressable>
          );
        })}
      </Box>

      {/* Gear Icon */}
      <Pressable
        style={({ pressed }) => [
          styles.gearButton,
          pressed && styles.gearButtonPressed,
        ]}
        onPress={onGearPress}
        testID={
          testID ? getPerpsTimeDurationSelector.gearButton(testID) : undefined
        }
      >
        <Icon
          name={IconName.Setting}
          size={IconSize.Md}
          color={IconColor.Muted}
        />
      </Pressable>
    </Box>
  );
};

export default PerpsTimeDurationSelector;
