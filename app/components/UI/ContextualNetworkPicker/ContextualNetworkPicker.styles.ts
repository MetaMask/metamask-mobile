import { StyleSheet } from 'react-native';
import type { ThemeColors } from '@metamask/design-tokens';

const createStyles = (colors: ThemeColors, disabled: boolean) =>
  StyleSheet.create({
    base: {
      flexDirection: 'row',
      paddingVertical: 5,
      paddingHorizontal: 16,
      borderRadius: 24,
      borderWidth: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderColor: disabled ? colors.border.muted : colors.border.default,
    },
    accountSelectorWrapper: {
      height: 40,
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
      flexDirection: 'row',
      width: '100%',
      marginBottom: 16,
    },
    avatarWrapper: {
      marginRight: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    avatar: {
      opacity: disabled ? 0.5 : 1,
    },
    networkName: {
      opacity: disabled ? 0.5 : 1,
    },
  });

export default createStyles;
