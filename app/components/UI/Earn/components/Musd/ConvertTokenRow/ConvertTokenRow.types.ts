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
