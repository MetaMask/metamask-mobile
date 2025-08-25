import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
      flexDirection: 'column',
      justifyContent: 'center',
    },
    spacer: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      flexGrow: 1,
    },
    stakeButtonText: {
      fontSize: 18,
      color: colors.text.alternative,
    },
    reviewButtonContainer: {
      padding: 16,
    },
    keypad: {
      paddingHorizontal: 16,
    },
    unstakeBanner: {
      marginHorizontal: 16,
    },
    earnTokenSelectorContainer: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
  });
};

export default styleSheet;
