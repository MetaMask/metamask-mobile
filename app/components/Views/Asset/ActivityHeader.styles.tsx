import { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { typography } = theme;
  return StyleSheet.create({
    wrapper: {
      marginTop: 20,
      paddingHorizontal: 16,
      marginBottom: 16,
      width: '100%',
    },
    title: {
      ...typography.sHeadingSM,
      marginVertical: 0,
      marginBottom: 4,
    } as TextStyle,
  });
};

export default styleSheet;
