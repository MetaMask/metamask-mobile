import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    screen: { justifyContent: 'center' },
    modal: {
      backgroundColor: colors.background.default,
      borderRadius: 10,
      marginHorizontal: 16,
      minHeight: 300,
    },
    rightText: {
      color: colors.success.default,
    },
    wrongText: {
      color: colors.error.default,
    },
  });
};

export default styleSheet;
