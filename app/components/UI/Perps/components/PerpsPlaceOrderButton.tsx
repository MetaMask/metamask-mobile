import React from 'react';
import { StyleSheet, View } from 'react-native';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';

interface PerpsPlaceOrderButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      padding: 24,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
    },
    button: {
      marginBottom: 0,
    },
  });

const PerpsPlaceOrderButton: React.FC<PerpsPlaceOrderButtonProps> = ({
  onPress,
  loading = false,
  disabled = false,
  label = 'Place order',
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Button
        variant={ButtonVariants.Primary}
        size={ButtonSize.Lg}
        width={ButtonWidthTypes.Full}
        label={label}
        onPress={onPress}
        loading={loading}
        disabled={disabled}
        style={styles.button}
      />
    </View>
  );
};

export default PerpsPlaceOrderButton;
