import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const createStyles = (_colors: Theme['colors']) =>
  StyleSheet.create({
    feeRowContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      gap: 4,
    },
    vipBadgeContainer: {
      flexShrink: 0,
      alignSelf: 'center',
    },
  });

export { createStyles };
