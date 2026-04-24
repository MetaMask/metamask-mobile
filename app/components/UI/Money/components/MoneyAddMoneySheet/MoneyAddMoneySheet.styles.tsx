import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    disabledRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.background.default,
    },
    disabledRowContent: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 4,
    },
  });
