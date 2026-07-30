import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    content: {
      flex: 1,
    },
    scrollViewContent: {
      paddingBottom: 20,
    },
    scrollViewContentWithKeypad: {
      paddingBottom: 100,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    sliderSection: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    bottomSection: {
      paddingTop: 16,
    },
    percentageButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      marginBottom: 12,
      gap: 8,
    },
    percentageButton: {
      flex: 1,
    },
    keypad: {
      paddingHorizontal: 16,
    },
    footer: {
      paddingVertical: 16,
      gap: 12,
    },
    footerWithSummary: {
      paddingTop: 0,
    },
    footerButton: {
      paddingHorizontal: 16,
    },
    summaryContainer: {
      paddingTop: 16,
      paddingBottom: 16,
      gap: 4,
    },
    changeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  });
};

export default styleSheet;
