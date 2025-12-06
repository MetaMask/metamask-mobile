import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    intercomButton: {
      position: 'absolute',
      top: '39%',
      right: 0,
      height: 60,
      width: 40,
      backgroundColor: colors.primary.default,
      borderTopLeftRadius: 30,
      borderBottomLeftRadius: 30,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingLeft: 8,
      shadowColor: colors.shadow.default,
      shadowOffset: { width: -2, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 10000,
    },
  });
};

export default styleSheet;
