/**
 * Test IDs for the design-system `BottomSheet` stub used by component-view
 * tests (`app/util/test/testSetupView.js`).
 *
 * Pressing `CLOSE` runs the stub's dismiss path: `onClose`, then `goBack`.
 * That is the same sequence as `onCloseBottomSheet`, which is what a backdrop
 * tap calls on the real sheet.
 */
export const DesignSystemBottomSheetMockSelectorsIDs = {
  CLOSE: 'design-system-bottom-sheet-close',
} as const;
