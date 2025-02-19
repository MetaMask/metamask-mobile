import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme: { colors }} = params;

  return StyleSheet.create({
    base: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 16,
      paddingBottom: 8,
      paddingTop: 16,
    },
    confirmButtonDisabled: {
      opacity: 0.5,
    },
  });
};

export default styleSheet;
