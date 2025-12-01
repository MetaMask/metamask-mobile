import { Theme } from '../../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    centered: {
      textAlign: 'center',
    },
    textRow: {
      flexDirection: 'row',
      gap: 4,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    normal: {
      fontWeight: 'normal',
    },
    paymentMethodDestination: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      columnGap: 4,
    },
  });
export default styleSheet;
