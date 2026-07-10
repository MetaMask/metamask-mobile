/** Keep in sync with TradeTabBarItem TRADE_BUTTON_SIZE (56). */
export const TRADE_MENU_BOTTOM_SHAPE_WIDTH_MULTIPLIER = 2;
export const TRADE_MENU_BOTTOM_SHAPE_BASE_BEZIER_LENGTH = 55;
export const TRADE_MENU_BOTTOM_SHAPE_PEAK_HEIGHT = 16;
export const TRADE_MENU_BOTTOM_SHAPE_PEAK_BEZIER_LENGTH = 25;

/** Bottom notch mask/stroke dimensions for TradeWalletActions. */
export const getTradeMenuBottomShapeDimensions = (buttonWidth: number) => ({
  width: buttonWidth * TRADE_MENU_BOTTOM_SHAPE_WIDTH_MULTIPLIER,
  baseBezierLength: TRADE_MENU_BOTTOM_SHAPE_BASE_BEZIER_LENGTH,
  peakHeight: TRADE_MENU_BOTTOM_SHAPE_PEAK_HEIGHT,
  peakBezierLength: TRADE_MENU_BOTTOM_SHAPE_PEAK_BEZIER_LENGTH,
});
