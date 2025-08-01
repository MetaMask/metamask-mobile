import { StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { addressContainerStyle?: ViewStyle };
}) => {
  const { theme, vars } = params;
  const { addressContainerStyle } = vars;

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
      ...(addressContainerStyle ?? {}),
    },
    copyButton: {
      alignSelf: 'center',
    },
  });
};

export default styleSheet;
