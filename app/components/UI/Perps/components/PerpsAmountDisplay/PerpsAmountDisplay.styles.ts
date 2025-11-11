import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';
import { fontStyles } from '../../../../../styles/common';

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingTop: 48,
      paddingHorizontal: 24,
    },
    label: {
      marginBottom: 8,
    },
    amountValue: {
      fontSize: 54,
      ...fontStyles.medium,
      color: colors.text.default,
    },
    amountValueToken: {
      fontSize: 54,
      ...fontStyles.bold,
      letterSpacing: -0.5,
      lineHeight: 74,
    },
    amountValueTokenAndroid: {
      fontSize: 54,
      ...fontStyles.medium,
      letterSpacing: -0.5,
      lineHeight: 74,
    },
    amountValueActive: {
      color: colors.text.default,
    },
    amountValueError: {
      color: colors.error.default,
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
    },
    maxAmount: {
      marginTop: 4,
    },
    warning: {
      marginTop: 12,
    },
  });

export default createStyles;
