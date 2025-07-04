import { StyleSheet } from 'react-native';
import type { Theme } from '@metamask/design-tokens';

const styleSheet = (params: { theme: Theme }) => {
  const {
    theme: { colors },
  } = params;

  return StyleSheet.create({
    container: {
      flexShrink: 1,
      borderRadius: 8,
      backgroundColor: colors.background.alternative,
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 16,
      paddingBottom: 16,
      gap: 8,
      marginBottom: 16,
    },
    description: {
      flexWrap: 'wrap',
    },
    networkList: {
      marginBottom: 8,
    },
  });
};

export default styleSheet;
