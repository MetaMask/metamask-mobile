import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
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
    amountValueToken: {
      fontSize: 48,
      fontWeight: '600',
      color: colors.text.default,
      lineHeight: 54,
      letterSpacing: -0.5,
    },
    amountValueActive: {
      color: colors.primary.default,
    },
    cursor: {
      width: 2,
      height: 54,
      backgroundColor: colors.text.default,
      marginLeft: 4,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      // borderWidth: 1,
      // borderColor: 'blue',
    },
    maxAmount: {
      marginTop: 4,
    },
    warning: {
      marginTop: 12,
    },
  });

export default createStyles;
