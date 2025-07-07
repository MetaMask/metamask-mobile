import React from 'react';
import { StyleSheet, View } from 'react-native';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';

interface PerpsLeverageButtonsProps {
  selectedLeverage: number;
  onLeverageSelect: (leverage: number) => void;
  leverageOptions?: number[];
}

const createStyles = (_colors: Colors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      gap: 8,
    },
    leverageButton: {
      minWidth: 60,
    },
  });

const PerpsLeverageButtons: React.FC<PerpsLeverageButtonsProps> = ({
  selectedLeverage,
  onLeverageSelect,
  leverageOptions = [2, 10],
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {leverageOptions.map((leverage) => (
        <Button
          key={leverage}
          variant={selectedLeverage === leverage ? ButtonVariants.Primary : ButtonVariants.Secondary}
          size={ButtonSize.Sm}
          label={`${leverage}x`}
          onPress={() => onLeverageSelect(leverage)}
          style={styles.leverageButton}
        />
      ))}
    </View>
  );
};

export default PerpsLeverageButtons;
