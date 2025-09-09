import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const createStyles = (params: { theme: Theme }) =>
  StyleSheet.create({
    feeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    contentText: {
      marginBottom: 12,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: params.theme.colors.border.muted,
    },
  });

export default createStyles;
