import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';

export const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
      marginVertical: 8,
    },
    tokenSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  });
