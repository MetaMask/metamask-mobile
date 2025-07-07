import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text, {
  TextVariant,
  TextColor
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';

interface PerpsOrderRowProps {
  label: string;
  value?: string;
  children?: React.ReactNode;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
  });

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
