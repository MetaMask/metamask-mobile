import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    displayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-evenly',
      paddingVertical: 24,
    },
    displayCenter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    displayValue: {
      fontSize: 40,
      lineHeight: 48,
      color: colors.text.default,
      fontWeight: '500',
    },
    displaySuffix: {
      fontSize: 40,
      lineHeight: 48,
      color: colors.text.default,
      fontWeight: '500',
      marginLeft: 4,
    },
    cursor: {
      width: 2,
      height: 36,
      marginHorizontal: 2,
      backgroundColor: colors.primary.default,
    },
    keypadContainer: {
      marginTop: 8,
    },
    errorText: {
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 8,
    },
    footerContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 8,
    },
    footerButton: {
      flex: 1,
    },
  });
