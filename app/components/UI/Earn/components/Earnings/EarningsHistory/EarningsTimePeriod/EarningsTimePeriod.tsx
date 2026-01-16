import React, { useState } from 'react';
import { View } from 'react-native';
import TouchableOpacity from '../../../../../../Base/TouchableOpacity';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import styleSheet from './EarningsTimePeriod.styles';
import {
  DateRange,
  TimePeriodButtonGroupProps,
} from './EarningsTimePeriod.types';

const TimePeriodButtonGroup: React.FC<TimePeriodButtonGroupProps> = ({
  onTimePeriodChange = () => undefined,
  initialTimePeriod,
}) => {
  const [selectedButton, setSelectedButton] = useState<DateRange>(
    () => initialTimePeriod,
  );
  const [pressedButton, setPressedButton] = useState<DateRange | null>(null);

  const { styles } = useStyles(styleSheet, {});

  const renderButton = (dateRange: DateRange, width: number) => {
    const handlePress = () => {
      setSelectedButton(dateRange);
      onTimePeriodChange(dateRange);
    };
    const handlePressIn = () => {
      setPressedButton(dateRange);
    };
    const handlePressOut = () => {
      setPressedButton(null);
    };

    const isSelected = selectedButton === dateRange;
    const isPressed = pressedButton === dateRange;
    const labelStyle =
      !isSelected && !isPressed
        ? styles.unselectedButtonLabel
        : styles.selectedButtonLabel;
    const labelElement = (
      <Text style={labelStyle} variant={TextVariant.BodyMD}>
        {dateRange}
      </Text>
    );

    const buttonSelectedStyle = !isSelected ? {} : styles.selectedButton;
    const buttonStyle = { ...styles.button, ...buttonSelectedStyle };

    return (
      <View style={{ ...styles.buttonContainer, width }}>
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={buttonStyle}
        >
          <Text variant={TextVariant.BodyMD} style={styles.buttonLabel}>
            {labelElement}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.timePeriodButtonGroupContainer}>
      {initialTimePeriod ? (
        <>
          {renderButton(DateRange.DAILY, 50)}
          {renderButton(DateRange.MONTHLY, 45)}
          {renderButton(DateRange.YEARLY, 42)}
        </>
      ) : (
        <SkeletonPlaceholder>
          <SkeletonPlaceholder.Item width={167} height={40} borderRadius={6} />
        </SkeletonPlaceholder>
      )}
    </View>
  );
};

export default TimePeriodButtonGroup;
