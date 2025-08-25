import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
    option: {
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 16,
      backgroundColor: colors.background.alternative,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    optionSelected: {
      backgroundColor: colors.primary.muted,
      borderColor: colors.primary.default,
    },
    optionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    optionTitle: {
      marginBottom: 4,
    },
    optionContent: {
      flex: 1,
    },
  });
