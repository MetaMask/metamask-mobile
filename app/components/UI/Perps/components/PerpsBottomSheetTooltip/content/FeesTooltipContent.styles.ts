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
    discountBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: params.theme.colors.background.muted,
      paddingLeft: 12,
      paddingRight: 8,
      paddingVertical: 8,
      borderRadius: 4,
      marginBottom: 12,
      gap: 8,
    },
    feeValueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    strikethroughText: {
      textDecorationLine: 'line-through',
    },
  });

export default createStyles;
