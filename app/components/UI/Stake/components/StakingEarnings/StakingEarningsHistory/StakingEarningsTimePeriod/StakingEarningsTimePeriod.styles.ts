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
      color: colors.text.muted,
    },
    selectedButtonLabel: {
      color: colors.info.inverse,
    },
    button: {
      borderRadius: 8,
      marginLeft: 8,
      marginRight: 8,
    },
    unselectedButton: {
      borderWidth: 0,
    },
  });
};

export default styleSheet;
