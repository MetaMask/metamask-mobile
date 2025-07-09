import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';

export const createStyles = (colors: Colors) =>
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
