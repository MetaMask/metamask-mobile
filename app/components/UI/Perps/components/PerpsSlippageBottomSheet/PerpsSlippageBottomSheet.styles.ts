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
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 12,
      height: 48,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    inputContainerFocused: {
      borderColor: colors.primary.default,
    },
    inputContainerError: {
      borderColor: colors.error.default,
    },
    input: {
      flex: 1,
      fontSize: 16,
      textAlign: 'right',
      color: colors.text.default,
      padding: 0,
    },
    percentSuffix: {
      fontSize: 16,
      color: colors.text.alternative,
      marginLeft: 4,
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
    errorText: {
      marginBottom: 8,
    },
  });
