import { StyleSheet } from 'react-native';

/** Matches `px-2` (8px) — same inset as `PerpsProPositionsPanel` rows. */
export const PRO_SCREEN_HORIZONTAL_INSET = 8;
export const PRO_TRADING_AREA_BOTTOM_INSET = 16;
export const PRO_ORDER_BOOK_SEPARATOR_INSET = 16;
/**
 * The order-book column keeps the existing 148pt reservation, with an 8pt
 * leading inset matching the screen inset on its trailing side. This leaves
 * 140pt for the ladder and avoids the visibly larger gap on its left.
 */
export const PRO_ORDER_BOOK_CONTENT_WIDTH = 140;
export const PRO_ORDER_BOOK_COLUMN_WIDTH =
  PRO_ORDER_BOOK_CONTENT_WIDTH + PRO_SCREEN_HORIZONTAL_INSET;

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
    paddingLeft: PRO_SCREEN_HORIZONTAL_INSET,
  },
});

export default styles;
