import { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { typography } = theme;
  return StyleSheet.create({
    wrapper: {
      marginTop: 20,
    },
    text: {
      ...typography.sBodyMD,
      marginVertical: 0,
    } as TextStyle,
    title: {
      ...typography.sHeadingSM,
      marginVertical: 0,
      marginBottom: 4,
    } as TextStyle,
  });
};

export default styleSheet;
