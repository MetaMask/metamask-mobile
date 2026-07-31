import { StyleSheet } from 'react-native';

/** Matches `px-2` (8px) — same inset as `PerpsProPositionsPanel` rows. */
export const PRO_SCREEN_HORIZONTAL_INSET = 8;
export const PRO_TRADING_AREA_BOTTOM_INSET = 16;
export const PRO_ORDER_BOOK_COLUMN_WIDTH = 132;
export const PRO_ORDER_BOOK_SEPARATOR_INSET = 16;

const styles = StyleSheet.create({
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
  orderBookColumn: {
    width: PRO_ORDER_BOOK_COLUMN_WIDTH,
    alignSelf: 'flex-start',
    paddingLeft: PRO_ORDER_BOOK_SEPARATOR_INSET,
  },
});

export default styles;
