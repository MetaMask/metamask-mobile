import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    iconContainer: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.primary.muted,
    },
  });
