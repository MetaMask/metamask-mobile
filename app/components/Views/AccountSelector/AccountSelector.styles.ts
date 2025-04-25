import { StyleSheet } from 'react-native';

// Required for FlashList to render the list correctly
// See docs: https://shopify.github.io/flash-list/docs/estimated-item-size
export const ESTIMATED_CELL_ITEM_HEIGHT = 410;

export default StyleSheet.create({
  listContainer: {
    minHeight: ESTIMATED_CELL_ITEM_HEIGHT,
    height: '100%',
  },
  sheet: {
    marginVertical: 16,
    marginHorizontal: 16,
  },
});
