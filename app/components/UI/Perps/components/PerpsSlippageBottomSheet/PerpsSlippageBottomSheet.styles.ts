import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const createStyles = (_colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    description: {
      marginTop: 8,
      marginBottom: 16,
    },
    chipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    chip: {
      flex: 1,
      height: 48,
      borderRadius: 999,
      paddingHorizontal: 8,
    },
    editChip: {
      height: 48,
      width: 64,
      borderRadius: 999,
      paddingHorizontal: 8,
    },
  });
