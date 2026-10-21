import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../../util/theme/models';

/** Matches `px-2` (8px) — same inset as `PerpsProPositionsPanel` rows. */
export const PRO_SCREEN_HORIZONTAL_INSET = 8;
export const PRO_TRADING_AREA_BOTTOM_INSET = 16;
export const PRO_ORDER_BOOK_COLUMN_WIDTH = 132;

const createStyles = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: PRO_SCREEN_HORIZONTAL_INSET,
    },
    orderFormColumn: {
      flex: 1,
      alignSelf: 'flex-start',
      paddingBottom: PRO_TRADING_AREA_BOTTOM_INSET,
    },
    columnDivider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: 'stretch',
      backgroundColor: theme.colors.border.muted,
      marginHorizontal: 16,
    },
    // Stretches to the order form (the in-flow sibling) instead of growing with
    // the ladder. The book itself is taken out of flow so a 20-level snapshot
    // scrolls inside this slot rather than lengthening the screen.
    orderBookColumn: {
      width: PRO_ORDER_BOOK_COLUMN_WIDTH,
      alignSelf: 'stretch',
      position: 'relative',
      paddingLeft: 0,
    },
    orderBookFill: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      paddingBottom: PRO_TRADING_AREA_BOTTOM_INSET,
    },
  });

export { createStyles };
