import React from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
  TextColor
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import { createStyles } from './PerpsOrderRow.styles';

interface PerpsOrderRowProps {
  label: string;
  value?: string;
  children?: React.ReactNode;
}

const PerpsOrderRow: React.FC<PerpsOrderRowProps> = ({
  label,
  value,
  children,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
        {label}
      </Text>
      {value ? (
        <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
          {value}
        </Text>
      ) : children}
    </View>
  );
};

export default PerpsOrderRow;
