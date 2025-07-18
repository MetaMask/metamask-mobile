import React from 'react';
import { View } from 'react-native';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../../component-library/components/Buttons/Button';
import { useTheme } from '../../../../../util/theme';
import { RISK_MANAGEMENT } from '../../constants/hyperLiquidConfig';
import { createStyles } from './PerpsLeverageButtons.styles';

interface PerpsLeverageButtonsProps {
  selectedLeverage: number;
  onLeverageSelect: (leverage: number) => void;
  leverageOptions?: number[];
  maxLeverage?: number; // Maximum leverage allowed for the current asset
}

/**
 * Generate smart leverage options showing selected leverage and adjacent values
 * Always shows the selected leverage plus one value before and after when possible
 */
const generateSmartLeverageOptions = (selectedLeverage: number, maxLeverage: number): number[] => {
  const allOptions = [1, 2, 3, 5, 10, 20, 50].filter(option => option <= maxLeverage);

  // If custom leverage options are provided, use them as-is
  const selectedIndex = allOptions.indexOf(selectedLeverage);

  if (selectedIndex === -1) {
    // Selected leverage is not in standard options, show it with closest neighbors
    const customOptions = [...allOptions, selectedLeverage].sort((a, b) => a - b);
    const customIndex = customOptions.indexOf(selectedLeverage);
    const start = Math.max(0, customIndex - 1);
    const end = Math.min(customOptions.length, customIndex + 2);
    return customOptions.slice(start, end);
  }

  // Show selected + adjacent options (3 total when possible)
  const start = Math.max(0, selectedIndex - 1);
  const end = Math.min(allOptions.length, selectedIndex + 2);
  return allOptions.slice(start, end);
};

const PerpsLeverageButtons: React.FC<PerpsLeverageButtonsProps> = ({
  selectedLeverage,
  onLeverageSelect,
  leverageOptions,
  maxLeverage = RISK_MANAGEMENT.fallbackMaxLeverage,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // Use provided options or generate smart options based on selected leverage
  const options = leverageOptions || generateSmartLeverageOptions(selectedLeverage, maxLeverage);

  const handleLeverageSelect = (leverage: number) => {
    onLeverageSelect(leverage);
  };

  return (
    <View style={styles.container}>
      {options.map((leverage) => (
        <Button
          key={leverage}
          variant={selectedLeverage === leverage ? ButtonVariants.Primary : ButtonVariants.Secondary}
          size={ButtonSize.Sm}
          label={`${leverage}x`}
          onPress={() => handleLeverageSelect(leverage)}
          style={styles.leverageButton}
        />
      ))}
    </View>
  );
};

export default PerpsLeverageButtons;
