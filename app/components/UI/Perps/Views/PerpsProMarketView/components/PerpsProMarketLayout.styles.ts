import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../../util/theme/models';

/** Matches `px-2` (8px) — same inset as `PerpsProPositionsPanel` rows. */
export const PRO_SCREEN_HORIZONTAL_INSET = 8;
export const PRO_TRADING_AREA_BOTTOM_INSET = 16;
export const PRO_ORDER_BOOK_COLUMN_WIDTH = 132;
export const PRO_ORDER_BOOK_SEPARATOR_INSET = 16;

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingBottom: PRO_TRADING_AREA_BOTTOM_INSET,
      paddingHorizontal: PRO_SCREEN_HORIZONTAL_INSET,
    },
    orderFormColumn: {
      flex: 1,
      alignSelf: 'flex-start',
    },
    columnDivider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: 'stretch',
      backgroundColor: colors.border.muted,
      marginHorizontal: 8,
    },
    orderBookColumn: {
      width: PRO_ORDER_BOOK_COLUMN_WIDTH,
      alignSelf: 'flex-start',
      paddingLeft: 0,
    },
  });

export { createStyles };
