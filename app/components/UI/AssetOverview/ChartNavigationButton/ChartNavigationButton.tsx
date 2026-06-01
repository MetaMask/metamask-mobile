import React from 'react';

import { useStyles } from '../../../../component-library/hooks';
import Pressable from '../../../../component-library/components-temp/Pressable';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import styleSheet from './ChartNavigationButton.styles';

interface ChartNavigationButtonProps {
  onPress: () => void;
  label: string;
  selected: boolean;
  /** Override background color for the selected state (A/B test). */
  selectedColor?: string;
}

const ChartNavigationButton = ({
  onPress,
  label,
  selected,
  selectedColor,
}: ChartNavigationButtonProps) => {
  const { styles } = useStyles(styleSheet, { selected, selectedColor });

  const getTextColor = () => {
    if (selected && selectedColor) {
      return TextColor.Inverse;
    }
    if (!selected && selectedColor) {
      return selectedColor;
    }
    return selected ? TextColor.Default : TextColor.Alternative;
  };

  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text
        variant={TextVariant.BodySM}
        style={styles.label}
        color={getTextColor()}
      >
        {label}
      </Text>
    </Pressable>
  );
};
export default ChartNavigationButton;
