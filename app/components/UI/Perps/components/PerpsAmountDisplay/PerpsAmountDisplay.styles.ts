import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';

export const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      marginBottom: 24,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    amountText: {
      fontSize: 48,
      lineHeight: 60,
      fontWeight: '300',
    },
    cursor: {
      width: 2,
      height: 48,
      backgroundColor: colors.primary.default,
      marginHorizontal: 4,
    },
    fiatText: {
      marginTop: 8,
      opacity: 0.7,
    },
  });
