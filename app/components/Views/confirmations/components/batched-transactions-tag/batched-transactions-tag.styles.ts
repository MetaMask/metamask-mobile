import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    tagBaseStyle: {
      alignSelf: 'center',
      backgroundColor: theme.colors.background.alternative,
      borderColor: theme.colors.border.default,
      borderWidth: 1,
      marginTop: 8,
    },
  });
};

export default styleSheet;
