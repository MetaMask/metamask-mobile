import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const createStyles = ({ theme }: { theme: Theme }) => {
  const { colors } = theme;

  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      flexGrow: 1,
      paddingBottom: 100, // Space for fixed bottom button
    },
    scrollViewContentWithKeypad: {
      paddingBottom: 400, // Extra space when keypad is visible
    },
    header: {
      paddingHorizontal: 8,
      paddingTop: 16,
      paddingBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      width: 24,
      height: 24,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    placeholder: {
      width: 24,
      height: 24,
    },
    inputsContainer: {
      paddingTop: 16,
      paddingHorizontal: 16,
    },
    arrowContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 1,
      backgroundColor: theme.colors.border.muted,
      marginVertical: 16,
      zIndex: 1,
    },
    arrowCircle: {
      backgroundColor: colors.background.default,
      borderRadius: 32,
      borderWidth: 1,
      paddingLeft: 16,
      paddingTop: 16,
      width: 64,
      height: 64,
      borderColor: colors.border.default,
    },
    quoteContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      flex: 1,
    },
    quoteDetails: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 16,
    },
    quoteRow: {
      marginVertical: 4,
    },
    floatingKeypadContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.background.default,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
      paddingTop: 16,
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    percentageButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
      marginBottom: 16,
      gap: 8,
    },
    percentageButton: {
      flex: 1,
      height: 40,
    },
    keypad: {
      paddingHorizontal: 0,
    },
    actionButton: {
      width: '100%',
    },
    fixedBottomContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.background.default,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 24,
    },
    errorText: {
      color: colors.error.default,
      marginBottom: 8,
      textAlign: 'center',
    },
  });
};

export default createStyles;
