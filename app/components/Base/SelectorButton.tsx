import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
  GestureResponderEvent,
} from 'react-native';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../component-library/components/Icons/Icon';
import { useTheme } from '../../util/theme';
import { Theme } from '@metamask/design-tokens';

interface SelectorButtonProps {
  onPress: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background.muted,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 100,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    caretDown: {
      marginHorizontal: 5,
    },
  });

const SelectorButton: React.FC<SelectorButtonProps & TouchableOpacityProps> = ({
  onPress,
  disabled,
  children,
  ...props
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} {...props}>
      <View style={styles.container}>
        <>{children}</>
        <Icon
          name={IconName.ArrowDown}
          size={IconSize.Sm}
          color={IconColor.Alternative}
          style={styles.caretDown}
        />
      </View>
    </TouchableOpacity>
  );
};

export default SelectorButton;
