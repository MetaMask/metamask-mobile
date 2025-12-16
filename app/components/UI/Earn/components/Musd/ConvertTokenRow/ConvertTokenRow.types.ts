import { AssetType } from '../../../../../Views/confirmations/types/token';
import { ConversionUIStatus } from '../../../selectors/musdConversionStatus';

/**
 * Props for the ConvertTokenRow component.
 */
export interface ConvertTokenRowProps {
  /**
   * The token to display.
   */
  token: AssetType;

  onMaxPress: (token: AssetType) => void;

  onEditPress: (token: AssetType) => void;

  /**
   * The conversion status for this token (derived from TransactionController).
   */
  status: ConversionUIStatus;
}

/**
 * Test IDs for the ConvertTokenRow component.
 */
// TODO: Consider centralizing these test IDs in a separate file later.
export const ConvertTokenRowTestIds = {
  CONTAINER: 'convert-token-row-container',
  TOKEN_ICON: 'convert-token-row-token-icon',
  TOKEN_NAME: 'convert-token-row-token-name',
  TOKEN_BALANCE: 'convert-token-row-token-balance',
  MAX_BUTTON: 'convert-token-row-max-button',
  EDIT_BUTTON: 'convert-token-row-edit-button',
  SPINNER: 'convert-token-row-spinner',
} as const;
