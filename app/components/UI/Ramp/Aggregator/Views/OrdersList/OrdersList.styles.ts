import { StyleSheet } from 'react-native';
import { Colors } from '../../../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    filters: {
      flexDirection: 'row',
      columnGap: 8,
      alignItems: 'center',
      marginVertical: 16,
      marginHorizontal: 24,
    },
    emptyMessage: {
      textAlign: 'center',
    },
    row: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.muted,
    },
  });

export default createStyles;
