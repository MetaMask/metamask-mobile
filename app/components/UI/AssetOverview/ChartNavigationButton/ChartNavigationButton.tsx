import React, { useContext, useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import Text from '../../../Base/Text';
import createStyles from './ChartNavigationButton.styles';

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
  const { colors = mockTheme.colors } = useContext(ThemeContext);
  const styles = useMemo(
    () => createStyles(colors, selected),
    [colors, selected],
  );

  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};
export default ChartNavigationButton;
