import { Theme } from '../../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      paddingBottom: 12,
    },
    step: {
      height: 4,
      flex: 1,
      borderRadius: 2,
    },
    completedStep: {
      backgroundColor: theme.colors.primary.default,
    },
    currentStep: {
      backgroundColor: theme.colors.primary.alternative,
    },
    todoStep: {
      backgroundColor: theme.colors.text.muted,
    },
    stepGap: {
      marginRight: 10,
    },
  });
};

export default styleSheet;
