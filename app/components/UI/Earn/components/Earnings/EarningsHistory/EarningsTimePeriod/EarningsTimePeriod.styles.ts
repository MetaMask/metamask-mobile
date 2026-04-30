import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    timePeriodButtonGroupContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingTop: 32,
      paddingBottom: 32,
    },
    unselectedButtonLabel: {
      color: colors.text.alternative,
    },
    selectedButtonLabel: {
      color: colors.text.alternative,
    },
    buttonContainer: {
      marginLeft: 8,
      marginRight: 8,
    },
    button: {
      backgroundColor: colors.background.default,
      width: '100%',
      borderRadius: 32,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    selectedButton: {
      backgroundColor: colors.background.muted,
    },
    buttonLabel: {
      letterSpacing: 3,
      textAlign: 'center',
      color: colors.text.default,
    },
  });
};

export default styleSheet;
