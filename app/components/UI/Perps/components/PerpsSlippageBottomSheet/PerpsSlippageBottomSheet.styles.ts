import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    description: {
      marginTop: 8,
      marginBottom: 16,
    },
    quickSelectContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    quickSelectButton: {
      flex: 1,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background.alternative,
    },
    quickSelectButtonActive: {
      backgroundColor: colors.primary.default,
    },
    customInputContainer: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.primary.default,
      backgroundColor: colors.background.default,
    },
    customInput: {
      flex: 1,
      fontSize: 16,
      textAlign: 'right',
      color: colors.text.default,
      padding: 0,
    },
    customPercentSuffix: {
      fontSize: 16,
      color: colors.text.alternative,
      marginLeft: 4,
    },
    inputContainerError: {
      borderColor: colors.error.default,
    },
    errorText: {
      marginBottom: 8,
    },
  });
