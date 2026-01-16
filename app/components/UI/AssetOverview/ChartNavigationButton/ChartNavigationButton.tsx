import React from 'react';
import TouchableOpacity from '../../../Base/TouchableOpacity';
import { useStyles } from '../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import styleSheet from './ChartNavigationButton.styles';

interface ChartNavigationButtonProps {
  onPress: () => void;
  label: string;
  selected: boolean;
}

const ChartNavigationButton = ({
  onPress,
  label,
  selected,
}: ChartNavigationButtonProps) => {
  const { styles } = useStyles(styleSheet, { selected });
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text
        variant={TextVariant.BodySM}
        style={styles.label}
        color={selected ? TextColor.Default : TextColor.Alternative}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};
export default ChartNavigationButton;
