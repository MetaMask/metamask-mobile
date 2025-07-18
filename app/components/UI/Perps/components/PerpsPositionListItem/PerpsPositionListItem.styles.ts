import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';

export const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background.section,
      borderRadius: 8,
      padding: 12,
      marginVertical: 4,
    },
    leftSection: {
      flex: 1,
      alignItems: 'flex-start',
    },
    rightSection: {
      flex: 1,
      alignItems: 'flex-end',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
  });
