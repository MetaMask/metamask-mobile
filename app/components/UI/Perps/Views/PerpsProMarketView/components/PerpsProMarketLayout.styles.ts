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
    orderBookColumn: {
      width: PRO_ORDER_BOOK_COLUMN_WIDTH,
      alignSelf: 'flex-start',
      paddingLeft: 0,
      paddingBottom: PRO_TRADING_AREA_BOTTOM_INSET,
    },
  });

export { createStyles };
