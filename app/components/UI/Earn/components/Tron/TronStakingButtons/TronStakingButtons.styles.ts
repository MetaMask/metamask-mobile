import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    balanceButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
      padding: 16,
      borderRadius: 12,
      backgroundColor: params.theme.colors.background.section,
      gap: 16,
    },
    balanceActionButton: {
      flex: 1,
    },
  });

export default styleSheet;
