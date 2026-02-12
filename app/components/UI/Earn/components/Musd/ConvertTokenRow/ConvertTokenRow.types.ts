import { AssetType } from '../../../../../Views/confirmations/types/token';

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
   * Disables row actions (Max + Edit).
   * This is intended to be used as a global lock while any conversion is in-flight.
   */
  isActionsDisabled?: boolean;

  /**
   * True when this token+chain has an in-flight conversion.
   * When true, the row should show a loading spinner instead of actions.
   */
  isConversionPending?: boolean;

  /**
   * Optional inline error message to show below the row.
   */
  errorMessage?: string;
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
} as const;
