import { StyleSheet } from 'react-native';
import { Colors } from '../../../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    emptyMessage: {
      textAlign: 'center',
    },
    row: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.muted,
    },
  });

export default createStyles;
