import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useStyles } from '../../../../component-library/hooks';
import Text from '../../../Base/Text';
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
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};
export default ChartNavigationButton;
