import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../hooks/useStyles';
import styleSheet from './ChartTimespanButtonGroup.styles';
import { ChartButton } from './ChartTimespanButtonGroup.types';

interface ChartTimespanButtonProps {
  onPress: () => void;
  label: string;
  isSelected: boolean;
}
const ChartTimespanButton = ({
  onPress,
  label,
  isSelected = false,
}: ChartTimespanButtonProps) => {
  const { styles } = useStyles(styleSheet, { isSelected });

  return (
    <TouchableOpacity style={styles.chartTimespanButton} onPress={onPress}>
      <Text
        variant={TextVariant.BodyMDMedium}
        color={isSelected ? TextColor.Inverse : TextColor.Muted}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

interface ChartTimespanButtonGroupProps {
  buttons: ChartButton[];
  onTimePress: (numDaysToDisplay: number) => void;
}

const ChartTimespanButtonGroup = ({
  buttons,
  onTimePress,
}: ChartTimespanButtonGroupProps) => {
  const { styles } = useStyles(styleSheet, { isSelected: false });

  const [selectedIndex, setSelectedIndex] = useState(0);

  const handlePress = (index: number) => {
    setSelectedIndex(index);
    onTimePress?.(buttons?.[index]?.value);
  };

  return (
    <View style={styles.chartTimespanButtonGroup}>
      {buttons?.map(({ label }, index) => (
        <ChartTimespanButton
          key={`${label}-${index}`}
          label={label}
          isSelected={index === selectedIndex}
          onPress={() => handlePress(index)}
        />
      ))}
    </View>
  );
};

export default ChartTimespanButtonGroup;
