import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    footerContainer: {
      backgroundColor: theme.colors.primary.inverse,
      paddingTop: 32,
    },
    footerButtonsContainer: {
      backgroundColor: theme.colors.primary.inverse,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    incompleteStep: {
      backgroundColor: theme.colors.background.alternative,
      justifyContent: 'center',
      alignItems: 'center',
    },
    completeStep: {
      backgroundColor: theme.colors.primary.default,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bottomTextContainer: {
      flexDirection: 'column',
      justifyContent: 'center',
      marginBottom: 12,
    },
    bottomTextContainerLine: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    linkText: {
      textDecorationLine: 'underline',
    },
    allStepsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
    },
    stepContainer: {
      alignItems: 'center',
      position: 'relative',
      bottom: 17,
    },
  });
};

export default styleSheet;
