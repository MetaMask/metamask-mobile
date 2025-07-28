import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
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
    allStepsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
    },
    stepContainer: {
      alignItems: 'center',
      position: 'relative',
      bottom: 17,
    },
    stepLabelContainer: {
      textAlign: 'center',
    },
  });
};

export default styleSheet;
