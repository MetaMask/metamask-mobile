import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';
import { colors } from '../../../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    wrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background.alternative,
      paddingVertical: 4,
      paddingHorizontal: 12,
      borderRadius: 32,
    },
    label: {
      marginLeft: 8,
    },
  });
};

export default styleSheet;
