import { StyleSheet } from 'react-native';
import type { Theme } from '@metamask/design-tokens';

const styleSheet = (params: { theme: Theme }) => {
  const {
    theme: { colors },
  } = params;

  return StyleSheet.create({
    button: {
      width: '100%',
      backgroundColor: colors.background.alternative,
      borderColor: colors.background.muted,
    },
    row: {
      paddingLeft: 16,
      paddingRight: 16,
      height: 52,
      backgroundColor: colors.background.alternative,
    },
  });
};

export default styleSheet;
