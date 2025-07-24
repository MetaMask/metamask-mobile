import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    nativeTokenIcon: {
      backgroundColor: theme.colors.background.default,
    },
  });
};

export default styleSheet;
