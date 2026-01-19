import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 16,
      minHeight: 56,
    },
    optionSelected: {
      backgroundColor: colors.background.muted,
    },
    optionContent: {
      flex: 1,
    },
    optionTitle: {
      marginBottom: 4,
    },
  });
