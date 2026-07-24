import {
  isSheetStackScreen,
  SCREEN_DEPTH,
  SHEET_STACK_SCREENS,
} from './transitions';

describe('SCREEN_DEPTH', () => {
  it('maps every screen to its navigation depth', () => {
    expect(SCREEN_DEPTH).toEqual({
      amount: 0,
      payWith: 1,
      quoteDetails: 1,
      selectQuote: 2,
      priceImpactConfirm: 1,
    });
  });
});

describe('SHEET_STACK_SCREENS', () => {
  it('includes pay with and quote details for in-sheet push/pop', () => {
    expect(SHEET_STACK_SCREENS.has('payWith')).toBe(true);
    expect(SHEET_STACK_SCREENS.has('quoteDetails')).toBe(true);
  });

  it('does not treat the amount root as a stacked screen', () => {
    expect(isSheetStackScreen('amount')).toBe(false);
  });

  it('treats nested quote and confirm screens as stacked details', () => {
    expect(isSheetStackScreen('selectQuote')).toBe(true);
    expect(isSheetStackScreen('priceImpactConfirm')).toBe(true);
  });
});
