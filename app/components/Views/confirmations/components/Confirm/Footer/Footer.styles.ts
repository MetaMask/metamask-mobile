import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme: { colors }} = params;

  return StyleSheet.create({
    base: {
      background: colors.background.alternative,
      paddingHorizontal: 16,
      paddingBottom: 8,
      paddingTop: 16,
    },
  });
};

export default styleSheet;
