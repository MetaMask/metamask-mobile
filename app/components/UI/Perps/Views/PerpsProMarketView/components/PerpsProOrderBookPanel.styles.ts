import { StyleSheet } from 'react-native';
import { PRO_ORDER_BOOK_SEPARATOR_INSET } from './PerpsProMarketLayout.styles';

export const PRO_ORDER_BOOK_COLLAPSE_GUTTER_OFFSET =
  PRO_ORDER_BOOK_SEPARATOR_INSET / 2;

const styleSheet = StyleSheet.create({
  headerCollapseControl: {
    marginLeft: -PRO_ORDER_BOOK_COLLAPSE_GUTTER_OFFSET,
  },
  depthBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
  },
  interactiveRow: {
    height: 32,
  },
  viewToggleButton: {
    height: 32,
    justifyContent: 'center',
  },
  viewToggleBar: {
    height: 2,
    borderRadius: 1,
  },
  ratioBar: {
    height: 4,
    borderRadius: 999,
  },
});

export default styleSheet;
