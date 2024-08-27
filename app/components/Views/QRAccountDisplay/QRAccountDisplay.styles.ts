import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    wrapper: {
      backgroundColor: theme.colors.background.default,
      marginVertical: 32,
    },
    accountLabel: {
      alignSelf: 'center',
      marginBottom: 16,
    },
    addressContainer: {
      width: 185,
      textAlign: 'center',
    },
    copyButton: {
      alignSelf: 'center',
    },
  });
};

export default styleSheet;
