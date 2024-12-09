import React, { useState } from 'react';
import { View } from 'react-native';
import Button, {
  ButtonVariants,
} from '../../../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import styleSheet from './StakingEarningsTimePeriod.styles';

export enum DateRange {
  DAILY = 'daily',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

interface TimePeriodButtonGroupProps {
  onTimePeriodChange?: (timePeriod: DateRange) => void;
  initialTimePeriod: DateRange;
}

const TimePeriodButtonGroup: React.FC<TimePeriodButtonGroupProps> = ({
  onTimePeriodChange = () => undefined,
  initialTimePeriod,
}) => {
  const [selectedButton, setSelectedButton] = useState<DateRange>(
    () => initialTimePeriod,
  );
  const [pressedButton, setPressedButton] = useState<DateRange | null>(null);

  const { styles } = useStyles(styleSheet, {});

  const renderButton = (label: string, dateRange: DateRange) => {
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
        : styles.selectedButtonLabel; // Change text color based on selection or press
    const labelElement = (
      <Text style={labelStyle} variant={TextVariant.BodyMD}>
        {label}
      </Text>
    );

    const buttonSelectedStyle = !isSelected ? styles.unselectedButton : {};
    const variant = isSelected
      ? ButtonVariants.Primary
      : ButtonVariants.Secondary;
    const buttonStyle = { ...styles.button, ...buttonSelectedStyle };
    return (
      <Button
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        variant={variant}
        label={labelElement}
        style={buttonStyle}
      />
    );
  };

  return (
    <View style={styles.timePeriodButtonGroupContainer}>
      {renderButton('Daily', DateRange.DAILY)}
      {renderButton('Monthly', DateRange.MONTHLY)}
      {renderButton('Yearly', DateRange.YEARLY)}
    </View>
  );
};

export default TimePeriodButtonGroup;
