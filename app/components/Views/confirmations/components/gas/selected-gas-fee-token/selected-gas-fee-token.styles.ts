import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    gasFeeTokenButton: {
      backgroundColor: theme.colors.background.muted,
      alignItems: 'center',
      display: 'flex',
      flexDirection: 'row',
      gap: 6,
      borderRadius: 8,
      paddingTop: 2,
      paddingBottom: 2,
      paddingLeft: 8,
      paddingRight: 8,
    },
  });
};

export default styleSheet;
