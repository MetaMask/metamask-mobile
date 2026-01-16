import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import { useTheme } from '../../../../../util/theme';
import { Colors } from '../../../../../util/theme/models';
import Label from '../../../../../component-library/components/Form/Label';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      padding: 16,
      backgroundColor: colors.background.muted,
      borderRadius: 8,
    },
    label: {
      marginVertical: 8,
    },
    highlighted: {
      borderColor: colors.primary.default,
    },
    thin: {
      paddingVertical: 12,
    },
    compact: {
      padding: 0,
    },
  });

interface Props {
  highlighted?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
  thin?: boolean;
  activeOpacity?: number;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPress?: () => any;
  accessible?: boolean;
  accessibilityLabel?: string;
  compact?: boolean;
  children?: React.ReactNode;
}

const Box: React.FC<Props> = ({
  highlighted,
  label,
  style,
  thin,
  onPress,
  activeOpacity,
  accessible,
  accessibilityLabel,
  compact,
  children,
  ...props
}: Props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <>
      {Boolean(label) && <Label style={styles.label}>{label}</Label>}
      <TouchableOpacity
        disabled={!onPress}
        onPress={onPress}
        activeOpacity={activeOpacity}
        accessible={accessible ?? Boolean(onPress)}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={onPress ? 'button' : undefined}
      >
        <View
          style={[
            styles.wrapper,
            thin && styles.thin,
            highlighted && styles.highlighted,
            compact && styles.compact,
            style,
          ]}
          {...props}
        >
          {children}
        </View>
      </TouchableOpacity>
    </>
  );
};

export default Box;
