import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    gasFeeTokenButton: {
      backgroundColor: theme.colors.background.alternative,
      alignItems: 'center',
      display: 'flex',
      flexDirection: 'row',
      gap: 4,
      borderRadius: 16,
      paddingTop: 2,
      paddingBottom: 2,
      paddingLeft: 6,
      paddingRight: 6,
    },
  });
};

export default styleSheet;
