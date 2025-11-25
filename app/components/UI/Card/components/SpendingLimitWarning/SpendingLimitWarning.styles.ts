import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.warning.muted, // Use theme warning color
      borderRadius: 12,
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 16,
      padding: 16,
    },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    warningIcon: {
      marginRight: 12,
    },
    textContent: {
      flex: 1,
    },
    mainText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text.default,
      marginBottom: 4,
    },
    subText: {
      fontSize: 14,
      fontWeight: '400',
      color: theme.colors.text.alternative,
    },
    buttonsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      marginLeft: 36, // Align with text content (icon width + margin)
      gap: 8, // Space between buttons
    },
    dismissButton: {
      backgroundColor: theme.colors.background.alternative,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
    },
    setLimitButton: {
      backgroundColor: theme.colors.background.default,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text.default,
    },
  });

export default createStyles;
