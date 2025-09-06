import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingTop: 24,
      paddingHorizontal: 24,
    },
    label: {
      marginBottom: 8,
    },
    amountValue: {
      fontSize: 64,
      fontWeight: '600',
      color: colors.text.default,
      lineHeight: 72,
    },
    amountValueActive: {
      color: colors.primary.default,
    },
    cursor: {
      width: 2,
      height: 64,
      backgroundColor: colors.primary.default,
      marginLeft: 4,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    maxAmount: {
      marginTop: 4,
    },
    warning: {
      marginTop: 12,
    },
  });

export default createStyles;
