import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const createStyles = (_colors: Theme['colors']) =>
  StyleSheet.create({
    feeRowContent: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      alignItems: 'center',
      flexShrink: 1,
      gap: 4,
    },
    // Narrow Pro summary columns cannot fit "Taker X% / Maker Y%" on one
    // line. Keep each rate intact and right-align the pair so a wrap lands
    // between them instead of splitting "Maker" from its percentage.
    percentageFeeContent: {
      alignSelf: 'flex-end',
      justifyContent: 'flex-end',
      maxWidth: '100%',
    },
    percentageRate: {
      flexShrink: 0,
    },
    vipBadgeContainer: {
      flexShrink: 0,
      alignSelf: 'center',
    },
  });

export { createStyles };
