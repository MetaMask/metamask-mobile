import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const createStyles = (_params: { theme: Theme }) =>
  StyleSheet.create({
    feeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
  });

export default createStyles;
