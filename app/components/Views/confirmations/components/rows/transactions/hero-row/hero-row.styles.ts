import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    wrapper: {
      minHeight: 100,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingWrapper: {
      height: 78,
      width: 78,
      borderRadius: 39,
      backgroundColor: theme.colors.background.alternativePressed,
    },
  });
};

export default styleSheet;
