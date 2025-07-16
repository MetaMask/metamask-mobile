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
    content: {
      flex: 1,
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
      marginVertical: -8,
      zIndex: 1,
    },
    arrowCircle: {
      backgroundColor: colors.background.default,
      borderRadius: 16,
      borderWidth: 1,
      paddingLeft: 4,
      paddingTop: 4,
      width: 32,
      height: 32,
      borderColor: colors.border.default,
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingBottom: 120, // Account for fixed bottom button
    },
    dynamicContent: {
      flex: 1,
      justifyContent: 'flex-start',
    },
    keypadContainer: {
      marginTop: 24,
    },
    keypad: {
      paddingHorizontal: 0,
    },
    percentageButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 25,
      paddingBottom: 16,
      gap: 8,
    },
    percentageButton: {
      flex: 1,
      height: 40,
    },
    quoteContainer: {
      marginTop: 16,
    },
    quoteDetails: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 16,
    },
    quoteRow: {
      marginVertical: 4,
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
    button: {
      width: '100%',
    },
    errorText: {
      color: colors.error.default,
      marginBottom: 16,
      textAlign: 'center',
    },
  });
};

export default createStyles;
