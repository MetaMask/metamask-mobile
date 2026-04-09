import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    stakeButton: {
      flexDirection: 'row',
      backgroundColor: theme.colors.background.muted,
      paddingHorizontal: 6,
      borderRadius: 5,
      marginLeft: 8,
    },
  });
};

export default styleSheet;
