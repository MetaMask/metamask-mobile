import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    wrapper: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      backgroundColor: colors.background.default,
      width: '100%',
    },
    balanceContainer: {
      flex: 1,
    },
    titleText: {
      marginBottom: 4,
    },
    arrowContainer: {
      marginLeft: 12,
    },
    balanceText: {
      borderRadius: 4,
      paddingHorizontal: 4,
    },
  });
};

export default styleSheet;
