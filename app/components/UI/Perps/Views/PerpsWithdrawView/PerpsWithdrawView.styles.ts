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
      backgroundColor: colors.background.default,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      marginHorizontal: 16,
    },
    placeholder: {
      width: 40,
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    scrollViewContentWithKeypad: {
      paddingBottom: 400,
    },
    inputsContainer: {
      marginTop: 24,
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
      marginTop: 24,
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
    },
    fixedBottomContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32,
      backgroundColor: colors.background.default,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
    },
    actionButton: {
      marginBottom: 16,
      width: '100%',
    },
    percentageButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
      gap: 8,
    },
    percentageButton: {
      flex: 1,
    },
    errorText: {
      marginBottom: 16,
      textAlign: 'center',
    },
  });
};

export default createStyles;
