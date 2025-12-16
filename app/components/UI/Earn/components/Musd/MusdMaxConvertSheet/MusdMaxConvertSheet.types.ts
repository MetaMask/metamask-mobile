import { AssetType } from '../../../../../Views/confirmations/types/token';

export interface MusdMaxConvertSheetProps {
  /**
   * The token to convert.
   */
  token: AssetType;

  /**
   * Callback when the sheet is closed (cancelled or confirmed).
   */
  onClose: () => void;
}

/**
 * Test IDs for the MusdMaxConvertSheet component.
 */
// TODO: Consider centralizing these test IDs in a separate file later.
export const MusdMaxConvertSheetTestIds = {
  CONTAINER: 'musd-max-convert-sheet-container',
  LOADING: 'musd-max-convert-sheet-loading',
  CONFIRM_BUTTON: 'musd-max-convert-sheet-confirm-button',
  ASSET_HEADER: 'musd-max-convert-sheet-asset-header',
  AMOUNT_ROW: 'musd-max-convert-sheet-amount-row',
  FEE_ROW: 'musd-max-convert-sheet-fee-row',
  TOTAL_ROW: 'musd-max-convert-sheet-total-row',
  EARNING_ROW: 'musd-max-convert-sheet-earning-row',
  ERROR: 'musd-max-convert-sheet-error',
} as const;
